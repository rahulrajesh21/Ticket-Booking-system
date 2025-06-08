const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store users and seats data
const users = {};
const activeUsernames = new Set();
const seats = Array(50).fill().map((_, index) => ({
  id: index + 1,
  booked: false,
  user: null,
  locked: false,
  lockTimestamp: null,
  lockSocketId: null
}));

// Lock timeout in milliseconds (30 seconds)
const LOCK_TIMEOUT = 30000;

// Function to lock a seat
function lockSeat(seatIndex, socketId, username) {
  if (seats[seatIndex].locked && seats[seatIndex].lockSocketId !== socketId) {
    return false;
  }
  
  if (seats[seatIndex].booked) {
    return false;
  }
  
  seats[seatIndex].locked = true;
  seats[seatIndex].lockSocketId = socketId;
  seats[seatIndex].user = username;
  seats[seatIndex].lockTimestamp = Date.now();
  
  // Auto-release lock after timeout
  setTimeout(() => {
    if (seats[seatIndex].locked && seats[seatIndex].lockSocketId === socketId && !seats[seatIndex].booked) {
      seats[seatIndex].locked = false;
      seats[seatIndex].lockSocketId = null;
      if (!seats[seatIndex].booked) {
        seats[seatIndex].user = null;
      }
      seats[seatIndex].lockTimestamp = null;
      io.emit('seatsUpdate', seats.map(seat => ({
        id: seat.id,
        booked: seat.booked,
        user: seat.user,
        locked: seat.locked
      })));
    }
  }, LOCK_TIMEOUT);
  
  return true;
}

// Function to release a seat lock
function releaseSeatLock(seatIndex, socketId) {
  if (seats[seatIndex].lockSocketId === socketId && !seats[seatIndex].booked) {
    seats[seatIndex].locked = false;
    seats[seatIndex].lockSocketId = null;
    seats[seatIndex].user = null;
    seats[seatIndex].lockTimestamp = null;
    return true;
  }
  return false;
}

// API routes
app.get('/api/seats', (req, res) => {
  // Send only necessary data to clients
  const clientSeats = seats.map(seat => ({
    id: seat.id,
    booked: seat.booked,
    user: seat.user,
    locked: seat.locked
  }));
  res.json(clientSeats);
});

app.post('/api/login', (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  // Check if username is already in use
  if (activeUsernames.has(username)) {
    return res.status(409).json({ error: 'Username already in use. Please choose a different name.' });
  }
  
  // Simple login without password
  users[username] = { username, socketId: null };
  activeUsernames.add(username);
  
  res.json({ username });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  let currentUser = null;
  
  // Associate socket with username
  socket.on('associateUser', ({ username }) => {
    if (username && users[username]) {
      users[username].socketId = socket.id;
      currentUser = username;
      console.log(`Socket ${socket.id} associated with user ${username}`);
    }
  });
  
  // Send current seats data to the newly connected client
  socket.emit('seatsUpdate', seats.map(seat => ({
    id: seat.id,
    booked: seat.booked,
    user: seat.user,
    locked: seat.locked
  })));
  
  // Handle explicit seat locking (when user selects a seat)
  socket.on('lockSeat', ({ seatId, username }) => {
    const seatIndex = seats.findIndex(seat => seat.id === seatId);
    
    if (seatIndex !== -1) {
      // Check if seat is already booked
      if (seats[seatIndex].booked) {
        socket.emit('lockingError', { message: 'Seat already booked' });
        return;
      }
      
      // Check if seat is locked by another user
      if (seats[seatIndex].locked && seats[seatIndex].lockSocketId !== socket.id) {
        socket.emit('lockingError', { message: 'Seat is currently being selected by another user' });
        return;
      }
      
      // Try to lock the seat
      if (lockSeat(seatIndex, socket.id, username)) {
        // Notify all clients about the lock
        io.emit('seatsUpdate', seats.map(seat => ({
          id: seat.id,
          booked: seat.booked,
          user: seat.user,
          locked: seat.locked
        })));
        
        console.log(`Seat ${seatId} locked by ${username}`);
      } else {
        socket.emit('lockingError', { message: 'Failed to lock seat, please try again' });
      }
    }
  });
  
  // Handle explicit lock release (when user deselects a seat)
  socket.on('releaseLock', ({ seatId, username }) => {
    const seatIndex = seats.findIndex(seat => seat.id === seatId);
    
    if (seatIndex !== -1 && seats[seatIndex].user === username && !seats[seatIndex].booked) {
      if (releaseSeatLock(seatIndex, socket.id)) {
        // Notify all clients about the lock release
        io.emit('seatsUpdate', seats.map(seat => ({
          id: seat.id,
          booked: seat.booked,
          user: seat.user,
          locked: seat.locked
        })));
        
        console.log(`Lock on seat ${seatId} released by ${username}`);
      }
    }
  });
  
  // Handle seat booking
  socket.on('bookSeat', ({ seatId, username }) => {
    const seatIndex = seats.findIndex(seat => seat.id === seatId);
    
    if (seatIndex !== -1) {
      // Check if seat is already booked
      if (seats[seatIndex].booked) {
        socket.emit('bookingError', { message: 'Seat already booked' });
        return;
      }
      
      // Check if seat is locked by another user
      if (seats[seatIndex].locked && seats[seatIndex].lockSocketId !== socket.id) {
        socket.emit('bookingError', { message: 'Seat is currently being selected by another user' });
        return;
      }
      
      // Book the seat
      seats[seatIndex].booked = true;
      seats[seatIndex].user = username;
      
      // Keep the lock to prevent others from taking it, but mark as booked
      // The lock will be visually hidden by the UI since the seat is now booked
      
      // Broadcast updated seats to all clients
      io.emit('seatsUpdate', seats.map(seat => ({
        id: seat.id,
        booked: seat.booked,
        user: seat.user,
        locked: seat.locked
      })));
      
      // Confirm booking to the user who booked
      socket.emit('bookingSuccess', { seatId });
      
      console.log(`Seat ${seatId} booked by ${username}`);
    }
  });
  
  // Handle seat release
  socket.on('releaseSeat', ({ seatId, username }) => {
    const seatIndex = seats.findIndex(seat => seat.id === seatId);
    
    if (seatIndex !== -1) {
      // Check if seat is booked by this user
      if (seats[seatIndex].user !== username || !seats[seatIndex].booked) {
        socket.emit('releaseError', { message: 'You can only release seats that you have booked' });
        return;
      }
      
      // Release the seat
      seats[seatIndex].booked = false;
      seats[seatIndex].locked = false;
      seats[seatIndex].lockSocketId = null;
      seats[seatIndex].user = null;
      
      // Broadcast updated seats to all clients
      io.emit('seatsUpdate', seats.map(seat => ({
        id: seat.id,
        booked: seat.booked,
        user: seat.user,
        locked: seat.locked
      })));
      
      // Confirm release to the user
      socket.emit('releaseSuccess', { seatId });
      
      console.log(`Seat ${seatId} released by ${username}`);
    } else {
      socket.emit('releaseError', { message: 'Seat not found' });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Release any locks held by this socket
    seats.forEach((seat, index) => {
      if (seat.locked && seat.lockSocketId === socket.id && !seat.booked) {
        releaseSeatLock(index, socket.id);
      }
    });
    
    // Remove username from active users if this socket was associated with a user
    if (currentUser) {
      // Check if the user has any booked seats before removing
      const hasBookedSeats = seats.some(seat => seat.user === currentUser && seat.booked);
      
      if (!hasBookedSeats) {
        activeUsernames.delete(currentUser);
        if (users[currentUser]) {
          users[currentUser].socketId = null;
        }
        console.log(`User ${currentUser} disconnected and removed from active users`);
      } else {
        // Keep the username active if they have booked seats
        console.log(`User ${currentUser} disconnected but kept active due to booked seats`);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 