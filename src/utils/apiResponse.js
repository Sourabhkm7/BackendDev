// Define a class named apiResponse to represent the structure of an API response
class apiResponse {
    // The constructor takes three parameters: statusCode, data, and an optional message (default is "Success")
    constructor(statusCode, data, message = "Success") {
        // Set the status code of the response (e.g., 200 for success, 400 for client error)
        this.statusCode = statusCode;

        // Set the data being returned from the API, could be anything like JSON, object, array, etc.
        this.data = data;

        // Set the message for the response, defaulting to "Success" if no message is provided
        this.message = message;

        // Determine whether the response is a success based on the status code
        // If the status code is less than 400, it's considered a success
        this.success = statusCode < 400;
    }
}

// Export the apiResponse class so it can be used in other files
export { apiResponse };
