module.exports = {
  port: process.env.PORT || 4000,
  allowedOrigins: [
    process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
  ]
};
