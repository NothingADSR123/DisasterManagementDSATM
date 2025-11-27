/**
 * Compatibility wrapper for old idb.js API
 * This file now delegates to the new db.js module
 */

import { initDB as initNewDB, getAll as getAllNew, put, watch } from './db';

// Store name mapping from old to new
const STORES = {
  HELP_REQUESTS: 'requests',
  VOLUNTEERS: 'volunteers',
  SHELTERS: 'shelters',
  OFFLINE_QUEUE: 'offlineQueue'
};

/**
 * Initialize IndexedDB
 */
export async function initDB() {
  return initNewDB();
}

/**
 * Get all records from a store
 */
export async function getAll(storeName) {
  return getAllNew(storeName);
}

/**
 * Get a single record by ID
 */
export async function getById(storeName, id) {
  await initDB();
  const all = await getAllNew(storeName);
  return all.find(item => item.id === id);
}

/**
 * Add a record to a store
 */
export async function add(storeName, data) {
  await initDB();
  // Generate an ID if not present
  if (!data.id) {
    data.id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
  return put(storeName, { ...data, timestamp: data.timestamp || Date.now() });
}

/**
 * Update a record in a store
 */
export async function update(storeName, data) {
  await initDB();
  return put(storeName, data);
}

/**
 * Delete a record from a store
 */
export async function remove(storeName, id) {
  await initDB();
  const db = await initNewDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Clear all records from a store
 */
export async function clear(storeName) {
  await initDB();
  const db = await initNewDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Subscribe to changes in a store
 * Returns an unsubscribe function
 */
export function subscribe(storeName, callback) {
  // Use the watch function from new db.js
  const unwatch = watch(storeName, (action, record) => {
    // Fetch all records and call the callback
    getAll(storeName).then(callback).catch(error => {
      console.error(`Error in subscribe callback for ${storeName}:`, error);
    });
  });
  
  // Also do an initial fetch
  getAll(storeName).then(callback).catch(console.error);
  
  return unwatch;
}

// Export store names for convenience
export { STORES };
