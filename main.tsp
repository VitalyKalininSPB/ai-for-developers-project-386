import "@typespec/http";
import "@typespec/rest";
import "@typespec/calendar";

using TypeSpec.Http;

/** Represents a day of week with time ranges */
model WorkingHours {
  dayOfWeek: WeekDay;
  startTime: utcTime;
  endTime: utcTime;
}

/** Owner of the calendar */
model Owner {
  id: string;
  name: string;
  /** Standard working hours per week */
  workingHours: WorkingHours[];
  timezone: string;
}

/** Type of bookable event */
model EventType {
  id: string;
  ownerId: string;
  name: string;
  /** Duration in minutes */
  duration: int32;
  description?: string;
  /** Buffer between events in minutes */
  bufferMinutes?: int32 = 0;
}

/** Guest who books a slot */
model Guest {
  id: string;
  name: string;
  email: string;
}

/** Booking status */
enum BookingStatus {
  confirmed,
  cancelled,
}

/** A booked time slot */
model Slot {
  id: string;
  eventTypeId: string;
  guestId: string;
  /** Slot start time (UTC) */
  startTime: utcDateTime;
  /** Slot end time (UTC) — computed as startTime + eventType.duration */
  endTime: utcDateTime;
  status: BookingStatus;
  createdAt: utcDateTime;
}
