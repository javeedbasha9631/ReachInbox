import app from './app';
import { config } from './config';
import prisma from './db/prisma';
import { startEmailWorker, stopEmailWorker } from './workers/emailWorker';

async function main() {
  try {
    await prisma.$connect();
    console.log('PostgreSQL connected');

    startEmailWorker();
    console.log('Email worker started');

    const server = app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });

    const shutdown = async () => {
      console.log('\nShutting down gracefully...');
      server.close();
      await stopEmailWorker();
      await prisma.$disconnect();
      console.log('Shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
