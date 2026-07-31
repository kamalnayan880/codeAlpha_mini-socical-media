const express = require('express');
const cors = require('cors');
const path = require('path');
const dbModule = require('./db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Make db accessible to routes via middleware
app.use((req, res, next) => {
  req.db = dbModule.getDb;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// Wait for database to be ready before starting
dbModule.ready.then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Mini Social Media server running at http://localhost:${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} in your browser`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
