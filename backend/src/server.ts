import http from 'http';
// Trigger reload: env changed to systemfooddonation@gmail.com
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
  server.listen(PORT, async () => {
    console.log(`\n======================================================`);
    console.log(`🚀 FoodBridge AI Enterprise Server Started!`);
    console.log(`💻 Environment: \t${env.NODE_ENV.toUpperCase()}`);
    console.log(`🔌 Port Number: \t${PORT}`);
    console.log(`📡 WebSocket:  \tActive (CORS enabled for ${env.FRONTEND_URL})`);
    console.log(`======================================================\n`);

    // Verify SMTP connection on startup
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      try {
        const nodemailer = await import('nodemailer');
        const testTransporter = nodemailer.default.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: false,
          requireTLS: true,
          auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
          tls: { rejectUnauthorized: true },
        } as any);
        await testTransporter.verify();
        console.log(`✅ [SMTP] Brevo connection verified — FROM: ${env.FROM_EMAIL}`);
      } catch (err: any) {
        console.error(`❌ [SMTP] Connection FAILED: ${err.message}`);
        console.error(`   Host: ${env.SMTP_HOST}:${env.SMTP_PORT} | User: ${env.SMTP_USER}`);
        console.error(`   Fix: Verify sender email in Brevo dashboard (app.brevo.com → Senders & IPs)`);
      }
    } else {
      console.warn(`⚠️  [SMTP] Credentials not configured — emails will be logged to console only`);
    }
  });

  // Handle server crash events gracefully
  process.on('unhandledRejection', (err: any, promise) => {
    console.error(`[Fatal Server Error] Unhandled Rejection:`, err);
    // Close server and exit
    server.close(() => process.exit(1));
  });
};

startServer();
