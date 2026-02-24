import Dexie, { Table } from 'dexie';

// 1. Define the Entity (Just like Android Room Entity)
export interface SosMessage {
  id?: number;
  message: string;
  timestamp: string;
  isSynced: boolean;
}

// 2. Define the Database
export class AuraDatabase extends Dexie {
  sosMessages!: Table<SosMessage>; 

  constructor() {
    super('AuraMeshDB');
    // Define table and indexes (id is auto-incremented)
    this.version(1).stores({
      sosMessages: '++id, timestamp, isSynced'
    });
  }
}

export const db = new AuraDatabase();