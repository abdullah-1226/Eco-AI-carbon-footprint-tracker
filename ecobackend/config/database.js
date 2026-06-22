const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        console.log('🔌 Attempting MongoDB connection...');
        
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📁 Database: ${conn.connection.name}`);
        
        // Display collections
        const collections = await conn.connection.db.listCollections().toArray();
        console.log(`📊 Collections: ${collections.map(c => c.name).join(', ') || 'None'}`);
        
        return conn;
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        console.log('\n💡 TROUBLESHOOTING:');
        console.log('1. Check if MongoDB is running: brew services list');
        console.log('2. Start MongoDB: brew services start mongodb-community');
        console.log('3. Test connection: mongosh');
        process.exit(1);
    }
};

// Connection events
mongoose.connection.on('connected', () => {
    console.log('🎯 Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
    console.log(`❌ Mongoose connection error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️  Mongoose disconnected');
});

module.exports = connectDB;
