export interface WorkingHours {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface EventType {
  id: string;
  ownerId: string;
  name: string;
  duration: number;
  description?: string;
  bufferMinutes?: number;
}

export interface Guest {
  id: string;
  name: string;
  email: string;
}

export type BookingStatus = 'confirmed' | 'cancelled';

export interface Slot {
  id: string;
  eventTypeId: string;
  guestId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  createdAt: string;
}

export interface TimeInterval {
  startTime: string;
  endTime: string;
}

export interface CreateSlotInput {
  eventTypeId: string;
  guestName: string;
  guestEmail: string;
  startTime: string;
}
