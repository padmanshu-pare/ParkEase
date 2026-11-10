const mongoose = require('mongoose');

module.exports = async function connectDB() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing in server/.env');
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};
