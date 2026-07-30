import { useState, useEffect, useCallback } from 'react';
import EventTypeSelector from './components/EventTypeSelector';
import DatePicker from './components/DatePicker';
import FreeSlots from './components/FreeSlots';
import BookingForm from './components/BookingForm';
import BookingsList from './components/BookingsList';
import * as api from './api';
import './App.css';

const OWNER_ID = 'owner-1';

export default function App() {
  const [eventTypes, setEventTypes] = useState([]);
  const [eventTypeId, setEventTypeId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [freeSlots, setFreeSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [error, setError] = useState(null);
  const [loadingFree, setLoadingFree] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    api.getEventTypes(OWNER_ID)
      .then(types => {
        setEventTypes(types);
        if (types.length > 0) setEventTypeId(types[0].id);
      })
      .catch(() => setEventTypes([]));
  }, []);

  const loadData = useCallback(() => {
    if (!eventTypeId || !date) return;
    setLoadingFree(true);
    setError(null);
    api.getFreeSlots(OWNER_ID, date, eventTypeId)
      .then(setFreeSlots)
      .catch(e => setError(e.message))
      .finally(() => setLoadingFree(false));

    setLoadingBookings(true);
    api.getOwnerSlots(OWNER_ID, date)
      .then(setBookings)
      .catch(() => {})
      .finally(() => setLoadingBookings(false));
  }, [eventTypeId, date]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleBook = async ({ eventTypeId, guestName, guestEmail, startTime }) => {
    setBookingLoading(true);
    setError(null);
    try {
      await api.createSlot({ eventTypeId, guestName, guestEmail, startTime });
      setSelectedSlot(null);
      loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancel = async slotId => {
    try {
      await api.cancelSlot(slotId);
      loadData();
    } catch (e) {
      setError(e.message);
    }
  };

  const selectedEventType = eventTypes.find(et => et.id === eventTypeId);

  return (
    <div className="app">
      <h1>Time Slot Booking</h1>

      <div className="controls">
        <EventTypeSelector
          eventTypes={eventTypes}
          value={eventTypeId}
          onChange={setEventTypeId}
        />
        <DatePicker value={date} onChange={setDate} />
        <button onClick={loadData} className="primary">Refresh</button>
      </div>

      {error && <div className="error">{error}</div>}

      {selectedEventType && (
        <div className="info">
          Selected: {selectedEventType.name} ({selectedEventType.duration} min)
        </div>
      )}

      <div className="columns">
        <FreeSlots slots={freeSlots} onBook={setSelectedSlot} loading={loadingFree} />
        <BookingsList slots={bookings} onCancel={handleCancel} loading={loadingBookings} />
      </div>

      {selectedSlot && (
        <BookingForm
          selectedSlot={selectedSlot}
          eventTypeId={eventTypeId}
          onConfirm={handleBook}
          onCancel={() => setSelectedSlot(null)}
          loading={bookingLoading}
        />
      )}
    </div>
  );
}
