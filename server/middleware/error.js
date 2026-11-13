exports.notFound = (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong';

  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0];
    message = field === 'regNumber' ? 'This vehicle already has an active parking record' : `That ${field || 'value'} already exists`;
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid id or value';
  }

  // Server errors: log the details on the server, send a generic message to the browser
  if (status >= 500) {
    console.error(err);
    message = 'Something went wrong on our side. Please try again.';
  }
  res.status(status).json({ message });
};
