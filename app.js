const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const connectDB = require('./src/config/dbConfig');
require('dotenv').config();

// Import routes
const apiRoutes = require('./src/routes/api');

const app = express();

// Connect to MongoDB
connectDB();

// Trust proxy - CRITICAL for cookies in production
// app.set('trust proxy', 1);

// CORS setup
// app.use(cors({
//   origin: process.env.NODE_ENV === 'production' ? true : 'http://localhost:3000',
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
// }));

app.use(cors())

// Configure rate limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  skip: (req) => req.session && req.session.admin === true
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware - CORRECT PRODUCTION SETTINGS
app.use(
  cookieSession({
    name: 'interview-pro-session',
    keys: [process.env.SESSION_SECRET || 'interviewAppSecret'],
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite:'lax'
  })
);

// Debug middleware - REMOVE IN PRODUCTION
app.use((req, res, next) => {
  console.log('Session data:', req.session);
  console.log('Cookie header:', req.headers.cookie);
  next();
});

// Apply rate limiting to API routes
// app.use('/api/', apiLimiter);

// API Routes
app.use('/api', apiRoutes);

// Serve static assets if in production

  // Set static folder
 const mockS3Path = path.join(__dirname, "../server/MockS3");
 app.use("/SeerAI", express.static(mockS3Path));

  // Any route that doesn't match API routes should serve React app
  // app.get('*', (req, res) => {
  //   res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  // });

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  
  // Handle rate limit errors
  if (err.statusCode === 429) {
    return res.status(429).json({
      success: false,
      message: 'You have exceeded the request limit. Please try again later.'
    });
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  // Handle file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size exceeds the maximum limit (10MB)'
    });
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    message: 'Something went wrong on our end. Please try again later.'
  });
});

module.exports = app;