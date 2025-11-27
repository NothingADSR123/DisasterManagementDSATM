const { Server } = require('socket.io');

let io;
// Presence map: socketId -> { clientId, connectedAt }
const presenceMap = new Map();

function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle client identification
    socket.on('identify', ({ clientId }) => {
      console.log('Client identified:', clientId, 'Socket:', socket.id);
      presenceMap.set(socket.id, {
        clientId,
        connectedAt: new Date().toISOString()
      });
      
      // Broadcast client connection
      io.emit('client:connected', {
        clientId,
        socketId: socket.id,
        connectedAt: presenceMap.get(socket.id).connectedAt
      });
    });

    // Handle room joining
    socket.on('joinRoom', (roomName) => {
      console.log('Socket', socket.id, 'joining room:', roomName);
      socket.join(roomName);
      
      // Notify room members
      socket.to(roomName).emit('user:joined', {
        socketId: socket.id,
        room: roomName
      });
    });

    // Legacy join handler for backward compatibility
    socket.on('join', (data) => {
      console.log('Socket joined:', data);
      socket.join(data.room || 'default');
    });

    // Legacy event handlers
    socket.on('request:created', (data) => {
      console.log('Request created:', data);
      io.emit('request:created', data);
    });

    socket.on('volunteer:created', (data) => {
      console.log('Volunteer created:', data);
      io.emit('volunteer:created', data);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      const presence = presenceMap.get(socket.id);
      if (presence) {
        const { clientId } = presence;
        
        // Remove from presence map
        presenceMap.delete(socket.id);
        
        // Broadcast disconnection
        io.emit('client:disconnected', {
          clientId,
          socketId: socket.id,
          disconnectedAt: new Date().toISOString()
        });
        
        console.log('Client removed from presence:', clientId);
      }
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

/**
 * Broadcast an event to all connected clients
 * @param {string} eventName - Name of the event
 * @param {object} payload - Data to send
 */
function broadcastEvent(eventName, payload) {
  if (!io) {
    console.warn('Socket.io not initialized, cannot broadcast event:', eventName);
    return;
  }
  io.emit(eventName, payload);
}

/**
 * Get current presence information
 * @returns {Array} Array of connected clients
 */
function getPresence() {
  return Array.from(presenceMap.entries()).map(([socketId, data]) => ({
    socketId,
    ...data
  }));
}

module.exports = { 
  initSocketServer, 
  getIO, 
  broadcastEvent,
  getPresence
};
