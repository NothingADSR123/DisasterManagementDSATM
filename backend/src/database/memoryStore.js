// In-memory storage using Map for each collection
const collections = {
  requests: new Map(),
  volunteers: new Map(),
  shelters: new Map(),
  routes: new Map(),
  offlineQueue: new Map(),
  peers: new Map()
};

/**
 * Create a new item in a collection
 * @param {string} collectionName - Name of the collection
 * @param {object} data - Item data
 * @returns {object} Created item with ID and timestamps
 */
function createItem(collectionName, data) {
  const collection = collections[collectionName];
  if (!collection) {
    throw new Error(`Collection "${collectionName}" does not exist`);
  }

  // Auto-generate ID if missing
  const id = data.id || `${collectionName}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  
  // Create item with metadata
  const item = {
    ...data,
    id,
    source: 'server',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Store in collection
  collection.set(id, item);
  
  return item;
}

/**
 * Update an existing item in a collection
 * @param {string} collectionName - Name of the collection
 * @param {string} id - Item ID
 * @param {object} updates - Fields to update
 * @returns {object|null} Updated item or null if not found
 */
function updateItem(collectionName, id, updates) {
  const collection = collections[collectionName];
  if (!collection) {
    throw new Error(`Collection "${collectionName}" does not exist`);
  }

  const existing = collection.get(id);
  if (!existing) {
    return null;
  }

  // Merge existing with updates
  const updated = {
    ...existing,
    ...updates,
    id: existing.id, // Preserve original ID
    createdAt: existing.createdAt, // Preserve creation timestamp
    updatedAt: new Date().toISOString()
  };

  collection.set(id, updated);
  
  return updated;
}

/**
 * Delete an item from a collection
 * @param {string} collectionName - Name of the collection
 * @param {string} id - Item ID
 * @returns {boolean} True if deleted, false if not found
 */
function deleteItem(collectionName, id) {
  const collection = collections[collectionName];
  if (!collection) {
    throw new Error(`Collection "${collectionName}" does not exist`);
  }

  return collection.delete(id);
}

/**
 * Get a single item from a collection
 * @param {string} collectionName - Name of the collection
 * @param {string} id - Item ID
 * @returns {object|null} Item or null if not found
 */
function getItem(collectionName, id) {
  const collection = collections[collectionName];
  if (!collection) {
    throw new Error(`Collection "${collectionName}" does not exist`);
  }

  return collection.get(id) || null;
}

/**
 * Get all items from a collection with optional filtering
 * @param {string} collectionName - Name of the collection
 * @param {function} filterFn - Optional filter function
 * @returns {array} Array of items
 */
function getAll(collectionName, filterFn) {
  const collection = collections[collectionName];
  if (!collection) {
    throw new Error(`Collection "${collectionName}" does not exist`);
  }

  const items = Array.from(collection.values());
  
  if (filterFn && typeof filterFn === 'function') {
    return items.filter(filterFn);
  }
  
  return items;
}

module.exports = {
  createItem,
  updateItem,
  deleteItem,
  getItem,
  getAll,
  collections // Export for direct access if needed
};
