const express = require('express');
const router = express.Router();
const { applyClientChanges, getSnapshotSince } = require('../services/syncService');

// POST /api/sync - Sync client changes and get snapshot
router.post('/', (req, res) => {
  try {
    const changes = req.body;

    // Validate request body
    if (!changes || !changes.clientId) {
      return res.status(400).json({ error: 'Missing required field: clientId' });
    }

    // Apply client changes from offline queue
    const applied = applyClientChanges(changes);

    // Get snapshot of items updated since last sync
    const snapshot = getSnapshotSince(changes.lastSyncAt);

    // Return sync results
    res.json({
      applied,
      snapshot,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
