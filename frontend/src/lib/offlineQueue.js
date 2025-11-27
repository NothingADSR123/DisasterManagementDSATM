/**
 * Offline Queue Module
 * 
 * Manages a queue of actions that failed to sync while offline.
 * Automatically flushes when connection is restored.
 * 
 * Features:
 * - Persistent storage in IndexedDB
 * - Auto-flush on online event
 * - Progress tracking during flush
 * - BroadcastChannel for cross-tab coordination
 * - Retry mechanism with exponential backoff
 * 
 * @module offlineQueue
 */

import { get, put, deleteRecord, query, getAll } from './db.js';

const STORE_NAME = 'offlineQueue';
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second
let flushInProgress = false;
let flushCompleteCallbacks = [];

// BroadcastChannel for cross-tab communication
let broadcastChannel = null;
if (typeof BroadcastChannel !== 'undefined') {
  broadcastChannel = new BroadcastChannel('offline-queue-sync');
  
  broadcastChannel.onmessage = (event) => {
    const { type, data } = event.data;
    
    if (type === 'queue-updated') {
      emitEvent('queue-updated', data);
    } else if (type === 'flush-started') {
      emitEvent('flush-started', data);
    } else if (type === 'flush-progress') {
      emitEvent('flush-progress', data);
    } else if (type === 'flush-complete') {
      emitEvent('flush-complete', data);
      notifyFlushComplete(data);
    }
  };
}

/**
 * Emit custom event for UI updates
 * @param {string} eventName - Event name
 * @param {Object} detail - Event data
 */
function emitEvent(eventName, detail) {
  // Dispatch window event
  window.dispatchEvent(new CustomEvent(`offlineQueue:${eventName}`, { detail }));
  
  // Also dispatch generic event for backwards compatibility
  window.dispatchEvent(new CustomEvent('offlineQueueUpdate', { 
    detail: { type: eventName, ...detail } 
  }));
}

/**
 * Broadcast message to other tabs
 * @param {string} type - Message type
 * @param {Object} data - Message data
 */
function broadcast(type, data) {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type, data });
  }
}

/**
 * Add an action to the offline queue
 * @param {Object} action - Action to queue
 * @param {string} action.type - Action type (e.g., 'CREATE_REQUEST', 'UPDATE_VOLUNTEER')
 * @param {Object} action.payload - Action data
 * @param {string} [action.endpoint] - API endpoint (defaults to '/api/sync')
 * @returns {Promise<string>} Queue item ID
 * 
 * @example
 * await add({
 *   type: 'CREATE_REQUEST',
 *   endpoint: '/api/requests',
 *   payload: { name: 'Help needed', location: {...} }
 * });
 */
export async function add(action) {
  const queueItem = {
    action,
    retries: 0,
    createdAt: Date.now(),
    synced: false,
    lastAttempt: null,
    error: null
  };
  
  const id = await put(STORE_NAME, queueItem);
  
  const length = await getLength();
  
  // Emit event
  emitEvent('queue-updated', { 
    action: 'added', 
    id, 
    length,
    queueItem 
  });
  
  // Broadcast to other tabs
  broadcast('queue-updated', { 
    action: 'added', 
    id, 
    length 
  });
  
  console.log(`Added action to offline queue: ${action.type}`, { id, length });
  
  return id;
}

/**
 * Get all items in the queue
 * @returns {Promise<Array>} All queue items
 */
export async function peekAll() {
  const items = await query(STORE_NAME, item => !item.synced);
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Get the number of items in the queue
 * @returns {Promise<number>} Queue length
 */
export async function getLength() {
  const items = await peekAll();
  return items.length;
}

/**
 * Placeholder function to send action to server
 * Backend team should implement the actual /api/sync endpoint
 * 
 * @param {Object} action - Action to send
 * @returns {Promise<Object>} Server response
 * 
 * Expected endpoint behavior:
 * POST /api/sync
 * Body: { type: string, payload: object, endpoint?: string }
 * Response: { success: boolean, data?: object, error?: string }
 */
export async function sendToServer(action) {
  const endpoint = action.endpoint || '/api/sync';
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(action),
      // Add timeout
      signal: AbortSignal.timeout(10000) // 10 seconds
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Server error: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    return result;
    
  } catch (error) {
    console.error('Failed to send to server:', error);
    throw error;
  }
}

/**
 * Process a single queue item
 * @param {Object} item - Queue item
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function processItem(item, onProgress) {
  try {
    // Update last attempt
    await put(STORE_NAME, {
      ...item,
      lastAttempt: Date.now()
    });
    
    // Attempt to send
    const result = await sendToServer(item.action);
    
    // Mark as synced
    await put(STORE_NAME, {
      ...item,
      synced: true,
      syncedAt: Date.now(),
      result
    });
    
    // Report progress
    if (onProgress) {
      onProgress({
        id: item.id,
        action: item.action,
        status: 'success',
        result
      });
    }
    
    console.log(`Successfully synced queue item: ${item.id}`);
    return true;
    
  } catch (error) {
    console.error(`Failed to sync queue item: ${item.id}`, error);
    
    // Increment retry count
    const updatedItem = {
      ...item,
      retries: (item.retries || 0) + 1,
      error: error.message,
      lastError: error.message,
      lastAttempt: Date.now()
    };
    
    // Check if max retries exceeded
    if (updatedItem.retries >= MAX_RETRIES) {
      updatedItem.failed = true;
      updatedItem.failedAt = Date.now();
      
      console.warn(`Queue item ${item.id} exceeded max retries (${MAX_RETRIES})`);
    }
    
    await put(STORE_NAME, updatedItem);
    
    // Report progress
    if (onProgress) {
      onProgress({
        id: item.id,
        action: item.action,
        status: updatedItem.failed ? 'failed' : 'retry',
        error: error.message,
        retries: updatedItem.retries
      });
    }
    
    return false;
  }
}

/**
 * Calculate retry delay with exponential backoff
 * @param {number} retries - Number of retries
 * @returns {number} Delay in milliseconds
 */
function getRetryDelay(retries) {
  return RETRY_DELAY_BASE * Math.pow(2, retries);
}

/**
 * Flush the queue - attempt to sync all pending items
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object>} Flush results
 * 
 * @example
 * await flush((progress) => {
 *   console.log(`${progress.id}: ${progress.status}`);
 * });
 */
export async function flush(onProgress) {
  // Check if already flushing
  if (flushInProgress) {
    console.warn('Flush already in progress');
    return { skipped: true, reason: 'flush-in-progress' };
  }
  
  // Check if online
  if (!navigator.onLine) {
    console.warn('Cannot flush: offline');
    return { skipped: true, reason: 'offline' };
  }
  
  flushInProgress = true;
  
  const startTime = Date.now();
  const results = {
    total: 0,
    success: 0,
    failed: 0,
    retry: 0,
    duration: 0,
    items: []
  };
  
  try {
    // Get all unsynced items
    const items = await peekAll();
    results.total = items.length;
    
    if (items.length === 0) {
      console.log('Queue is empty, nothing to flush');
      return results;
    }
    
    console.log(`Flushing ${items.length} queue items...`);
    
    // Emit flush started
    emitEvent('flush-started', { total: items.length });
    broadcast('flush-started', { total: items.length });
    
    // Process items sequentially to avoid overwhelming the server
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Skip failed items (exceeded max retries)
      if (item.failed) {
        results.failed++;
        continue;
      }
      
      // Apply retry delay if needed
      if (item.retries > 0) {
        const delay = getRetryDelay(item.retries - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Process the item
      const success = await processItem(item, (progress) => {
        // Emit progress event
        emitEvent('flush-progress', {
          ...progress,
          current: i + 1,
          total: items.length,
          percentage: Math.round(((i + 1) / items.length) * 100)
        });
        
        broadcast('flush-progress', {
          id: progress.id,
          status: progress.status,
          current: i + 1,
          total: items.length
        });
        
        // Call user callback
        if (onProgress) {
          onProgress({
            ...progress,
            current: i + 1,
            total: items.length
          });
        }
      });
      
      if (success) {
        results.success++;
        results.items.push({ id: item.id, status: 'success' });
      } else {
        if (item.retries >= MAX_RETRIES) {
          results.failed++;
          results.items.push({ id: item.id, status: 'failed' });
        } else {
          results.retry++;
          results.items.push({ id: item.id, status: 'retry' });
        }
      }
    }
    
    results.duration = Date.now() - startTime;
    
    // Cleanup synced items
    const syncedItems = await query(STORE_NAME, item => item.synced === true);
    for (const item of syncedItems) {
      await deleteRecord(STORE_NAME, item.id);
    }
    
    console.log('Flush complete:', results);
    
    // Emit flush complete
    emitEvent('flush-complete', results);
    broadcast('flush-complete', results);
    
    // Notify callbacks
    notifyFlushComplete(results);
    
    return results;
    
  } catch (error) {
    console.error('Flush error:', error);
    
    emitEvent('flush-error', { error: error.message });
    broadcast('flush-error', { error: error.message });
    
    throw error;
    
  } finally {
    flushInProgress = false;
  }
}

/**
 * Register a callback for when flush completes
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 * 
 * @example
 * const unsubscribe = onFlushComplete((results) => {
 *   console.log(`Synced ${results.success}/${results.total} items`);
 * });
 */
export function onFlushComplete(callback) {
  flushCompleteCallbacks.push(callback);
  
  // Return unsubscribe function
  return () => {
    const index = flushCompleteCallbacks.indexOf(callback);
    if (index > -1) {
      flushCompleteCallbacks.splice(index, 1);
    }
  };
}

/**
 * Notify all flush complete callbacks
 * @param {Object} results - Flush results
 */
function notifyFlushComplete(results) {
  flushCompleteCallbacks.forEach(callback => {
    try {
      callback(results);
    } catch (error) {
      console.error('Flush complete callback error:', error);
    }
  });
}

/**
 * Clear all failed items from the queue
 * @returns {Promise<number>} Number of items cleared
 */
export async function clearFailed() {
  const failedItems = await query(STORE_NAME, item => item.failed === true);
  
  for (const item of failedItems) {
    await deleteRecord(STORE_NAME, item.id);
  }
  
  console.log(`Cleared ${failedItems.length} failed queue items`);
  
  emitEvent('queue-updated', { 
    action: 'cleared-failed', 
    count: failedItems.length 
  });
  
  return failedItems.length;
}

/**
 * Clear all items from the queue (use with caution)
 * @returns {Promise<number>} Number of items cleared
 */
export async function clearAll() {
  const allItems = await getAll(STORE_NAME);
  
  for (const item of allItems) {
    await deleteRecord(STORE_NAME, item.id);
  }
  
  console.log(`Cleared all ${allItems.length} queue items`);
  
  emitEvent('queue-updated', { 
    action: 'cleared-all', 
    count: allItems.length 
  });
  
  return allItems.length;
}

/**
 * Retry a specific failed item
 * @param {string} id - Queue item ID
 * @returns {Promise<boolean>} True if successful
 */
export async function retryItem(id) {
  const item = await get(STORE_NAME, id);
  
  if (!item) {
    console.warn(`Queue item not found: ${id}`);
    return false;
  }
  
  // Reset failure state
  const resetItem = {
    ...item,
    failed: false,
    retries: 0,
    error: null,
    lastError: null
  };
  
  await put(STORE_NAME, resetItem);
  
  // Try to sync immediately if online
  if (navigator.onLine) {
    return await processItem(resetItem);
  }
  
  return false;
}

/**
 * Get queue statistics
 * @returns {Promise<Object>} Queue stats
 */
export async function getStats() {
  const allItems = await getAll(STORE_NAME);
  
  const stats = {
    total: allItems.length,
    pending: allItems.filter(i => !i.synced && !i.failed).length,
    synced: allItems.filter(i => i.synced).length,
    failed: allItems.filter(i => i.failed).length,
    oldestItem: allItems.length > 0 
      ? Math.min(...allItems.map(i => i.createdAt))
      : null,
    newestItem: allItems.length > 0
      ? Math.max(...allItems.map(i => i.createdAt))
      : null
  };
  
  return stats;
}

// Auto-flush on online event
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('Connection restored, auto-flushing queue...');
    
    emitEvent('auto-flush-triggered', { 
      timestamp: Date.now() 
    });
    
    try {
      await flush();
    } catch (error) {
      console.error('Auto-flush failed:', error);
    }
  });
  
  // Log offline events
  window.addEventListener('offline', () => {
    console.log('Connection lost, queuing actions...');
    emitEvent('offline-detected', { 
      timestamp: Date.now() 
    });
  });
}

const offlineQueue = {
  add,
  peekAll,
  flush,
  onFlushComplete,
  getLength,
  sendToServer,
  clearFailed,
  clearAll,
  retryItem,
  getStats
};

export { offlineQueue };
export default offlineQueue;
