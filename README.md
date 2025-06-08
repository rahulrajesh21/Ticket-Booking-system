# Real-time Ticket Booking System

A real-time ticket booking system with WebSocket communication between the frontend and backend. The application allows users to book and release seats in real-time without page reloads.

## Features

- Real-time seat booking updates using Socket.IO
- Simple login system (username only)
- Modern UI design
- Concurrent booking handling
- Seat booking and release functionality

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: React, Socket.IO Client, Axios

## Project Structure

```
.
├── backend/             # Node.js server
│   ├── server.js        # Express and Socket.IO server
│   └── package.json     # Backend dependencies
└── frontend/            # React client
    ├── public/          # Static assets
    └── src/             # React source code
        ├── components/  # React components
        │   ├── Login.jsx
        │   └── SeatBooking.jsx
        └── App.jsx      # Main App component
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation & Running

1. **Clone the repository**

```bash
git clone <repository-url>
cd ticket-booking-system
```

2. **Start the backend server**

```bash
cd backend
npm install
npm start
```

The backend server will run on http://localhost:5000.

3. **Start the frontend application**

```bash
cd frontend
npm install
npm run dev
```

The frontend application will run on http://localhost:5173.

4. Open your browser and navigate to http://localhost:5173

