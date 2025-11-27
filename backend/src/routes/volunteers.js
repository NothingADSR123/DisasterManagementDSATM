const express = require('express');
const router = express.Router();
const { createItem, updateItem, deleteItem, getAll } = require('../database/memoryStore');
const { getIO } = require('../socket');

// GET /api/volunteers - Get all volunteers or filter by skills/availability
router.get('/', (req, res) => {
  try {
    const { skills, availability } = req.query;
    
    let volunteers;
    if (skills || availability) {
      volunteers = getAll('volunteers', (item) => {
        let match = true;
        
        if (skills && item.skills) {
          const searchSkills = skills.toLowerCase();
          const itemSkills = Array.isArray(item.skills) 
            ? item.skills.join(' ').toLowerCase() 
            : item.skills.toLowerCase();
          match = match && itemSkills.includes(searchSkills);
        }
        
        if (availability && item.availability) {
          match = match && item.availability === availability;
        }
        
        return match;
      });
    } else {
      volunteers = getAll('volunteers');
    }
    
    res.json(volunteers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/volunteers - Create a new volunteer
router.post('/', (req, res) => {
  try {
    const { name, phone, skills, location, availability, clientId } = req.body;
    
    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({ error: 'Missing required fields: name, phone' });
    }
    
    const volunteerData = {
      name,
      phone,
      skills,
      location,
      availability: availability || 'available',
      clientId
    };
    
    const createdVolunteer = createItem('volunteers', volunteerData);
    
    // Emit socket event
    const io = getIO();
    io.emit('volunteer:created', createdVolunteer);
    
    res.status(201).json(createdVolunteer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/volunteers/:id - Update a volunteer
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedVolunteer = updateItem('volunteers', id, updates);
    
    if (!updatedVolunteer) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }
    
    // Emit socket event
    const io = getIO();
    io.emit('volunteer:updated', updatedVolunteer);
    
    res.json(updatedVolunteer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/volunteers/:id - Delete a volunteer
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = deleteItem('volunteers', id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }
    
    // Emit socket event
    const io = getIO();
    io.emit('volunteer:deleted', { id });
    
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
