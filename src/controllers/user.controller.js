import {asyncHandler} from "../utils/asyncHandler.js"
import {apiError} from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"

import {apiResponse} from "../utils/apiResponse.js"


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

     const {fullName, email, username, password} = req.body

     if (
          [fullName, email, username, password].some((field) =>
               field?.trim() === "")
     ){
               throw new apiError(400, "All Fields are Required")
          }
     const existedUser = User.findOne({
          $or: [{ username },{ email }]
     })

     if(existedUser){
          throw new apiError(409, "User with Email or Username already exists")
     }
     const avatarLocalPath = req.files?.avatar[0]?.path;
     const coverImagePath = req.files?.coverImage[0]?.path;

     if (!avatarLocalPath){
          throw new apiError(400, "Avatar file is required")
     }

     const avatar = await uploadOnCloudinary(avatarLocalPath)
     const coverImage = await uploadOnCloudinary(coverImagePath)

     if(!avatar){
          throw new apiError(400, "All Fields are Required")
     }

     const user = await User.create({
          fullName,
          avatar: avatar.url,
          coverImage: coverImage?. url || "",
          email,
          password,
          Username: username.toLowercase()
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



export  {registerUser,

}
