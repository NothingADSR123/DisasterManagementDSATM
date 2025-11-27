/**
 * IndexedDB Wrapper Module
 * 
 * A lightweight, promise-based wrapper around IndexedDB with:
 * - Auto-initialization with 'rescue-pwa' database
 * - Object stores: requests, volunteers, shelters, routes, offlineQueue, peers
 * - Automatic timestamp and hash generation on writes
 * - Query support with JS predicates
 * - Pub/sub watch system using BroadcastChannel
 * 
 * @module db
 */

const DB_NAME = 'rescue-pwa';
const DB_VERSION = 2;
const STORES = ['requests', 'volunteers', 'shelters', 'routes', 'offlineQueue', 'peers', 'evacuationNotifications', 'crowdReports'];

let dbInstance = null;
const watchers = new Map(); // storeName -> Set<callback>
let broadcastChannel = null;

// Initialize BroadcastChannel for cross-tab synchronization
if (typeof BroadcastChannel !== 'undefined') {
  broadcastChannel = new BroadcastChannel('rescue-pwa-sync');
  broadcastChannel.onmessage = (event) => {
    const { storeName, action, record } = event.data;
    notifyWatchers(storeName, action, record);
  };
}

/**
 * Compute SHA-256 hash of a record
 * @param {Object} record - The record to hash
 * @returns {Promise<string>} Hex-encoded hash
 */
export async function computeHash(record) {
  try {
    // Create stable string representation (sorted keys)
    const sortedKeys = Object.keys(record).sort();
    const dataString = sortedKeys
      .map(key => `${key}:${JSON.stringify(record[key])}`)
      .join('|');
    
    // Convert to Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    
    // Compute SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.error('Hash computation failed:', error);
    // Fallback: simple timestamp-based hash
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

/**
 * Generate unique ID
 * @returns {string} UUID-like identifier
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>} Database instance
 */
export async function initDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Database failed to open:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log(`Database ${DB_NAME} initialized successfully`);
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      STORES.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { 
            keyPath: 'id',
            autoIncrement: false 
          });
          
          // Create indexes for common queries
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('hash', 'hash', { unique: false });
          
          // Store-specific indexes
          if (storeName === 'requests') {
            store.createIndex('status', 'status', { unique: false });
            store.createIndex('priority', 'priority', { unique: false });
          } else if (storeName === 'volunteers') {
            store.createIndex('available', 'available', { unique: false });
          } else if (storeName === 'shelters') {
            store.createIndex('capacity', 'capacity', { unique: false });
          } else if (storeName === 'routes') {
            store.createIndex('routeKey', 'routeKey', { unique: true });
          } else if (storeName === 'offlineQueue') {
            store.createIndex('synced', 'synced', { unique: false });
          }
          
          console.log(`Created object store: ${storeName}`);
        }
      });
    };
  });
}

/**
 * Get a transaction for a store
 * @param {string} storeName - Name of the object store
 * @param {string} mode - Transaction mode ('readonly' or 'readwrite')
 * @returns {Promise<IDBObjectStore>} Object store
 */
async function getStore(storeName, mode = 'readonly') {
  const db = await initDB();
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

/**
 * Get all records from a store
 * @param {string} storeName - Name of the object store
 * @returns {Promise<Array>} All records in the store
 */
export async function getAll(storeName) {
  const store = await getStore(storeName, 'readonly');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single record by key
 * @param {string} storeName - Name of the object store
 * @param {string} key - Record ID
 * @returns {Promise<Object|undefined>} The record or undefined
 */
export async function get(storeName, key) {
  const store = await getStore(storeName, 'readonly');
  
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Put (insert or update) a record
 * Auto-generates id, timestamp, and hash if missing
 * @param {string} storeName - Name of the object store
 * @param {Object} record - Record to store
 * @returns {Promise<string>} The record ID
 */
export async function put(storeName, record) {
  // Ensure record has required fields
  const enrichedRecord = {
    ...record,
    id: record.id || generateId(),
    timestamp: record.timestamp || Date.now(),
  };
  
  // Compute hash (exclude hash field itself to avoid circular dependency)
  const recordForHash = { ...enrichedRecord };
  delete recordForHash.hash;
  enrichedRecord.hash = await computeHash(recordForHash);
  
  const store = await getStore(storeName, 'readwrite');
  
  return new Promise((resolve, reject) => {
    const request = store.put(enrichedRecord);
    
    request.onsuccess = () => {
      const recordId = request.result;
      
      // Notify watchers
      notifyWatchers(storeName, 'put', enrichedRecord);
      
      // Broadcast to other tabs
      if (broadcastChannel) {
        broadcastChannel.postMessage({
          storeName,
          action: 'put',
          record: enrichedRecord
        });
      }
      
      resolve(recordId);
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a record by key
 * @param {string} storeName - Name of the object store
 * @param {string} key - Record ID to delete
 * @returns {Promise<void>}
 */
export async function deleteRecord(storeName, key) {
  const store = await getStore(storeName, 'readwrite');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(key);
    
    request.onsuccess = () => {
      // Notify watchers
      notifyWatchers(storeName, 'delete', { id: key });
      
      // Broadcast to other tabs
      if (broadcastChannel) {
        broadcastChannel.postMessage({
          storeName,
          action: 'delete',
          record: { id: key }
        });
      }
      
      resolve();
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Export as 'delete' alias
export { deleteRecord as delete };

/**
 * Clear all records from a store
 * @param {string} storeName - Name of the object store
 * @returns {Promise<void>}
 */
export async function clear(storeName) {
  const store = await getStore(storeName, 'readwrite');
  
  return new Promise((resolve, reject) => {
    const request = store.clear();
    
    request.onsuccess = () => {
      // Notify watchers
      notifyWatchers(storeName, 'clear', null);
      
      // Broadcast to other tabs
      if (broadcastChannel) {
        broadcastChannel.postMessage({
          storeName,
          action: 'clear',
          record: null
        });
      }
      
      resolve();
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Query records using a JavaScript predicate function
 * @param {string} storeName - Name of the object store
 * @param {Function} predicateFn - Function that returns true for matching records
 * @returns {Promise<Array>} Filtered records
 * 
 * @example
 * // Get all high-priority requests
 * const urgent = await query('requests', r => r.priority === 'high');
 * 
 * // Get available volunteers
 * const available = await query('volunteers', v => v.available === true);
 */
export async function query(storeName, predicateFn) {
  const allRecords = await getAll(storeName);
  return allRecords.filter(predicateFn);
}

/**
 * Notify local watchers about changes
 * @param {string} storeName - Store that changed
 * @param {string} action - Type of change (put, delete, clear)
 * @param {Object} record - The affected record
 */
function notifyWatchers(storeName, action, record) {
  const storeWatchers = watchers.get(storeName);
  if (storeWatchers) {
    storeWatchers.forEach(callback => {
      try {
        callback({ storeName, action, record });
      } catch (error) {
        console.error('Watcher callback error:', error);
      }
    });
  }
}

/**
 * Watch for changes to a store
 * Receives notifications for puts, deletes, and clears
 * Works across tabs using BroadcastChannel
 * 
 * @param {string} storeName - Name of the object store to watch
 * @param {Function} callback - Called with {storeName, action, record}
 * @returns {Function} Unsubscribe function
 * 
 * @example
 * const unsubscribe = watch('requests', ({ action, record }) => {
 *   console.log(`Request ${action}:`, record);
 * });
 * 
 * // Later: unsubscribe()
 */
export function watch(storeName, callback) {
  if (!watchers.has(storeName)) {
    watchers.set(storeName, new Set());
  }
  
  watchers.get(storeName).add(callback);
  
  // Return unsubscribe function
  return () => {
    const storeWatchers = watchers.get(storeName);
    if (storeWatchers) {
      storeWatchers.delete(callback);
      if (storeWatchers.size === 0) {
        watchers.delete(storeName);
      }
    }
  };
}

/**
 * Batch operations for better performance
 * @param {string} storeName - Name of the object store
 * @param {Array<Object>} records - Records to insert/update
 * @returns {Promise<Array<string>>} Array of record IDs
 */
export async function putBatch(storeName, records) {
  const db = await initDB();
  const transaction = db.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);
  
  const promises = records.map(async (record) => {
    const enrichedRecord = {
      ...record,
      id: record.id || generateId(),
      timestamp: record.timestamp || Date.now(),
    };
    
    const recordForHash = { ...enrichedRecord };
    delete recordForHash.hash;
    enrichedRecord.hash = await computeHash(recordForHash);
    
    return new Promise((resolve, reject) => {
      const request = store.put(enrichedRecord);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
  
  const ids = await Promise.all(promises);
  
  // Notify watchers after batch complete
  notifyWatchers(storeName, 'putBatch', records);
  
  if (broadcastChannel) {
    broadcastChannel.postMessage({
      storeName,
      action: 'putBatch',
      records
    });
  }
  
  return ids;
}

/**
 * Get database statistics
 * @returns {Promise<Object>} Statistics for each store
 */
export async function getStats() {
  const stats = {};
  
  for (const storeName of STORES) {
    const records = await getAll(storeName);
    stats[storeName] = {
      count: records.length,
      size: JSON.stringify(records).length,
      oldestTimestamp: records.length > 0 
        ? Math.min(...records.map(r => r.timestamp || 0))
        : null,
      newestTimestamp: records.length > 0
        ? Math.max(...records.map(r => r.timestamp || 0))
        : null
    };
  }
  
  return stats;
}

/**
 * Export all data (for backup/sync)
 * @returns {Promise<Object>} All data from all stores
 */
export async function exportData() {
  const data = {};
  
  for (const storeName of STORES) {
    data[storeName] = await getAll(storeName);
  }
  
  return data;
}

/**
 * Import data (from backup/sync)
 * @param {Object} data - Data object with storeName -> records mapping
 * @returns {Promise<void>}
 */
export async function importData(data) {
  for (const [storeName, records] of Object.entries(data)) {
    if (STORES.includes(storeName)) {
      await putBatch(storeName, records);
    }
  }
}

/**
 * Cleanup old records based on timestamp
 * @param {string} storeName - Name of the object store
 * @param {number} maxAge - Maximum age in milliseconds
 * @returns {Promise<number>} Number of records deleted
 */
export async function cleanup(storeName, maxAge) {
  const cutoff = Date.now() - maxAge;
  const allRecords = await getAll(storeName);
  
  let deletedCount = 0;
  
  for (const record of allRecords) {
    if (record.timestamp && record.timestamp < cutoff) {
      await deleteRecord(storeName, record.id);
      deletedCount++;
    }
  }
  
  return deletedCount;
}

// Auto-initialize on module load
initDB().catch(err => {
  console.error('Failed to initialize database:', err);
});

export default {
  initDB,
  getAll,
  get,
  put,
  delete: deleteRecord,
  clear,
  query,
  watch,
  putBatch,
  getStats,
  exportData,
  importData,
  cleanup,
  computeHash,
  DB_NAME,
  DB_VERSION,
  STORES
};
