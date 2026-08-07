export function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route ${req.method} ${req.path}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Invalid input.', details: err.issues });
  }
  if (err.name === 'MulterError' || err.status === 400) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'Something went wrong on our end.' : err.message });
}

export function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
