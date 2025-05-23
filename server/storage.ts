import { ObjectId } from 'mongodb';
import { foldersCollection, playsCollection } from './db'; // Assuming these are MongoDB collections
import { 
  Folder, 
  Play, 
  CreateFolderInput, 
  CreatePlayInput,
  UpdateFolderInput,
  UpdatePlayFolderInput,
  // The actual Zod schema types might be named like CreateFolder, CreatePlay if inferred directly
  // For inputs, it's common to use a suffix like 'Input' or 'Payload' for clarity
  // I'll assume the types from shared/schema.ts are named as ...Input for this refactoring
} from '@shared/schema';
import { log } from './vite'; // Assuming log is a generic logger

// Helper to map MongoDB document to schema type (convert ObjectId _id to string)
const mapMongoDoc = <T extends { _id: ObjectId | string }>(doc: any): T => {
  if (doc && doc._id instanceof ObjectId) {
    return { ...doc, _id: doc._id.toHexString() } as T;
  }
  return doc as T;
};

const mapMongoDocs = <T extends { _id: ObjectId | string }>(docs: any[]): T[] => {
  return docs.map(doc => mapMongoDoc<T>(doc));
};

export interface IStorage {
  // Folder operations
  getFolders(): Promise<Folder[]>;
  createFolder(folderData: CreateFolderInput): Promise<Folder>;
  deleteFolder(id: string): Promise<void>;
  renameFolder(id: string, folderData: UpdateFolderInput): Promise<Folder | null>;

  // Play operations
  getPlays(): Promise<Play[]>;
  getPlayById(id: string): Promise<Play | null>;
  getPlaysByFolder(folderId: string): Promise<Play[]>;
  getPlaysByCategory(category: string): Promise<Play[]>;
  createPlay(playData: CreatePlayInput): Promise<Play>;
  deletePlay(id: string): Promise<void>;
  updatePlayFolder(playId: string, folderData: UpdatePlayFolderInput): Promise<Play | null>;
}

export class DatabaseStorage implements IStorage {
  async getFolders(): Promise<Folder[]> {
    try {
      log('Attempting to get folders from MongoDB...');
      const result = await foldersCollection.find().sort({ createdAt: -1 }).toArray();
      log(`Successfully retrieved ${result.length} folders`);
      return mapMongoDocs<Folder>(result);
    } catch (error) {
      log(`MongoDB error in getFolders: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      if (error instanceof Error) {
        log(`Error stack: ${error.stack}`);
      }
      throw error;
    }
  }

  async createFolder(folderData: CreateFolderInput): Promise<Folder> {
    try {
      log(`Attempting to create folder with name: ${folderData.name}`);
      const now = new Date();
      const newFolderDocument = {
        name: folderData.name,
        createdAt: now,
        updatedAt: now,
      };
      const result = await foldersCollection.insertOne(newFolderDocument);
      log(`Successfully created folder with ID: ${result.insertedId}`);
      // Construct the Folder object to return, including the generated _id
      return mapMongoDoc<Folder>({ ...newFolderDocument, _id: result.insertedId });
    } catch (error) {
      log(`MongoDB error in createFolder: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      if (error instanceof Error) {
        log(`Error stack: ${error.stack}`);
      }
      throw error;
    }
  }

  async renameFolder(id: string, folderData: UpdateFolderInput): Promise<Folder | null> {
    if (!ObjectId.isValid(id)) {
      log(`Invalid ObjectId format for ID: ${id} in renameFolder`);
      return null; 
    }
    const result = await foldersCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { name: folderData.name, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ? mapMongoDoc<Folder>(result) : null;
  }

  async deleteFolder(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) {
      log(`Invalid ObjectId format for ID: ${id} in deleteFolder`);
      return; 
    }
    // Update plays in this folder to have folderId: null (plays store folderId as string)
    // This assumes plays store folderId as the string representation of the folder's ObjectId
    await playsCollection.updateMany(
      { folderId: id }, 
      { $set: { folderId: null, updatedAt: new Date() } }
    );

    await foldersCollection.deleteOne({ _id: new ObjectId(id) });
  }

  async getPlays(): Promise<Play[]> {
    const result = await playsCollection.find().sort({ createdAt: -1 }).toArray();
    return mapMongoDocs<Play>(result);
  }

  async getPlayById(id: string): Promise<Play | null> {
    if (!ObjectId.isValid(id)) {
      log(`Invalid ObjectId format for ID: ${id} in getPlayById`);
      return null;
    }
    const result = await playsCollection.findOne({ _id: new ObjectId(id) });
    return result ? mapMongoDoc<Play>(result) : null;
  }

  async getPlaysByFolder(folderId: string): Promise<Play[]> {
    // Assuming folderId in plays collection is stored as a string (ObjectId.toHexString())
    const result = await playsCollection.find({ folderId: folderId }).sort({ createdAt: -1 }).toArray();
    return mapMongoDocs<Play>(result);
  }

  async getPlaysByCategory(category: string): Promise<Play[]> {
    const result = await playsCollection.find({ category: category }).sort({ createdAt: -1 }).toArray();
    return mapMongoDocs<Play>(result);
  }

  async createPlay(playData: CreatePlayInput): Promise<Play> {
    const now = new Date();
    const newPlayDocument = {
      name: playData.name,
      category: playData.category,
      folderId: playData.folderId || null, // Ensure it's null if undefined
      keyframes: playData.keyframes,
      createdAt: now,
      updatedAt: now,
    };
    const result = await playsCollection.insertOne(newPlayDocument);
     return mapMongoDoc<Play>({ ...newPlayDocument, _id: result.insertedId });
  }

  async deletePlay(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) {
      log(`Invalid ObjectId format for ID: ${id} in deletePlay`);
      return;
    }
    await playsCollection.deleteOne({ _id: new ObjectId(id) });
  }

  async updatePlayFolder(playId: string, folderData: UpdatePlayFolderInput): Promise<Play | null> {
    if (!ObjectId.isValid(playId)) {
      log(`Invalid ObjectId format for play ID: ${playId} in updatePlayFolder`);
      return null;
    }
    // folderId in UpdatePlayFolderInput is string | null. This is what we want to set.
    const result = await playsCollection.findOneAndUpdate(
      { _id: new ObjectId(playId) },
      { $set: { folderId: folderData.folderId, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result ? mapMongoDoc<Play>(result) : null;
  }
}

export const storage = new DatabaseStorage();