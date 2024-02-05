const MongoClient = require('mongodb').MongoClient;

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function connect() {
    try {
        await client.connect();
        const db = client.db(process.env.DEFAULT_DATABASE);
        return db;
    } catch (error) {
        console.error('Connection to MongoDB failed', error);
        process.exit(1);
    }
}

module.exports = { connect };
