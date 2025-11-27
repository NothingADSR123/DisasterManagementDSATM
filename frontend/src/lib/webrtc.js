/**
 * WebRTC Peer-to-Peer Sync Module
 * 
 * Implements P2P mesh networking for syncing disaster management data
 * between nearby devices using WebRTC DataChannels.
 * 
 * Features:
 * - Peer-to-peer data synchronization (no central server needed)
 * - Library-optional: Can use simple-peer or native RTCPeerConnection
 * - Syncs help requests, volunteers, and offline queue items
 * - Idempotent updates using id + timestamp + hash
 * - Cross-tab coordination via BroadcastChannel
 * 
 * Configuration:
 * - STUN servers: Free public STUN servers for NAT traversal
 * - Signaling server: Optional WebSocket server for peer discovery
 * 
 * @module webrtc
 */

import { put, get, query, getAll } from './db.js';

/**
 * WebRTC Configuration
 * 
 * STUN Servers: Used for NAT traversal to establish P2P connections
 * These are free public STUN servers - you can add your own
 * 
 * @constant {Object}
 */
const RTC_CONFIG = {
  iceServers: [
    // Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    
    // Additional public STUN servers for redundancy
    { urls: 'stun:stun.stunprotocol.org:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
    
    // TURN server (optional) - requires backend setup
    // Uncomment and configure if you deploy your own TURN server
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'your-username',
    //   credential: 'your-password'
    // }
  ],
  iceCandidatePoolSize: 10
};

/**
 * Signaling Server Configuration
 * 
 * The signaling server helps peers discover each other and exchange
 * connection information (SDP offers/answers and ICE candidates).
 * 
 * Backend Setup Instructions:
 * 1. Install ws: npm install ws
 * 2. Create backend/src/signaling-server.js:
 * 
 *    const WebSocket = require('ws');
 *    const wss = new WebSocket.Server({ port: 8080 });
 *    const peers = new Map();
 *    
 *    wss.on('connection', (ws) => {
 *      const peerId = Math.random().toString(36).substring(7);
 *      peers.set(peerId, ws);
 *      
 *      ws.send(JSON.stringify({ type: 'id', peerId }));
 *      
 *      ws.on('message', (data) => {
 *        const msg = JSON.parse(data);
 *        if (msg.to && peers.has(msg.to)) {
 *          peers.get(msg.to).send(JSON.stringify({
 *            ...msg,
 *            from: peerId
 *          }));
 *        } else if (msg.type === 'broadcast') {
 *          peers.forEach((peer, id) => {
 *            if (id !== peerId) peer.send(JSON.stringify({ ...msg, from: peerId }));
 *          });
 *        }
 *      });
 *      
 *      ws.on('close', () => peers.delete(peerId));
 *    });
 * 
 * 3. Start server: node backend/src/signaling-server.js
 * 
 * @constant {string}
 */
const SIGNALING_SERVER_URL = 'ws://localhost:8080'; // Change to your server URL

/**
 * Stores to sync via P2P
 * @constant {Array<string>}
 */
const SYNC_STORES = ['requests', 'volunteers', 'shelters', 'offlineQueue'];

/**
 * Local peer state
 */
let localPeerId = null;
let signalingSocket = null;
let activePeers = new Map(); // peerId -> peer connection
let discoveryCallbacks = [];

/**
 * BroadcastChannel for cross-tab communication
 */
let broadcastChannel = null;
if (typeof BroadcastChannel !== 'undefined') {
  broadcastChannel = new BroadcastChannel('webrtc-sync');
}

/**
 * Generate unique peer ID
 * @returns {string} Peer ID
 */
function generatePeerId() {
  return `peer-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Log with timestamp
 * @param {...any} args - Log arguments
 */
function log(...args) {
  console.log(`[WebRTC ${new Date().toISOString().substr(11, 8)}]`, ...args);
}

/**
 * Initialize a local peer connection
 * 
 * This creates a WebRTC peer that can send/receive data.
 * Library-optional: Can use simple-peer or native RTCPeerConnection.
 * 
 * @param {boolean} isInitiator - Whether this peer initiates the connection
 * @param {Function} onData - Callback when data is received (data) => void
 * @returns {Object} Peer object with methods
 * 
 * @example
 * const peer = initLocalPeer(true, (data) => {
 *   console.log('Received:', data);
 * });
 * 
 * // To use with simple-peer library (optional):
 * // import SimplePeer from 'simple-peer';
 * // const peer = new SimplePeer({ initiator: isInitiator, config: RTC_CONFIG });
 */
export function initLocalPeer(isInitiator, onData) {
  log(`Creating ${isInitiator ? 'initiator' : 'receiver'} peer`);
  
  // Native RTCPeerConnection implementation
  const pc = new RTCPeerConnection(RTC_CONFIG);
  const dataChannel = isInitiator 
    ? pc.createDataChannel('sync', { ordered: true })
    : null;
  
  let remoteDataChannel = dataChannel;
  
  // Track connection state
  let isConnected = false;
  const signalQueue = [];
  
  /**
   * Handle incoming data channel
   */
  pc.ondatachannel = (event) => {
    log('Data channel received');
    remoteDataChannel = event.channel;
    setupDataChannel(remoteDataChannel);
  };
  
  /**
   * Setup data channel event handlers
   */
  function setupDataChannel(channel) {
    channel.onopen = () => {
      log('Data channel opened');
      isConnected = true;
      
      // Process queued signals
      while (signalQueue.length > 0) {
        const msg = signalQueue.shift();
        channel.send(JSON.stringify(msg));
      }
    };
    
    channel.onclose = () => {
      log('Data channel closed');
      isConnected = false;
    };
    
    channel.onerror = (error) => {
      console.error('Data channel error:', error);
    };
    
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        log('Received data:', data.type || 'unknown');
        
        if (onData) {
          onData(data);
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
  }
  
  // Setup data channel for initiator
  if (dataChannel) {
    setupDataChannel(dataChannel);
  }
  
  /**
   * ICE candidate handling
   */
  const iceCandidates = [];
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      log('ICE candidate generated');
      iceCandidates.push(event.candidate);
    }
  };
  
  /**
   * Connection state monitoring
   */
  pc.onconnectionstatechange = () => {
    log('Connection state:', pc.connectionState);
  };
  
  pc.oniceconnectionstatechange = () => {
    log('ICE connection state:', pc.iceConnectionState);
  };
  
  /**
   * Peer API
   */
  return {
    /**
     * Get the signaling data to send to remote peer
     * @returns {Promise<Object>} Signal data (SDP offer/answer + ICE candidates)
     */
    async signal() {
      try {
        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          // Wait a bit for ICE candidates to be gathered
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          return {
            type: 'offer',
            sdp: pc.localDescription,
            candidates: iceCandidates
          };
        } else {
          // For receiver, answer will be created in connectSignal
          return null;
        }
      } catch (error) {
        console.error('Failed to create signal:', error);
        throw error;
      }
    },
    
    /**
     * Connect using remote peer's signal
     * @param {Object} signal - Remote peer's signal data
     * @returns {Promise<Object>} Answer signal (if receiver)
     */
    async connectSignal(signal) {
      try {
        log('Connecting with signal:', signal.type);
        
        // Set remote description
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        
        // Add ICE candidates
        if (signal.candidates) {
          for (const candidate of signal.candidates) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }
        
        // Create answer if receiver
        if (!isInitiator && signal.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          // Wait for ICE candidates
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          return {
            type: 'answer',
            sdp: pc.localDescription,
            candidates: iceCandidates
          };
        }
        
        return null;
      } catch (error) {
        console.error('Failed to connect signal:', error);
        throw error;
      }
    },
    
    /**
     * Send data to remote peer
     * @param {Object} data - Data to send
     * @returns {boolean} True if sent, false if queued
     */
    send(data) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      
      if (isConnected && remoteDataChannel) {
        try {
          remoteDataChannel.send(message);
          return true;
        } catch (error) {
          console.error('Failed to send data:', error);
          signalQueue.push(data);
          return false;
        }
      } else {
        // Queue message until connected
        signalQueue.push(data);
        return false;
      }
    },
    
    /**
     * Destroy the peer connection
     */
    destroy() {
      log('Destroying peer connection');
      
      if (remoteDataChannel) {
        remoteDataChannel.close();
      }
      
      pc.close();
    },
    
    // Expose underlying peer connection for advanced usage
    _pc: pc,
    _channel: remoteDataChannel
  };
}

/**
 * Connect to signaling server for peer discovery
 * @param {Function} onPeerDiscovered - Callback when peer is discovered
 * @returns {Promise<string>} Local peer ID
 */
export async function startDiscovery(onPeerDiscovered) {
  return new Promise((resolve, reject) => {
    if (localPeerId && signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
      log('Already connected to signaling server');
      resolve(localPeerId);
      return;
    }
    
    log('Connecting to signaling server:', SIGNALING_SERVER_URL);
    
    try {
      signalingSocket = new WebSocket(SIGNALING_SERVER_URL);
      
      signalingSocket.onopen = () => {
        log('Connected to signaling server');
      };
      
      signalingSocket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          switch (msg.type) {
            case 'id':
              localPeerId = msg.peerId;
              log('Received peer ID:', localPeerId);
              resolve(localPeerId);
              break;
              
            case 'peer-discovered':
              log('Peer discovered:', msg.from);
              if (onPeerDiscovered) {
                onPeerDiscovered({ peerId: msg.from, signal: msg.signal });
              }
              break;
              
            case 'signal':
              log('Received signal from:', msg.from);
              handleIncomingSignal(msg.from, msg.signal);
              break;
              
            case 'broadcast':
              log('Received broadcast from:', msg.from);
              if (msg.action === 'discover' && onPeerDiscovered) {
                onPeerDiscovered({ peerId: msg.from });
              }
              break;
              
            default:
              log('Unknown message type:', msg.type);
          }
        } catch (error) {
          console.error('Failed to handle message:', error);
        }
      };
      
      signalingSocket.onerror = (error) => {
        console.error('Signaling socket error:', error);
        reject(error);
      };
      
      signalingSocket.onclose = () => {
        log('Signaling server disconnected');
        localPeerId = null;
      };
      
    } catch (error) {
      console.error('Failed to connect to signaling server:', error);
      
      // Fallback: Generate local peer ID without signaling server
      localPeerId = generatePeerId();
      log('Using local peer ID (no signaling server):', localPeerId);
      resolve(localPeerId);
    }
  });
}

/**
 * Broadcast discovery message to find peers
 */
export function broadcastDiscovery() {
  if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
    signalingSocket.send(JSON.stringify({
      type: 'broadcast',
      action: 'discover',
      peerId: localPeerId
    }));
    log('Broadcast discovery message');
  } else {
    log('Cannot broadcast: signaling server not connected');
  }
}

/**
 * Handle incoming signal from remote peer
 * @param {string} peerId - Remote peer ID
 * @param {Object} signal - Signal data
 */
async function handleIncomingSignal(peerId, signal) {
  let peer = activePeers.get(peerId);
  
  if (!peer) {
    // Create new peer for incoming connection
    peer = initLocalPeer(false, (data) => handlePeerData(peerId, data));
    activePeers.set(peerId, peer);
  }
  
  // Process signal
  const answer = await peer.connectSignal(signal);
  
  // Send answer back if we're the receiver
  if (answer && signalingSocket) {
    signalingSocket.send(JSON.stringify({
      type: 'signal',
      to: peerId,
      signal: answer
    }));
  }
}

/**
 * Sync with a peer
 * 
 * Establishes P2P connection and exchanges data.
 * Uses idempotency: id + timestamp + hash to avoid duplicates.
 * 
 * @param {Object} peerInfo - Peer information
 * @param {string} peerInfo.peerId - Peer ID
 * @param {Object} [peerInfo.signal] - Initial signal (optional)
 * @returns {Promise<Object>} Peer connection object
 * 
 * @example
 * const peer = await syncWithPeer({ peerId: 'peer-123' });
 * peer.send({ type: 'ping' });
 */
export async function syncWithPeer(peerInfo) {
  const { peerId, signal } = peerInfo;
  
  log('Syncing with peer:', peerId);
  
  // Check if already connected
  if (activePeers.has(peerId)) {
    log('Already connected to peer:', peerId);
    return activePeers.get(peerId);
  }
  
  // Create peer connection
  const peer = initLocalPeer(true, (data) => handlePeerData(peerId, data));
  activePeers.set(peerId, peer);
  
  // Exchange signals
  if (signal) {
    // Use provided signal
    await peer.connectSignal(signal);
  } else {
    // Create and send signal via signaling server
    const offerSignal = await peer.signal();
    
    if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
      signalingSocket.send(JSON.stringify({
        type: 'signal',
        to: peerId,
        signal: offerSignal
      }));
    } else {
      log('Cannot send signal: signaling server not connected');
    }
  }
  
  // Start syncing data
  await syncDataWithPeer(peer);
  
  return peer;
}

/**
 * Sync local data with peer
 * Sends recent items from all sync stores
 * @param {Object} peer - Peer connection
 */
async function syncDataWithPeer(peer) {
  try {
    log('Starting data sync');
    
    for (const storeName of SYNC_STORES) {
      const items = await getAll(storeName);
      
      // Send items in batches to avoid overwhelming the connection
      const batchSize = 10;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        
        peer.send({
          type: 'sync',
          store: storeName,
          items: batch
        });
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    log('Data sync complete');
    
  } catch (error) {
    console.error('Failed to sync data:', error);
  }
}

/**
 * Handle incoming data from peer
 * @param {string} peerId - Peer ID
 * @param {Object} data - Received data
 */
async function handlePeerData(peerId, data) {
  try {
    log('Handling data from peer:', peerId, data.type);
    
    switch (data.type) {
      case 'sync':
        await handleSyncData(data.store, data.items);
        break;
        
      case 'update':
        await handleUpdate(data.store, data.item);
        break;
        
      case 'delete':
        await handleDelete(data.store, data.id);
        break;
        
      case 'ping':
        // Respond to ping
        const peer = activePeers.get(peerId);
        if (peer) {
          peer.send({ type: 'pong', timestamp: Date.now() });
        }
        break;
        
      case 'pong':
        log('Received pong from peer:', peerId);
        break;
        
      default:
        log('Unknown data type:', data.type);
    }
    
  } catch (error) {
    console.error('Failed to handle peer data:', error);
  }
}

/**
 * Handle sync data from peer
 * Uses idempotency: only updates if hash differs or timestamp is newer
 * @param {string} storeName - Store name
 * @param {Array} items - Items to sync
 */
async function handleSyncData(storeName, items) {
  log(`Syncing ${items.length} items to ${storeName}`);
  
  for (const item of items) {
    try {
      // Check if item already exists
      const existing = await get(storeName, item.id);
      
      if (!existing) {
        // New item - add it
        await put(storeName, item);
        log(`Added new item: ${item.id}`);
        notifyOtherTabs('sync', storeName, item);
        
      } else if (item.hash !== existing.hash) {
        // Hash differs - check timestamp
        if (item.timestamp > existing.timestamp) {
          // Incoming item is newer - update
          await put(storeName, item);
          log(`Updated item: ${item.id}`);
          notifyOtherTabs('update', storeName, item);
        } else {
          log(`Skipped older item: ${item.id}`);
        }
        
      } else {
        // Same hash - skip
        log(`Skipped duplicate item: ${item.id}`);
      }
      
    } catch (error) {
      console.error(`Failed to sync item ${item.id}:`, error);
    }
  }
}

/**
 * Handle update from peer
 * @param {string} storeName - Store name
 * @param {Object} item - Updated item
 */
async function handleUpdate(storeName, item) {
  await handleSyncData(storeName, [item]);
}

/**
 * Handle delete from peer
 * @param {string} storeName - Store name
 * @param {string} id - Item ID to delete
 */
async function handleDelete(storeName, id) {
  try {
    await deleteRecord(storeName, id);
    log(`Deleted item: ${id}`);
    notifyOtherTabs('delete', storeName, { id });
  } catch (error) {
    console.error(`Failed to delete item ${id}:`, error);
  }
}

/**
 * Notify other tabs via BroadcastChannel
 * @param {string} action - Action type
 * @param {string} storeName - Store name
 * @param {Object} item - Item data
 */
function notifyOtherTabs(action, storeName, item) {
  if (broadcastChannel) {
    broadcastChannel.postMessage({
      type: 'webrtc-sync',
      action,
      storeName,
      item
    });
  }
}

/**
 * Get list of active peers
 * @returns {Array<string>} Array of peer IDs
 */
export function getActivePeers() {
  return Array.from(activePeers.keys());
}

/**
 * Disconnect from a peer
 * @param {string} peerId - Peer ID to disconnect
 */
export function disconnectPeer(peerId) {
  const peer = activePeers.get(peerId);
  if (peer) {
    peer.destroy();
    activePeers.delete(peerId);
    log('Disconnected from peer:', peerId);
  }
}

/**
 * Disconnect from all peers
 */
export function disconnectAll() {
  activePeers.forEach((peer, peerId) => {
    peer.destroy();
  });
  activePeers.clear();
  log('Disconnected from all peers');
}

/**
 * Get local peer ID
 * @returns {string|null} Local peer ID
 */
export function getLocalPeerId() {
  return localPeerId;
}

/**
 * Cleanup resources
 */
export function cleanup() {
  disconnectAll();
  
  if (signalingSocket) {
    signalingSocket.close();
    signalingSocket = null;
  }
  
  if (broadcastChannel) {
    broadcastChannel.close();
  }
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanup);
}

export default {
  initLocalPeer,
  startDiscovery,
  broadcastDiscovery,
  syncWithPeer,
  getActivePeers,
  disconnectPeer,
  disconnectAll,
  getLocalPeerId,
  cleanup
};
