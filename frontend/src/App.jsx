import { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import Login from './components/Login'
import SeatBooking from './components/SeatBooking'
import './App.css'

const BACKEND_URL = 'http://192.168.1.47:3000'

function App() {
  const [socket, setSocket] = useState(null)
  const [user, setUser] = useState(null)
  const [seats, setSeats] = useState([])
  const [connectionStatus, setConnectionStatus] = useState('connecting')

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(BACKEND_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
    setSocket(newSocket)

    // Socket event listeners
    newSocket.on('connect', () => {
      console.log('Connected to server')
      setConnectionStatus('connected')
      
      // Re-associate user with socket if reconnecting
      if (user) {
        newSocket.emit('associateUser', { username: user.username })
      }
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnectionStatus('disconnected')
    })

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      setConnectionStatus('error')
    })

    newSocket.on('seatsUpdate', (updatedSeats) => {
      setSeats(updatedSeats)
    })

    // Cleanup on unmount
    return () => {
      newSocket.disconnect()
    }
  }, [user?.username]) // Re-initialize socket when username changes

  // Associate user with socket when user logs in
  useEffect(() => {
    if (socket && user && socket.connected) {
      socket.emit('associateUser', { username: user.username })
    }
  }, [socket, user])

  // Handle setting the user
  const handleSetUser = useCallback((userData) => {
    setUser(userData)
    // We'll associate the user with their socket in the useEffect above
  }, [])

  return (
    <div className="app-container">
      <header>
        <h1>Ticket Booking System</h1>
        <div className="header-right">
          {connectionStatus !== 'connected' && (
            <div className="connection-status">
              {connectionStatus === 'disconnected' && 'Disconnected from server'}
              {connectionStatus === 'connecting' && 'Connecting...'}
              {connectionStatus === 'error' && 'Connection error'}
            </div>
          )}
          {user && <p className="welcome-message">Welcome, {user.username}!</p>}
        </div>
      </header>
      
      <main>
        {!user ? (
          <Login setUser={handleSetUser} backendUrl={BACKEND_URL} />
        ) : (
          <SeatBooking 
            socket={socket} 
            user={user} 
            seats={seats} 
            connectionStatus={connectionStatus}
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
