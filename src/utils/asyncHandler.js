// Define an 'asyncHandler' higher-order function to handle asynchronous operations
const asyncHandler = (requestHandler) => {
    // Return a new function that takes 'req', 'res', and 'next' as arguments (Express.js middleware signature)
    return (req, res, next) => {
        // Wrap the request handler in a promise
        // If it resolves, continue as usual
        // If it throws an error, pass the error to the 'next' function to be handled by the error-handling middleware
        Promise.resolve(
            requestHandler(req, res, next)  // Execute the request handler
            .catch((err) => next(err))      // Catch any errors and forward them to 'next' for handling
        )
    }
}

// Export 'asyncHandler' for use in other parts of the application
export { asyncHandler }


/*
const asyncHandler = (fn) => async (req,res, next) => {
    try{
        await fn(req,res,next)

    } catch(error){
        res.status(err.code || 500).json({
            success: false,
            message: err.message
        })
    }
}

*/