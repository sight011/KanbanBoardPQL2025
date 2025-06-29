const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const taskRoutes = require('./routes/taskRoutes');
const chatRoutes = require('./routes/chatRoutes');
const sprintRoutes = require('./routes/sprintRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const auditRoutes = require('./routes/auditRoutes');
const projectRoutes = require('./routes/projectRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const healthRoutes = require("./routes/healthRoutes");
const commentRoutes = require('./routes/commentRoutes');
const { tenantContextMiddleware } = require('./middleware/tenantContext');
const pool = require('./db');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-Slug'],
    exposedHeaders: ['Set-Cookie']
}));

app.use(express.json());

// Session middleware with PostgreSQL store
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'sessions'
  }),
  secret: process.env.SESSION_SECRET || 'dev_secret_key',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: 'lax',
    path: '/',
    domain: undefined // Let the browser set the domain
  },
  name: 'kanban_session'
}));

// Tenant context middleware (for multi-tenant support)
app.use(tenantContextMiddleware);

// Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/chat', chatRoutes);
app.use("/health", healthRoutes);
app.use('/api/sprints', sprintRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/auth', passwordResetRoutes);
app.use('/api', authRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/departments', departmentRoutes);

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ 
        message: 'Welcome to the Task Management API',
        tenantContext: req.tenantContext || { isMultiTenant: false }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('--- UNHANDLED ERROR ---');
    console.error(err.stack);
    res.status(500).json({ 
        error: 'An unexpected error occurred.',
        message: err.message,
        stack: err.stack // Always return stack trace
    });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Multi-tenant support: ${process.env.ENABLE_MULTI_TENANT === 'true' || process.env.ENABLE_MULTI_TENANT === true ? 'ENABLED' : 'DISABLED'}`);
}); 