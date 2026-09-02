require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`\nDrive Line CRM API running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Startup Error] Port ${PORT} is already in use. Stop the other process or set a different PORT in backend/.env`);
    process.exit(1);
  }
  console.error('[Server Error]', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Promise Rejection]', err.message);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err.message);
  process.exit(1);
});
