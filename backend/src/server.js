const express = require('express');
const http = require('http');
const cors = require('cors');
const { initSocketServer } = require('./socket');
const { port, allowedOrigins } = require('./config');

const app = express();
const httpServer = http.createServer(app);

// CORS with origin validation
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());

// Routes
app.use('/api/health', require('./routes/health'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/volunteers', require('./routes/volunteers'));
app.use('/api/shelters', require('./routes/shelters'));
app.use('/api/routes', require('./routes/routes'));
app.use('/api/peers', require('./routes/peers'));
app.use('/api/sync', require('./routes/sync'));

// Initialize Socket.IO
initSocketServer(httpServer);

// Error handler (must be last)
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
