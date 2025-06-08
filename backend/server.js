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
const seats = Array(50).fill().map((_, index) => ({
  id: index + 1,
  booked: false,
  user: null
}));

// API routes
app.get('/api/seats', (req, res) => {
  res.json(seats);
});

app.post('/api/login', (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  // Simple login without password
  users[username] = { username };
  
  res.json({ username });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Send current seats data to the newly connected client
  socket.emit('seatsUpdate', seats);
  
  // Handle seat booking
  socket.on('bookSeat', ({ seatId, username }) => {
    const seatIndex = seats.findIndex(seat => seat.id === seatId);
    
    if (seatIndex !== -1) {
      // Check if seat is already booked
      if (seats[seatIndex].booked) {
        socket.emit('bookingError', { message: 'Seat already booked' });
        return;
      }
      
      // Book the seat
      seats[seatIndex].booked = true;
      seats[seatIndex].user = username;
      
      // Broadcast updated seats to all clients
      io.emit('seatsUpdate', seats);
      
      // Confirm booking to the user who booked
      socket.emit('bookingSuccess', { seatId });
      
      console.log(`Seat ${seatId} booked by ${username}`);
    }
  });
  
  // Handle seat release
  socket.on('releaseSeat', ({ seatId, username }) => {
    const seatIndex = seats.findIndex(seat => seat.id === seatId);
    
    if (seatIndex !== -1 && seats[seatIndex].user === username) {
      // Release the seat
      seats[seatIndex].booked = false;
      seats[seatIndex].user = null;
      
      // Broadcast updated seats to all clients
      io.emit('seatsUpdate', seats);
      
      console.log(`Seat ${seatId} released by ${username}`);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 