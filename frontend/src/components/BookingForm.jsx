import { useState } from 'react';

export default function BookingForm({ selectedSlot, eventTypeId, onConfirm, onCancel, loading }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  if (!selectedSlot) return null;

  const handleSubmit = e => {
    e.preventDefault();
    onConfirm({
      eventTypeId,
      guestName: name,
      guestEmail: email,
      startTime: selectedSlot.startTime,
    });
  };

  const start = new Date(selectedSlot.startTime);
  const end = new Date(selectedSlot.endTime);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Book a Slot</h3>
        <p>
          {start.toLocaleDateString()} {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
          {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Your Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
            <button type="button" className="secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
