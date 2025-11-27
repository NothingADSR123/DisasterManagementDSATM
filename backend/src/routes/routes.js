const express = require('express');
const router = express.Router();
const { createItem, getAll } = require('../database/memoryStore');

// GET /api/routes - Get all cached routes with optional filters
router.get('/', (req, res) => {
  try {
    const { from, to } = req.query;
    
    let routes;
    if (from || to) {
      routes = getAll('routes', (item) => {
        let match = true;
        
        if (from) {
          match = match && item.from === from;
        }
        
        if (to) {
          match = match && item.to === to;
        }
        
        return match;
      });
    } else {
      routes = getAll('routes');
    }
    
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/routes - Cache a new route
router.post('/', (req, res) => {
  try {
    const { from, to, geometry, distance, duration } = req.body;
    
    // Validate required fields
    if (!from || !to || !geometry) {
      return res.status(400).json({ error: 'Missing required fields: from, to, geometry' });
    }
    
    const routeData = {
      from,
      to,
      geometry,
      distance,
      duration
    };
    
    const createdRoute = createItem('routes', routeData);
    
    res.status(201).json(createdRoute);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
