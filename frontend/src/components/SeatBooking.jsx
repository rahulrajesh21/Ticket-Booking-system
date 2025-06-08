import { useState, useEffect } from 'react'
import './SeatBooking.css'

const SeatBooking = ({ socket, user, seats, connectionStatus }) => {
  const [selectedSeat, setSelectedSeat] = useState(null)
  const [notification, setNotification] = useState(null)
  const isConnected = connectionStatus === 'connected'

  // Clear selected seat when seats update (if it's no longer available)
  useEffect(() => {
    if (selectedSeat) {
      const seat = seats.find(s => s.id === selectedSeat)
      if (seat && (seat.locked && seat.user !== user.username && !seat.booked)) {
        setSelectedSeat(null)
        showNotification('The seat you selected is no longer available', 'warning')
      }
    }
  }, [seats, selectedSeat, user.username])

  const handleSeatClick = (seat) => {
    // If not connected, show error
    if (!isConnected) {
      showNotification('Cannot select seats while disconnected from server', 'error')
      return
    }

    // If clicking on a seat that's booked by someone else, do nothing
    if (seat.booked && seat.user !== user.username) {
      return
    }
    
    // If clicking on a seat that's locked by someone else, show warning
    if (seat.locked && seat.user !== user.username && !seat.booked) {
      showNotification('This seat is currently being selected by another user', 'warning')
      return
    }
    
    // If clicking on a seat that's already booked by the current user, select it for potential release
    if (seat.booked && seat.user === user.username) {
      setSelectedSeat(seat.id === selectedSeat ? null : seat.id)
      return
    }
    
    // If selecting a new seat
    if (selectedSeat !== seat.id) {
      // If we had a previous seat selected, release its lock
      if (selectedSeat) {
        const previousSeat = seats.find(s => s.id === selectedSeat)
        if (previousSeat && !previousSeat.booked) {
          socket.emit('releaseLock', { seatId: selectedSeat, username: user.username })
        }
      }
      
      // Lock the new seat if it's not already booked
      if (!seat.booked) {
        socket.emit('lockSeat', { seatId: seat.id, username: user.username })
      }
      setSelectedSeat(seat.id)
    } else {
      // Unselecting the current seat - release lock if it's not booked
      if (!seat.booked) {
        socket.emit('releaseLock', { seatId: seat.id, username: user.username })
      }
      setSelectedSeat(null)
    }
  }

  const bookSeat = () => {
    if (!isConnected) {
      showNotification('Cannot book seats while disconnected from server', 'error')
      return
    }

    if (!selectedSeat) return
    
    socket.emit('bookSeat', { seatId: selectedSeat, username: user.username })
    
    // Listen for confirmation
    socket.once('bookingSuccess', () => {
      showNotification('Seat booked successfully!', 'success')
    })
    
    socket.once('bookingError', ({ message }) => {
      showNotification(message, 'error')
    })
  }

  const releaseSeat = () => {
    if (!isConnected) {
      showNotification('Cannot release seats while disconnected from server', 'error')
      return
    }

    if (!selectedSeat) return
    
    const seat = seats.find(s => s.id === selectedSeat)
    if (seat && seat.user === user.username && seat.booked) {
      socket.emit('releaseSeat', { seatId: selectedSeat, username: user.username })
      
      // Listen for confirmation
      socket.once('releaseSuccess', () => {
        showNotification('Seat released successfully!', 'success')
        setSelectedSeat(null)
      })
      
      socket.once('releaseError', ({ message }) => {
        showNotification(message, 'error')
      })
    } else {
      showNotification('You can only release seats that you have booked', 'error')
    }
  }

  const showNotification = (message, type) => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const getSeatStatus = (seat) => {
    if (seat.booked) {
      return seat.user === user.username ? 'your-seat' : 'booked'
    }
    if (seat.locked) {
      return seat.user === user.username ? 'your-lock' : 'locked'
    }
    return 'available'
  }

  return (
    <div className="seat-booking-container">
      <h2>Select a Seat</h2>
      
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      <div className="seat-map">
        <div className="screen">SCREEN</div>
        <div className="seats-container">
          {seats.map((seat) => (
            <div
              key={seat.id}
              className={`seat ${getSeatStatus(seat)} ${selectedSeat === seat.id ? 'selected' : ''} ${!isConnected ? 'disabled' : ''}`}
              onClick={() => handleSeatClick(seat)}
            >
              {seat.id}
            </div>
          ))}
        </div>
      </div>
      
      <div className="legend">
        <div className="legend-item">
          <div className="seat-sample available"></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="seat-sample booked"></div>
          <span>Booked</span>
        </div>
        <div className="legend-item">
          <div className="seat-sample your-seat"></div>
          <span>Your Seat</span>
        </div>
        <div className="legend-item">
          <div className="seat-sample locked"></div>
          <span>Being Selected</span>
        </div>
        <div className="legend-item">
          <div className="seat-sample your-lock"></div>
          <span>Your Selection</span>
        </div>
        <div className="legend-item">
          <div className="seat-sample selected"></div>
          <span>Selected</span>
        </div>
      </div>
      
      <div className="actions">
        <button 
          onClick={bookSeat}
          disabled={!isConnected || !selectedSeat || (seats.find(s => s.id === selectedSeat)?.booked)}
          className="book-btn"
        >
          Book Seat
        </button>
        
        <button 
          onClick={releaseSeat}
          disabled={!isConnected || !selectedSeat || !(seats.find(s => s.id === selectedSeat)?.user === user.username && seats.find(s => s.id === selectedSeat)?.booked)}
          className="release-btn"
        >
          Release Seat
        </button>
      </div>
    </div>
  )
}

export default SeatBooking 