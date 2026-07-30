export default function EventTypeSelector({ eventTypes, value, onChange }) {
  return (
    <div className="field">
      <label>Event Type</label>
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="">-- Select --</option>
        {eventTypes.map(et => (
          <option key={et.id} value={et.id}>
            {et.name} ({et.duration} min
            {et.bufferMinutes ? ` + ${et.bufferMinutes} buffer` : ''})
          </option>
        ))}
      </select>
    </div>
  );
}
