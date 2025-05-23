import { MongoClient, Db, Collection } from 'mongodb';
import 'dotenv/config'; // For loading .env file
import { Folder, Play } from '../shared/schema'; // Assuming these are the Zod inferred types

const mongoUri = process.env.MONGO_URI;
const mongoDbName = process.env.MONGO_DB_NAME || 'rugby_tactics';
const mongoUser = process.env.MONGO_USER;
const mongoPassword = process.env.MONGO_PASSWORD;

let constructedMongoUri = mongoUri;

if (!constructedMongoUri) {
  if (mongoUser && mongoPassword) {
    // Construct URI if individual components are provided (e.g., for local dev without a full URI in .env)
    // For Docker Compose, the service name is 'mongo'
    constructedMongoUri = `mongodb://${mongoUser}:${mongoPassword}@mongo:27017/${mongoDbName}?authSource=admin`;
  } else {
    throw new Error(
      'MongoDB connection string is not configured. Please set MONGO_URI or MONGO_USER/MONGO_PASSWORD and optionally MONGO_DB_NAME in your .env file.',
    );
  }
} else {
  // If MONGO_URI is provided, ensure the dbName is part of it or append it.
  // This basic check assumes MONGO_URI might not include the database name.
  // A more robust solution might involve parsing the URI.
  if (!constructedMongoUri.includes(`/${mongoDbName}`)) {
    const uriParts = constructedMongoUri.split('?');
    const baseUri = uriParts[0].endsWith('/') ? uriParts[0].slice(0, -1) : uriParts[0];
    constructedMongoUri = `${baseUri}/${mongoDbName}${uriParts[1] ? `?${uriParts[1]}` : ''}`;
  }
}

if (!mongoDbName) {
  throw new Error(
    'MONGO_DB_NAME is not set. Please configure it in your .env file.',
  );
}

const client = new MongoClient(constructedMongoUri);
let dbInstance: Db;

export async function connectToDatabase(): Promise<Db> {
  if (dbInstance) {
    return dbInstance;
  }
  try {
    await client.connect();
    console.log('Successfully connected to MongoDB.');
    dbInstance = client.db(mongoDbName);

    // You can add index creation logic here if needed, e.g.:
    // await dbInstance.collection('folders').createIndex({ name: 1 });
    // await dbInstance.collection('plays').createIndex({ folderId: 1 });

    return dbInstance;
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
    // Optionally, you might want to gracefully shutdown the application
    await client.close();
    process.exit(1); // Exit the process with an error code
  }
}

// Export typed collections
// These will be properly initialized after connectToDatabase() is called and dbInstance is set.
// Usage would involve calling connectToDatabase first, then using these exports.
// A more robust approach might involve a getter function that ensures connection first.

export const getDb = (): Db => {
  if (!dbInstance) {
    throw new Error('Database not connected. Call connectToDatabase first.');
  }
  return dbInstance;
};

// It's often better to get collections from the db instance when needed,
// rather than exporting them directly before the connection is established.
// However, to somewhat match the previous pattern of exporting db-related objects:

let foldersCollection: Collection<Folder>;
let playsCollection: Collection<Play>;

// Initialize collections after connection
(async () => {
  try {
    const db = await connectToDatabase();
    foldersCollection = db.collection<Folder>('folders');
    playsCollection = db.collection<Play>('plays');
    // Optional: Create indexes here if not done in connectToDatabase
    // await foldersCollection.createIndex({ name: 1 }, { unique: true }); // Example: unique folder names
    // await playsCollection.createIndex({ name: 1 });
    // await playsCollection.createIndex({ folderId: 1 });
    console.log("MongoDB collections initialized.");
  } catch (error) {
    console.error("Error initializing collections:", error);
  }
})();

export { foldersCollection, playsCollection };

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing MongoDB connection...');
  await client.close();
  process.exit(0);
});
