import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { logger } from './logger';

let io: Server | null = null;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    logger.info(`🔌 Socket connected: ${socket.id}`);

    // Join a specific shop's update room
    socket.on('join_shop', (shopId: string) => {
      if (!shopId) return;
      socket.join(`shop:${shopId}`);
      logger.info(`🔌 Socket ${socket.id} joined room: shop:${shopId}`);
    });

    // Leave a specific shop's update room
    socket.on('leave_shop', (shopId: string) => {
      if (!shopId) return;
      socket.leave(`shop:${shopId}`);
      logger.info(`🔌 Socket ${socket.id} left room: shop:${shopId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getSocketIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io has not been initialized!');
  }
  return io;
};

export const emitToShop = (shopId: string, event: string, data: any) => {
  if (io && shopId) {
    io.to(`shop:${shopId}`).emit(event, data);
    logger.info(`📡 Broadcasted event "${event}" to shop:${shopId}`);
  }
};
