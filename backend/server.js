require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const taskController = require('./src/controllers/taskController');
const userRoutes = require('./src/routes/userRoutes');
const authRoutes = require('./src/routes/authRoutes');

const app = express();
const port = process.env.SERVER_PORT || 4000;

// Debug environment variables
console.log('🔧 Environment check:');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***hidden***' : 'NOT SET');

// Middleware
app.use(cors()); // Enable CORS for frontend requests
app.use(express.json()); // Parse JSON bodies

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS in production
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
  // For production, use a persistent session store (e.g., connect-pg-simple)
}));

// Test route
app.get('/', (req, res, next) => {
  console.log('hello pern!');
  res.status(200).send('hello pern');
});

// User routes
app.use('/api/users', userRoutes);
// Auth routes
app.use('/api', authRoutes);

// Task routes
app.get('/api/tasks', taskController.getAllTasks);
app.get('/api/tasks/:id', taskController.getTaskById);
app.post('/api/tasks', taskController.createTask);
app.put('/api/tasks/:id', taskController.updateTask);
app.delete('/api/tasks/:id', taskController.deleteTask);
app.patch('/api/tasks/:id/position', taskController.updateTaskPosition);
app.get('/api/tasks/status/:status', taskController.getTasksByStatus);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📍 API available at http://localhost:${port}/api/tasks`);
});