export default function BookingsList({ slots, onCancel, loading }) {
  if (loading) return <p className="muted">Loading bookings...</p>;
  if (!slots.length) return <p className="muted">No bookings for this day</p>;

  const formatTime = iso => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bookings">
      <h3>Bookings</h3>
      <ul>
        {slots.map(s => (
          <li key={s.id} className={s.status === 'cancelled' ? 'cancelled' : ''}>
            <span>
              {formatTime(s.startTime)} – {formatTime(s.endTime)}{' '}
              <span className="badge">{s.status}</span>
            </span>
            {s.status === 'confirmed' && (
              <button className="small" onClick={() => onCancel(s.id)}>
                Cancel
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
