import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// Define the schema for the 'User' model
const userSchema = new Schema(
    {
        // Username field: must be unique, lowercased, trimmed, and indexed for faster searches
        username: {
            type: String,
            required: true,   // Mandatory field
            unique: true,     // No two users can have the same username
            lowercase: true,  // Automatically convert the value to lowercase
            trim: true,       // Removes any leading/trailing whitespace
            index: true,      // Adds an index to improve search performance
        },
        
        // Email field: also unique, lowercased, and trimmed
        email: {
            type: String,
            required: true,    // Mandatory field
            unique: true,      // Email should be unique for each user
            lowercase: true,   // Automatically lowercases the email
            trim: true         // Removes extra spaces
        },
        
        // Fullname field: required, trimmed, and indexed
        fullname: {
            type: String,
            required: true,    // Mandatory field
            trim: true,        // Removes extra spaces
            index: true        // Index added for faster search
        },
        
        // Avatar field: Required field to store the URL of the user's avatar (e.g., Cloudinary URL)
        avatar: {
            type: String,
            required: true,    // Mandatory field
        },
        
        // Optional cover image field to store a URL (e.g., Cloudinary URL)
        coverImage: {
            type: String       // Optional field
        },

        // Watch history field that refers to another model ('Video') through its ObjectId
        watchHistory: {
            type: Schema.Types.ObjectId,  // Reference to another collection/model
            ref: "Video"                  // Referencing the 'Video' model
        },

        // Password field: required and must be hashed before storing
        password: {
            type: String,
            required: [true, 'Password is required'] // Custom error message for missing password
        },

        // Optional refresh token for session management
        refreshToken: {
            type: String
        }
    },
    {
        timestamps: true  // Adds 'createdAt' and 'updatedAt' fields automatically
    }
);

// Middleware to hash the password before saving the user document
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next(); // Only hash if the password has been modified
    
    this.password = bcrypt.hash(this.password, 10);  // Hash password with a salt factor of 10
    next();  // Proceed to save the document
});

// Method to check if a provided password matches the hashed password in the database
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);  // Compare the plain password with the hashed one
};

// Method to generate an access token (JWT) using user details
userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,       // Include user ID in the token payload
            email: this.email,   // Include user's email
            username: this.username, // Include user's username
            fullname: this.fullname // Include user's full name
        },
        process.env.ACCESS_TOKEN_SECRET,  // Secret key for signing the token
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY  // Token expiry from environment variables
        }
    );
};

// Method to generate a refresh token (JWT) for refreshing sessions
userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id,       // Include user ID in the token payload
        },
        process.env.REFRESH_TOKEN_SECRET,  // Secret key for refresh token
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY  // Token expiry for refresh token
        }
    );
};

// Extra refresh token method defined twice (likely a typo)
// userSchema.methods.generateRefreshToken = function() {};

// Export the 'User' model based on the defined schema
export const User = mongoose.model("User", userSchema);
