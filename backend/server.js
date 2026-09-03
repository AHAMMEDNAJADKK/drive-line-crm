require('dotenv').config();

const app = require('./src/app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  const environment = process.env.NODE_ENV || 'development';

  console.log('\n========================================');
  console.log('       Drive Line CRM API Server');
  console.log('========================================');
  console.log(`Environment: ${environment}`);
  console.log(`Port: ${PORT}`);

  if (environment === 'production') {
    console.log('Server started successfully');
  } else {
    console.log(`API: http://localhost:${PORT}`);
  }

  console.log('========================================\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[Startup Error] Port ${PORT} is already in use. ` +
      'Stop the other process or set a different PORT in backend/.env'
    );
    process.exit(1);
  }

  console.error('[Server Error]', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Promise Rejection]', err);

  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
  process.exit(1);
});