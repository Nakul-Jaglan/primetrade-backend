require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('../prisma/generated');
const { verifyToken, generateToken } = require('./middleware/auth.middleware');
const { hashPassword, verifyPassword } = require('./middleware/password.middleware');

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

// Normalize FRONTEND_URL (remove trailing slashes) and allow matching origin
const _rawFrontend = process.env.FRONTEND_URL;
const FRONTEND_URL_NORMALIZED = _rawFrontend ? _rawFrontend.replace(/\/+$/, '') : undefined;

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests (e.g., curl, server-to-server) where origin is undefined
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/+$/, '');

    // Allow exact match with configured frontend URL
    if (FRONTEND_URL_NORMALIZED && normalizedOrigin === FRONTEND_URL_NORMALIZED) {
      return callback(null, true);
    }

    // Also allow localhost during local development
    if (/^http:\/\/localhost(:\d+)?$/.test(normalizedOrigin)) {
      return callback(null, true);
    }

    // Reject other origins
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

app.use(cors(corsOptions));

app.get('/', (req, res) => {
  res.json({ message: 'PrimeTrade Backend is running' });
});

app.post('/auth/register', hashPassword, async (req, res) => {
  try {
    const { username, email, passwordHash } = req.body;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash
      }
    });

    const token = generateToken(user.id, user.email);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id, user.email);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

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

app.get('/api/tasks', verifyToken, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tasks);
  } catch (error) {
    console.error('Tasks fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/tasks', verifyToken, async (req, res) => {
  try {
    const { title, description, priority = 'MEDIUM', status = 'PENDING', dueDate } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority. Must be: LOW, MEDIUM, HIGH, URGENT' });
    }

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: PENDING, IN_PROGRESS, COMPLETED, ARCHIVED' });
    }

    const taskData = {
      title,
      description,
      priority,
      status,
      userId: req.user.userId
    };

    if (dueDate) {
      taskData.dueDate = new Date(dueDate);
    }

    const newTask = await prisma.task.create({
      data: taskData
    });

    res.status(201).json(newTask);
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, dueDate } = req.body;

    const task = await prisma.task.findUnique({
      where: { id: parseInt(id) }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to update this task' });
    }

    if (priority) {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ error: 'Invalid priority. Must be: LOW, MEDIUM, HIGH, URGENT' });
      }
    }

    if (status) {
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be: PENDING, IN_PROGRESS, COMPLETED, ARCHIVED' });
      }
    }

    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    const updatedTask = await prisma.task.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Task update error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.get('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: parseInt(id) }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to view this task' });
    }

    res.json(task);
  } catch (error) {
    console.error('Task fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});


app.delete('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: parseInt(id) }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this task' });
    }

    await prisma.task.delete({
      where: { id: parseInt(id) }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Task deletion error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});