const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not configured');
    }

    const conn = await mongoose.connect(mongoUri);

    console.log(
      `[Database] MongoDB Connected: ${conn.connection.host}`
    );
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;