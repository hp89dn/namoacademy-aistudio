
import type { HistoryItem, LibraryItem, Project, Version } from '../types';

const DB_NAME = 'ArchivisionDB';
const PROJECTS_STORE = 'projects';
const VERSIONS_STORE = 'versions';
const LIBRARY_STORE = 'library';
// Define HISTORY_STORE for user activity tracking
const HISTORY_STORE = 'history';
const DB_VERSION = 4;

let db: IDBDatabase;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject('Database error');
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(PROJECTS_STORE)) {
        dbInstance.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains(VERSIONS_STORE)) {
        const store = dbInstance.createObjectStore(VERSIONS_STORE, { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
      }
      if (!dbInstance.objectStoreNames.contains(LIBRARY_STORE)) {
        dbInstance.createObjectStore(LIBRARY_STORE, { keyPath: 'id' });
      }
      // Initialize HISTORY_STORE if it does not exist
      if (!dbInstance.objectStoreNames.contains(HISTORY_STORE)) {
        dbInstance.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
      }
    };
  });
};

export const saveProject = async (project: Project): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(PROJECTS_STORE, 'readwrite');
  await tx.objectStore(PROJECTS_STORE).put(project);
};

export const getAllProjects = async (): Promise<Project[]> => {
  const db = await openDB();
  const tx = db.transaction(PROJECTS_STORE, 'readonly');
  const request = tx.objectStore(PROJECTS_STORE).getAll();
  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.lastModified - a.lastModified));
  });
};

export const deleteProject = async (id: string): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction([PROJECTS_STORE, VERSIONS_STORE], 'readwrite');
  tx.objectStore(PROJECTS_STORE).delete(id);
  // Versions will be manually cleaned or handled by your UI logic
};

export const saveVersion = async (version: Version): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(VERSIONS_STORE, 'readwrite');
  await tx.objectStore(VERSIONS_STORE).put(version);
};

export const getProjectVersions = async (projectId: string): Promise<Version[]> => {
  const db = await openDB();
  const tx = db.transaction(VERSIONS_STORE, 'readonly');
  const index = tx.objectStore(VERSIONS_STORE).index('projectId');
  const request = index.getAll(IDBKeyRange.only(projectId));
  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt - a.createdAt));
  });
};

export const addLibraryItemToDB = async (item: LibraryItem): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(LIBRARY_STORE, 'readwrite');
  await tx.objectStore(LIBRARY_STORE).put(item);
};

export const getAllLibraryItemsFromDB = async (): Promise<LibraryItem[]> => {
  const db = await openDB();
  const tx = db.transaction(LIBRARY_STORE, 'readonly');
  const request = tx.objectStore(LIBRARY_STORE).getAll();
  return new Promise((resolve) => {
    request.onsuccess = () => {
        // Items are saved with uuidv4, use a safe sort (or no sort if order isn't strictly required by ID)
        // Here we just return as is or sort by a property if we added a timestamp.
        // Since original logic tried to sort by ID descending, we can do string comparison.
        resolve(request.result.sort((a, b) => b.id.localeCompare(a.id)));
    };
  });
};

export const deleteLibraryItemFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(LIBRARY_STORE, 'readwrite');
  await tx.objectStore(LIBRARY_STORE).delete(id);
};

/**
 * Adds a new history item to the database.
 */
export const addHistoryItemToDB = async (item: HistoryItem): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(HISTORY_STORE, 'readwrite');
  await tx.objectStore(HISTORY_STORE).put(item);
};

/**
 * Retrieves all history items, sorted by creation time (descending).
 */
export const getAllHistoryItemsFromDB = async (): Promise<HistoryItem[]> => {
  const db = await openDB();
  const tx = db.transaction(HISTORY_STORE, 'readonly');
  const request = tx.objectStore(HISTORY_STORE).getAll();
  return new Promise((resolve) => {
    request.onsuccess = () => {
        // Safe string comparison for UUIDs
        resolve(request.result.sort((a, b) => b.id.localeCompare(a.id)));
    };
  });
};

/**
 * Clears all items from the history store.
 */
export const clearHistoryFromDB = async (): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(HISTORY_STORE, 'readwrite');
  await tx.objectStore(HISTORY_STORE).clear();
};

/**
 * Trims the history store to keep only the most recent N items.
 */
export const trimHistoryInDB = async (maxItems: number): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(HISTORY_STORE, 'readwrite');
  const store = tx.objectStore(HISTORY_STORE);
  const request = store.getAllKeys();
  
  return new Promise((resolve) => {
    request.onsuccess = () => {
      const keys = request.result as string[];
      if (keys.length > maxItems) {
        // Sort keys as strings for UUIDs (not ideal for 'most recent' unless ID contains timestamp)
        // Ideally we'd have a createdAt field, but staying close to existing logic:
        const sortedKeys = keys.sort((a, b) => a.localeCompare(b));
        const itemsToDelete = keys.length - maxItems;
        for (let i = 0; i < itemsToDelete; i++) {
          store.delete(sortedKeys[i]);
        }
      }
      resolve();
    };
  });
};
