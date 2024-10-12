import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"; // Import pagination plugin

// Define the schema for the 'Video' model
const videoSchema = new Schema(
    {
        // Video file URL (e.g., hosted on Cloudinary)
        videoFile: {
            type: String,         // URL to the video file
            required: true        // Mandatory field
        },
        
        // Thumbnail URL (e.g., hosted on Cloudinary)
        thumbnail: {
            type: String,         // URL to the thumbnail image
            required: true        // Mandatory field
        },
        
        // Video title
        title: {
            type: String,         // Title of the video
            required: true        // Mandatory field
        },
        
        // Video description
        description: {
            type: String,         // Brief description of the video content
            required: true        // Mandatory field
        },
        
        // Duration of the video in seconds or minutes
        duration: {
            type: Number,         // Length of the video
            required: true        // Mandatory field
        },
        
        // Number of views on the video
        views: {
            type: Number,         // Count of views
            default: 0            // Defaults to 0 if not specified
        },
        
        // Publish status of the video (true if published, false if it's a draft)
        isPublished: {
            type: Boolean,        // Boolean indicating if the video is published
            default: true         // Defaults to 'true' (published) unless explicitly set to false
        },
        
        // Reference to the user who uploaded the video (owner)
        owner: {
            type: Schema.Types.ObjectId,  // Reference to the 'User' model
            ref: "User"                   // 'User' model linked with the ObjectId
        }
    },
    {
        timestamps: true  // Automatically adds 'createdAt' and 'updatedAt' fields
    }
);

// Attach the pagination plugin to the video schema
videoSchema.plugin(mongooseAggregatePaginate); // Allows easy pagination with aggregate queries

// Export the 'Video' model based on the defined schema
export const Video = mongoose.model("Video", videoSchema);
