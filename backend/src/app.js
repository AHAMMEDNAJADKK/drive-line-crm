require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const helmet = require('helmet');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const leadRoutes = require('./routes/leadRoutes');
const importExportRoutes = require('./routes/importExportRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const customerRoutes = require('./routes/customerRoutes');
const supplierRoutes = require('./routes/supplierRoutes');

const app = express();

// ============================================================
// DATABASE CONNECTION
// ============================================================
connectDB();

// ============================================================
// SECURITY HEADERS
// ============================================================
app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

// ============================================================
// CORS
// ============================================================
const allowedOrigin =
  process.env.CLIENT_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173'
    : undefined);

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true
  })
);

// ============================================================
// BODY PARSING
// ============================================================
app.use(
  express.json({
    limit: '10mb'
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb'
  })
);

// ============================================================
// LOGGER
// ============================================================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ============================================================
// STATIC UPLOADS
// ============================================================
app.use(
  '/uploads',
  express.static(path.join(__dirname, '../uploads'))
);

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Drive Line CRM API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================================
// API ROUTES
// ============================================================

// Authentication
app.use('/api/auth', authRoutes);

// Employees / Staff
app.use('/api/employees', employeeRoutes);

// Leads
app.use('/api/leads', leadRoutes);

// Import / Export
app.use('/api/import', importExportRoutes);

// Dashboard
app.use('/api/dashboard', dashboardRoutes);

// Customers
app.use('/api/customers', customerRoutes);

// Suppliers
app.use('/api/suppliers', supplierRoutes);

// ============================================================
// 404 HANDLER
// ============================================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================
app.use(errorHandler);

// ============================================================
// EXPORT APP
// ============================================================
module.exports = app;