// Error handling middleware
function errorHandler(err, req, res, next) {
    console.error('Error:', err.message, err.stack, {
        requestData: req.body,
        responseData: err.response?.data,
    });

    res.status(err.statusCode || 500).json({
        error: 'An error occurred',
        details: err.message,
    });
}

module.exports = { errorHandler };