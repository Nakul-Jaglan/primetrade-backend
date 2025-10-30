/**
 * QUICK START - Minimal Integration Example
 * 
 * This is the simplest way to add the middleware to your Express app
 * Copy and adapt this to your index.js or main app file
 */

require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('../prisma/generated');

// Import middleware
const { verifyToken } = require('./middleware/auth.middleware');
const { hashPassword, verifyPassword } = require('./middleware/password.middleware');
const { generateToken } = require('./middleware/auth.middleware');

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

// ==================== AUTH ENDPOINTS ====================

/**
 * POST /auth/register
 * Register a new user
 */
app.post('/auth/register', hashPassword, async (req, res) => {
  try {
    const { username, email, passwordHash } = req.body;

    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] }
    });

    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const user = await prisma.user.create({
      data: { username, email, passwordHash }
    });

    // Generate token
    const token = generateToken(user.id, user.email);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /auth/login
 * Login user and return JWT
 */
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==================== PROTECTED ENDPOINTS ====================

/**
 * GET /api/profile
 * Get current user profile (protected route)
 */
app.get('/api/profile', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * GET /api/tasks
 * Get all tasks for authenticated user
 */
app.get('/api/tasks', verifyToken, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.userId }
    });

    res.json(tasks);
  } catch (error) {
    console.error('Tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * POST /api/tasks
 * Create a new task for authenticated user
 */
app.post('/api/tasks', verifyToken, async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        userId: req.user.userId
      }
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ JWT authentication enabled`);
  console.log(`✓ Password hashing enabled`);
});

/**
 * TESTING CHECKLIST
 * 
 * 1. Register a new user:
 *    POST http://localhost:4000/auth/register
 *    {
 *      "username": "testuser",
 *      "email": "test@example.com",
 *      "password": "testPassword123"
 *    }
 * 
 * 2. Copy the token from response
 * 
 * 3. Get user profile (using token):
 *    GET http://localhost:4000/api/profile
 *    Headers: Authorization: Bearer <your-token>
 * 
 * 4. Create a task:
 *    POST http://localhost:4000/api/tasks
 *    Headers: Authorization: Bearer <your-token>
 *    {
 *      "title": "My first task",
 *      "description": "This is a test task"
 *    }
 * 
 * 5. Get all tasks:
 *    GET http://localhost:4000/api/tasks
 *    Headers: Authorization: Bearer <your-token>
 * 
 * EXPECTED RESULTS:
 * ✓ Registration: 201 status with token
 * ✓ Profile: 200 status with user data
 * ✓ Create task: 201 status with task data
 * ✓ List tasks: 200 status with task array
 * ✓ No token: 401 Unauthorized error
 */
