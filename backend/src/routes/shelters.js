const express = require('express');
const router = express.Router();
const { createItem, updateItem, deleteItem, getAll } = require('../database/memoryStore');
const { getIO } = require('../socket');

// GET /api/shelters - Get all shelters
router.get('/', (req, res) => {
  try {
    const shelters = getAll('shelters');
    res.json(shelters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/shelters - Create a new shelter
router.post('/', (req, res) => {
  try {
    const { name, location, capacity, current, contact } = req.body;
    
    // Validate required fields
    if (!name || !location) {
      return res.status(400).json({ error: 'Missing required fields: name, location' });
    }
    
    const shelterData = {
      name,
      location,
      capacity: capacity || 0,
      current: current || 0,
      contact
    };
    
    const createdShelter = createItem('shelters', shelterData);
    
    // Emit socket event
    const io = getIO();
    io.emit('shelter:created', createdShelter);
    
    res.status(201).json(createdShelter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/shelters/:id - Update a shelter
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedShelter = updateItem('shelters', id, updates);
    
    if (!updatedShelter) {
      return res.status(404).json({ error: 'Shelter not found' });
    }
    
    // Emit socket event
    const io = getIO();
    io.emit('shelter:updated', updatedShelter);
    
    res.json(updatedShelter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/shelters/:id - Delete a shelter
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = deleteItem('shelters', id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Shelter not found' });
    }
    
    // Emit socket event
    const io = getIO();
    io.emit('shelter:deleted', { id });
    
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
