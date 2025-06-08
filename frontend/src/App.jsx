import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import Login from './components/Login'
import SeatBooking from './components/SeatBooking'
import './App.css'

const BACKEND_URL = 'http://192.168.1.47:3000'

function App() {
  const [socket, setSocket] = useState(null)
  const [user, setUser] = useState(null)
  const [seats, setSeats] = useState([])

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(BACKEND_URL)
    setSocket(newSocket)

    // Socket event listeners
    newSocket.on('connect', () => {
      console.log('Connected to server')
    })

    newSocket.on('seatsUpdate', (updatedSeats) => {
      setSeats(updatedSeats)
    })

    // Cleanup on unmount
    return () => {
      newSocket.disconnect()
    }
  }, [])

  return (
    <div className="app-container">
      <header>
        <h1>Ticket Booking System</h1>
        {user && <p className="welcome-message">Welcome, {user.username}!</p>}
      </header>
      
      <main>
        {!user ? (
          <Login setUser={setUser} backendUrl={BACKEND_URL} />
        ) : (
          <SeatBooking 
            socket={socket} 
            user={user} 
            seats={seats} 
          />
        )}
      </main>
      
      <footer>
        <p>&copy; 2023 Ticket Booking System</p>
      </footer>
    </div>
  )
}

export default App
