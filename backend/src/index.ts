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

// Routes mapping
app.use('/api/auth', authRoutes);
app.use('/api/departments', deptRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

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
    // 1. Initialize schema
    await initSchema();
    
    // 2. Seed data (skipped if database already contains tables/rows)
    await seedData();
    
    // 3. Start server listen
    server.listen(port, () => {
      console.log(`=============================================================`);
      console.log(`College Systems Management System (SMS) Backend Running`);
      console.log(`Server Address : http://localhost:${port}`);
      console.log(`WebSockets Link: http://localhost:${port}/ws`);
      console.log(`=============================================================`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
}

startServer();

export default app;
