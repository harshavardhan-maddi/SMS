import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import { initSchema } from './db/schema';
import { seedData } from './db/seed';
import { setupWebSocket } from './ws/broker';

// Routes
import authRoutes from './routes/authRoutes';
import deptRoutes from './routes/deptRoutes';
import userRoutes from './routes/userRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import repairRoutes from './routes/repairRoutes';
import notificationRoutes from './routes/notificationRoutes';
import reportRoutes from './routes/reportRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Cache-Control', 'Remember-Me'],
  exposedHeaders: ['Authorization'],
  credentials: true
}));

// Body parser
app.use(express.json());

let isInitialized = false;
let initPromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (isInitialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      await initSchema();
      await seedData();
      isInitialized = true;
    })();
  }
  await initPromise;
}

app.use(async (req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  try {
    await ensureInitialized();
    next();
  } catch (err) {
    console.error('Initialization middleware error:', err);
    next(err);
  }
});

// Routes mapping (Multi-mounted for local & Vercel serverless routing)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/login', authRoutes);

app.use('/api/departments', deptRoutes);
app.use('/departments', deptRoutes);

app.use('/api/users', userRoutes);
app.use('/users', userRoutes);

app.use('/api/inventory', inventoryRoutes);
app.use('/inventory', inventoryRoutes);

app.use('/api/repairs', repairRoutes);
app.use('/repairs', repairRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/notifications', notificationRoutes);

app.use('/api/reports', reportRoutes);
app.use('/reports', reportRoutes);

app.get('/api/health', (req, res) => res.send('OK'));
app.get('/health', (req, res) => res.send('OK'));

// Error fallback handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).send('Internal Server Error: ' + err.message);
});

// Setup server and WebSocket broker
const server = http.createServer(app);
setupWebSocket(server);

async function startServer() {
  try {
    await ensureInitialized();
    server.listen(port, () => {
      console.log(`=============================================================`);
      console.log(`College Systems Management System (SMS) Backend Running`);
      console.log(`Server Address : http://localhost:${port}`);
      console.log(`WebSockets Link: http://localhost:${port}/ws`);
      console.log(`=============================================================`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err);
  }
}

startServer();

export default app;
