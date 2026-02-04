const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threatscan', {
            // Options are no longer needed in Mongoose 6+ mostly, but if using old version:
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
        });

        logger.info(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        // Allow the app to run without DB (fallback mode) or exit? 
        // For production stability, we prefer logging error but staying alive if possible, 
        // OR crashing if DB is critical. Here, let's just log.
        // process.exit(1); 
    }
};

module.exports = connectDB;
