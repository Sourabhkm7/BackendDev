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

const changeCurrentPassword = asyncHandler(async (req, res)=>{
     const {oldPassword, newPassword} = req.body

     const user = await User.findById(req.user?._id)
     const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

     if (!isPasswordCorrect){
          throw new apiError(401, "Incorrect old Password")
     }
     user.password = newPassword
     await user.save({validateBeforeSave: false})

     return res
     .status(200)
     .json(new apiResponse(200, {}, "Password Changed Successfully"))

})

const getCurrentUser = asyncHandler (async(req,res)=>{
     return res
     .status(200)
     .json(new apiResponse (200, req.user, "Current User fetched Successfully") )
})

const updateAccountDetails = asyncHandler (async (req, res)=>{
     const {fullname,email} = req.body

     if (!(fullname || email)){
          throw new apiError (400, "All fields are required")
     }
     const user = User.findByIdAndUpdate(
          req.user?._idid,
          {
               $set:{
                    fullname,
                    email
               }
          },
          {new: true}
     ).select("-password")
     return res
     .status(200)
     .json(new apiResponse (200, user, "Account Details have been updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req, res)=>{
     const avatarLocalPath = req.file?.path
     if (!avatarLocalPath){
          throw new apiError(400, "Avatar file is missing")
     }

     const avatar = await uploadOnCloudinary(avatarLocalPath) 
     if (!avatar.url){
          throw new apiError(400, "Error while uploading on avatar")
     }

     const user = await User.findByIdAndUpdate(
          req.user?._id,
          {
               $set: {
                    avatar:avatar.url
               }
          },
          {new: true}
     ).select("-password")
     return res
     .status(200) 
     .json(new apiResponse(200, user, "Avatar Updated Successfully"))

})

const updateUserCoverImage = asyncHandler(async(req, res)=>{
     const coverImageLocalPath = req.file?.path
     if (!coverImageLocalPath){
          throw new apiError(400, "cover image file is missing")
     }

     const coverImage = await uploadOnCloudinary(coverImageLocalPath) 
     if (!coverImage.url){
          throw new apiError(400, "Error while uploading on cover image")
     }

     const user = await User.findByIdAndUpdate(
          req.user?._id,
          {
               $set: {
                    coverImage:coverImage.url
               }
          },
          {new: true}
     ).select("-password")
     return res
     .status(200) 
     .json(new apiResponse(200, user, "Cover Image Updated Successfully"))

})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
     const {username} = req.params

     if (!username?.trim()){
          throw new apiError (400, "Username is missing")
     }
     const channel = await User.aggregate([
          {
               $match: {
                    username: username?.toLowerCase()
               }
          },
          {
               $lookup:{
                    from: "subscriptions",
                    localField: _id,
                    foreignField: "channel",
                    as: "subscribers"
               }
          },
          {
               $lookup:{
                    from: "subscriptions",
                    localField: _id,
                    foreignField: "subscriber",
                    as: "subscribeTo"
               }
          },
          {
               $addFields:{
                    subscribersCount:{
                         $size: "$subscribers"
                    },
                    channelsSubscribedToCount:{
                         $size: "$subscribeTo"
                    },
                    isSubscribed:{
                         $cond:{
                              if:{
                                   $in: [req.user?._id,  "$subscribers.subscriber"]
                              },
                              then: true,
                              else: false
                         }
                    }
               }
          },
          {
               $project:{
                    fullname: 1,
                    username:1,
                    subscribersCount:1,
                    channelsSubscribedToCount: 1,
                    isSubscribed: 1,
                    avatar: 1,
                    coverImage:1,
                    email: 1
               }
          }

     ])
     if (!channel?.length){
          throw new apiError(400, "Channel does not exists")
     }
     return res
     .status(200)
     .json(new apiResponse(200, channel[0], "User Channel fetched successfully"))
})

 
const getWatchHistory = asyncHandler(async (req,res) =>{
     const user = await User.aggregate([
          {
               $match:{
                    _id: new mongoose.Types.ObjectId(req.user._id)
               }
          },
          {
               $lookup:{
                   from: "videos",
                   localField: 'watchHistory',
                   foreignField: "_id",
                   as: "watchHistory",
                   pipeline:[ 
                    {
                         $lookup: {
                              from: "user",
                              localField: "owner",
                              foreignField: "_id",
                              as: "owner",
                              pipeline:[{
                                   $project: {
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                   }
                         }]
                         }
                    },
                    {
                         $addFields:{
                              owner:{
                                   $first: "$owner"
                              }
                         }
                    }
                   ]
               }
          }
     ])

     return res
          .status(200)
          .json(new apiResponse(200, user[0].watchHistory, "Watch history fetched successfully"))
})



export  {
     registerUser, 
     loginUser, 
     logoutUser,
     refreshAccessToken,
     changeCurrentPassword,
     getCurrentUser,
     updateAccountDetails,
     updateUserAvatar,
     updateUserCoverImage,
     getUserChannelProfile,
     getWatchHistory

}
