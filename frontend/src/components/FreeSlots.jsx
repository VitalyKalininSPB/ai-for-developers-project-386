function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function FreeSlots({ slots, onBook, loading }) {
  if (loading) return <p className="muted">Loading free slots...</p>;
  if (!slots.length) return <p className="muted">No free slots available</p>;

  return (
    <div className="slots-grid">
      <h3>Available Slots</h3>
      <div className="slot-list">
        {slots.map((s, i) => (
          <button key={i} className="slot-btn" onClick={() => onBook(s)}>
            {formatTime(s.startTime)} – {formatTime(s.endTime)}
          </button>
        ))}
      </div>
    </div>
  );
}
