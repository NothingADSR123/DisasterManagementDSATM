const express = require('express');
const router = express.Router();
const { createItem, updateItem, deleteItem, getAll } = require('../database/memoryStore');

// GET /api/peers - Get all peers
router.get('/', (req, res) => {
  try {
    const peers = getAll('peers');
    res.json(peers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/peers - Register a new peer
router.post('/', (req, res) => {
  try {
    const { peerId, lastSeenAt, capabilities } = req.body;
    
    // Validate required fields
    if (!peerId) {
      return res.status(400).json({ error: 'Missing required field: peerId' });
    }
    
    const peerData = {
      id: peerId,
      peerId,
      lastSeenAt: lastSeenAt || new Date().toISOString(),
      capabilities: capabilities || {}
    };
    
    const createdPeer = createItem('peers', peerData);
    
    res.status(201).json(createdPeer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/peers/:peerId - Update a peer
router.patch('/:peerId', (req, res) => {
  try {
    const { peerId } = req.params;
    const updates = req.body;
    
    const updatedPeer = updateItem('peers', peerId, updates);
    
    if (!updatedPeer) {
      return res.status(404).json({ error: 'Peer not found' });
    }
    
    res.json(updatedPeer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/peers/:peerId - Delete a peer
router.delete('/:peerId', (req, res) => {
  try {
    const { peerId } = req.params;
    
    const deleted = deleteItem('peers', peerId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Peer not found' });
    }
    
    res.json({ success: true, peerId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
