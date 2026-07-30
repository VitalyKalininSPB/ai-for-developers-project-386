export default function DatePicker({ value, onChange }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="field">
      <label>Date</label>
      <input
        type="date"
        value={value}
        min={today}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
