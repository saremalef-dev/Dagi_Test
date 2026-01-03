import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { initializeSocketHandlers } from './socket';

const app = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3002'],
    methods: ['GET', 'POST'],
  }
});

// Middleware
app.use(cors({
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get all available games
app.get('/api/games/available', async (req, res) => {
  try {
    const games = await prisma.game.findMany({
      where: {
        status: 'WAITING'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Initialize Socket.io handlers
initializeSocketHandlers(io, prisma);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  httpServer.close();
});
