import {asyncHandler} from "../utils/asyncHandler.js"
import {apiError} from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"
import {apiResponse} from "../utils/apiResponse.js"

const generateAccessAndRefreshTokens = async (userId)=>{
     try{
          const user = await User.findById(userId)
          const accessToken = user.generateAccessToken()
          const refreshToken = user.generateRefreshToken()

          user.refreshToken = refreshToken
          await user.save({ validateBeforeSave: false })

          return {accessToken,refreshToken}

     }catch (error){
          throw new apiError(500, "Something went wrong while generating the refresh and access token")
     }
}


const registerUser = asyncHandler( async (req, res) =>{
     // get user details from frontend
     // vaidation -not empty
     // check if user already exists: username, email
     // check for images, check for avatar
     // upload them to cloudnary, avatar
     // create user object - create entry in db
     // remove password and refresh token field from response 
     // check for user creation
     // return for user cration

     const {fullname, email, username, password} = req.body

     if (
          [fullname, email, username, password].some((field) => field?.trim() === "")
     ){
               throw new apiError(400, "All Fields are Required")
          }
     const existedUser = await User.findOne({
          $or: [{ username },{ email }]
     })

     if(existedUser){
          throw new apiError(409, "User with Email or Username already exists")
     }
     
     // console.log(req.files);
     
     const avatarLocalPath = req.files?.avatar[0]?.path;
     // const coverImageLocalPath = req.files?.coverImage[0]?.path;
     let coverImageLocalPath;
     if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
     }

     
     if (!avatarLocalPath){
          throw new apiError(400, "Avatar file is required")
     }

     const avatar = await uploadOnCloudinary(avatarLocalPath)
     const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  

     if (!avatar) {
          throw new apiError(400, "Avatar file is Required")
     }

     const user = await User.create({
          fullname,
          avatar: avatar.url,
          coverImage: coverImage?.url || "",
          email,
          password,
          username: username.toLowerCase()
     })

     
     const createdUser = await User.findById(user._id).select(
          "-password -refreshToken"
     )
     
     if(!createdUser){
          throw new apiError(500, "Something went wrong while registering the user")
     }

     return res.status(201).json(
          new apiResponse(200, createdUser, "User Registered Successfully")
     )


})


const loginUser = asyncHandler(async (req,res)=>{
     // Get user details 
     // validate username or email  
     // User already exists
     // password check
     // acess and refresh token
     // send cookie
     // if not exists route to register user

     const {email, username, password} = req.body
     if(!username && !email){
          throw new apiError(400, "username or email is required")
     }
     
     const user = await User.findOne({
          $or: [{username}, {email}]
     })
     if (!user){
          throw new apiError(404, "User doesn't exists")
     }
     const isPasswordValid = await user.isPasswordCorrect(password)

     if (!isPasswordValid){
          throw new apiError(401, "Invalid user credentials")
     }
     const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

     const loggedInUser = await User.findById(user._id)
     .select ("-password -refreshToken")

     const options = {
          httpOnly: true,
          secure: true
     }

     return res
     .status(200)
     .cookie("accessToken", accessToken, options)
     .cookie("refreshToken", refreshToken, options)
     .json(
          new apiResponse(
               200,
               {
                    user: loggedInUser, accessToken, refreshToken
               },
               "User Logged in Successfully"
          )
     )

})

const logoutUser = asyncHandler(async(req,res)=>{
     await User.findByIdAndUpdate(
          req.user._id,
          {
               $set:{
                    refreshToken: undefined
               }
          },
          {
              new: true      
          }
     )
     const options = {
          httpOnly: true,
          secure: true
     }
     return res
     .status(200)
     .clearCookie("accessToken", options)
     .clearCookie("refreshToken", options)
     .json(new apiResponse(200, {}, "User Logged Out"))
})

const refreshAccessToken = asyncHandler(async (req,res)=>{
     const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
     if(!incomingRefreshToken){
          throw new apiError(401, "Unauthorized Request")
     }
      try {
          const decodedToken = jwt.verify(
              incomingRefreshToken,
              process.env.REFRESH_TOKEN_SECRET
         )
    
         const user = await User.findById(decodedToken?._id)
         if(user){
              throw new apiError(401, "Invalid Refresh Token")
         }
    
         if (incomingRefreshToken !== user?.refreshToken){
              throw new apiError(401, "Refresh Token is expired or used")
         }
    
         const options = {
              httpOnly: true,
              secure: true
         }
    
         const {accessToken, newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
         return res
         .status(200)
         .cookie("accessToken",accessToken, options)
         .cookie("refreshToken",newrefreshToken, options)
         .json(
              new apiResponse(
                   200,
                   {accessToken, refreshToken: newrefreshToken},
                   "Access Token refreshed"
              )
         )
      } catch (error) {
         throw new apiError(401, error?.message || "Invalid Refresh Token") 
      }
})

export  {registerUser, loginUser, logoutUser,refreshAccessToken

}
