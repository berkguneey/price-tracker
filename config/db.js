const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./logger');

const connectDB = async () => {
  try {
    // Attempt to connect to MongoDB using Mongoose. 
    // The URI and database name are retrieved from the config file.
    await mongoose.connect(config.mongodb.uri, {
      dbName: config.mongodb.database, // Specify the database name
    });

    // Log a success message if the connection is established.
    logger.info("MongoDB connection successful!");
  } catch (error) {
    // Log the error message if the connection fails.
    logger.error("MongoDB connection error:", error.message);

    // Terminate the Node.js process with exit code 1 to indicate failure.
    process.exit(1);
  }
};


module.exports = connectDB;