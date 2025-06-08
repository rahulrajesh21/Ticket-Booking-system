import { useState } from 'react'
import './SeatBooking.css'

const SeatBooking = ({ socket, user, seats }) => {
  const [selectedSeat, setSelectedSeat] = useState(null)
  const [notification, setNotification] = useState(null)

  const handleSeatClick = (seat) => {
    if (seat.booked && seat.user !== user.username) {
      // Seat is booked by someone else
      return
    }
    
    setSelectedSeat(seat.id === selectedSeat ? null : seat.id)
  }

  const bookSeat = () => {
    if (!selectedSeat) return
    
    socket.emit('bookSeat', { seatId: selectedSeat, username: user.username })
    
    // Listen for confirmation
    socket.once('bookingSuccess', () => {
      showNotification('Seat booked successfully!', 'success')
      setSelectedSeat(null)
    })
    
    socket.once('bookingError', ({ message }) => {
      showNotification(message, 'error')
    })
  }

  const releaseSeat = () => {
    if (!selectedSeat) return
    
    const seat = seats.find(s => s.id === selectedSeat)
    if (seat && seat.user === user.username) {
      socket.emit('releaseSeat', { seatId: selectedSeat, username: user.username })
      showNotification('Seat released successfully!', 'success')
      setSelectedSeat(null)
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
              className={`seat ${getSeatStatus(seat)} ${selectedSeat === seat.id ? 'selected' : ''}`}
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
          <div className="seat-sample selected"></div>
          <span>Selected</span>
        </div>
      </div>
      
      <div className="actions">
        <button 
          onClick={bookSeat}
          disabled={!selectedSeat || (selectedSeat && seats.find(s => s.id === selectedSeat)?.booked)}
          className="book-btn"
        >
          Book Seat
        </button>
        
        <button 
          onClick={releaseSeat}
          disabled={!selectedSeat || !(selectedSeat && seats.find(s => s.id === selectedSeat)?.user === user.username)}
          className="release-btn"
        >
          Release Seat
        </button>
      </div>
    </div>
  )
}

export default SeatBooking 