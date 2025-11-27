const { createItem, updateItem, deleteItem, getAll } = require('../database/memoryStore');

/**
 * Apply client changes from offline queue
 * @param {object} changes - Client changes object with operations
 * @returns {array} Array of operation results
 */
function applyClientChanges(changes) {
  const { clientId, lastSyncAt, operations } = changes;
  const results = [];

  if (!operations || !Array.isArray(operations)) {
    return results;
  }

  for (const operation of operations) {
    const { collection, op, id, data, timestamp } = operation;

    try {
      let result;

      switch (op) {
        case 'create':
          result = createItem(collection, { ...data, clientId });
          results.push({
            success: true,
            op,
            collection,
            id: result.id,
            data: result,
            timestamp
          });
          break;

        case 'update':
          result = updateItem(collection, id, data);
          if (result) {
            results.push({
              success: true,
              op,
              collection,
              id,
              data: result,
              timestamp
            });
          } else {
            results.push({
              success: false,
              op,
              collection,
              id,
              error: 'Item not found',
              timestamp
            });
          }
          break;

        case 'delete':
          const deleted = deleteItem(collection, id);
          results.push({
            success: deleted,
            op,
            collection,
            id,
            error: deleted ? null : 'Item not found',
            timestamp
          });
          break;

        default:
          results.push({
            success: false,
            op,
            collection,
            id,
            error: `Unknown operation: ${op}`,
            timestamp
          });
      }
    } catch (error) {
      results.push({
        success: false,
        op,
        collection,
        id,
        error: error.message,
        timestamp
      });
    }
  }

  return results;
}

/**
 * Get snapshot of all items updated after a given timestamp
 * @param {string} timestamp - ISO timestamp to compare against
 * @returns {object} Snapshot object with all collections
 */
function getSnapshotSince(timestamp) {
  const sinceDate = timestamp ? new Date(timestamp) : new Date(0);
  
  const collections = ['requests', 'volunteers', 'shelters', 'routes', 'peers'];
  const snapshot = {};

  for (const collectionName of collections) {
    snapshot[collectionName] = getAll(collectionName, (item) => {
      const updatedAt = new Date(item.updatedAt || item.createdAt);
      return updatedAt > sinceDate;
    });
  }

  return snapshot;
}

module.exports = {
  applyClientChanges,
  getSnapshotSince
};
