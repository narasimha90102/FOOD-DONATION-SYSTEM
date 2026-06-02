import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { connectDB } from './config/db';
import { SocketService } from './services/socket.service';

const PORT = env.PORT || 5000;

const startServer = async () => {
  // 1. Core Database Attachment
  await connectDB();

  // 2. Build HTTP wrapper server
  const server = http.createServer(app);

  // 3. Initialize WebSocket protocols
  SocketService.initialize(server);

  // 4. Stand server
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 FoodBridge AI Enterprise Server Started!`);
    console.log(`💻 Environment: \t${env.NODE_ENV.toUpperCase()}`);
    console.log(`🔌 Port Number: \t${PORT}`);
    console.log(`📡 WebSocket:  \tActive (CORS enabled for ${env.FRONTEND_URL})`);
    console.log(`======================================================\n`);
  });

  // Handle server crash events gracefully
  process.on('unhandledRejection', (err: any, promise) => {
    console.error(`[Fatal Server Error] Unhandled Rejection:`, err);
    // Close server and exit
    server.close(() => process.exit(1));
  });
};

startServer();
