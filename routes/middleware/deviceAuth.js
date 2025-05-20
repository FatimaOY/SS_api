function deviceAuth(req, res, next) {
  const auth = req.headers['authorization'];
  if (auth && auth === `Bearer ${process.env.DEVICE_API_KEY}`) {
    req.device = true;
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized device' });
}

module.exports = deviceAuth;
