const express = require('express');
const router = express.Router();
const { createItem, updateItem, deleteItem, getAll } = require('../database/memoryStore');
const { getIO } = require('../socket');

// GET /api/requests - Get all requests or filter by status
router.get('/', (req, res) => {
  try {
    const { status } = req.query;
    
    let requests;
    if (status) {
      requests = getAll('requests', (item) => item.status === status);
    } else {
      requests = getAll('requests');
    }
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/requests - Create a new request
router.post('/', (req, res) => {
  try {
    const { type, location, name, phone, details, clientId } = req.body;
    
    // Validate required fields
    if (!type || !location || !name) {
      return res.status(400).json({ error: 'Missing required fields: type, location, name' });
    }
    
    const requestData = {
      type,
      location,
      name,
      phone,
      details,
      clientId,
      status: 'pending'
    };
    
    const createdRequest = createItem('requests', requestData);
    
    // Emit socket event
    const io = getIO();
    io.emit('request:created', createdRequest);
    
    res.status(201).json(createdRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/requests/:id - Update a request
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedRequest = updateItem('requests', id, updates);
    
    if (!updatedRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Emit socket event
    const io = getIO();
    io.emit('request:updated', updatedRequest);
    
    res.json(updatedRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/requests/:id - Delete a request
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = deleteItem('requests', id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Emit socket event
    const io = getIO();
    io.emit('request:deleted', { id });
    
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
