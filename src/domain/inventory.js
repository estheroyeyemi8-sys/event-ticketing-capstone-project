import { WaitlistQueue } from './waitlistQueue.js';
import { DomainError } from './errors.js';
import { newId, newReference } from './ids.js';

const MAX_TICKETS_PER_BOOKING = 10;

// Validates the customer's name.
function validateCustomerName(customerName) {
  if (typeof customerName !== 'string' || customerName.trim() === '') {
    throw new DomainError('VALIDATION', 'Customer name is required');
  }
}

// Validates ticket quantity.
function validateQuantity(quantity) {
  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_TICKETS_PER_BOOKING
  ) {
    throw new DomainError(
      'VALIDATION',
      `Quantity must be a whole number between 1 and ${MAX_TICKETS_PER_BOOKING}`,
    );
  }
}

// Prevents duplicate booking references.
function createUniqueBookingReference(store) {
  let reference = newReference();

  while (store.bookingsByReference.has(reference)) {
    reference = newReference();
  }

  return reference;
}

// Creates the in-memory data store.
export function createStore() {
  return {
    events: new Map(),
    tiers: new Map(),
    bookings: new Map(),
    bookingsByReference: new Map(),
    waitlists: new Map(),
  };
}

// Creates an event.
export function createEvent(
  store,
  { title, city, venue = '', startsAt, organizerId },
) {
  if (typeof title !== 'string' || title.trim() === '') {
    throw new DomainError('VALIDATION', 'Title is required');
  }

  if (typeof city !== 'string' || city.trim() === '') {
    throw new DomainError('VALIDATION', 'City is required');
  }

  const date = new Date(startsAt);

  if (
  Number.isNaN(date.getTime()) ||
  (typeof startsAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(startsAt) &&
    date.toISOString().slice(0, 10) !== startsAt)
) {
    throw new DomainError('VALIDATION', 'startsAt must be a valid date');
  }

  if (typeof venue !== 'string') {
    throw new DomainError('VALIDATION', 'Venue must be a string');
  }

  const event = {
    id: newId('evt'),
    organizerId,
    title: title.trim(),
    city: city.trim(),
    venue: venue.trim(),
    startsAt: date.toISOString(),
    status: 'draft',
    tierIds: [],
  };

  store.events.set(event.id, event);

  return event;
}

// Creates a ticket tier for an event.
export function addTier(store, eventId, { name, priceCents, capacity }) {
  const event = store.events.get(eventId);

  if (!event) {
    throw new DomainError('NOT_FOUND', 'Event not found');
  }

  if (typeof name !== 'string' || name.trim() === '') {
    throw new DomainError('VALIDATION', 'Tier name is required');
  }

  if (!Number.isInteger(priceCents) || priceCents < 0) {
    throw new DomainError(
      'VALIDATION',
      'priceCents must be a whole number of at least 0',
    );
  }

  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new DomainError(
      'VALIDATION',
      'capacity must be a whole number of at least 1',
    );
  }

  const tier = {
    id: newId('tier'),
    eventId,
    name: name.trim(),
    priceCents,
    capacity,
    sold: 0,
  };

  store.tiers.set(tier.id, tier);
  store.waitlists.set(tier.id, new WaitlistQueue());
  event.tierIds.push(tier.id);

  return tier;
}

// Calculates remaining ticket capacity.
export function seatsLeft(store, tierId) {
  const tier = store.tiers.get(tierId);

  if (!tier) {
    throw new DomainError('NOT_FOUND', 'Ticket tier not found');
  }

  return tier.capacity - tier.sold;
}

// Books tickets for a customer.
// Books tickets for a customer.
export function bookTickets(store, { tierId, customerName, quantity }) {
  const tier = store.tiers.get(tierId);

  if (!tier) {
    throw new DomainError('NOT_FOUND', 'Ticket tier not found');
  }

  validateCustomerName(customerName);
  validateQuantity(quantity);

  const event = store.events.get(tier.eventId);

  if (event.status !== 'published') {
    throw new DomainError(
      'INVALID_STATE',
      'Cannot book tickets for an unpublished event',
    );
  }

  if (seatsLeft(store, tierId) < quantity) {
    throw new DomainError('SOLD_OUT', 'Not enough tickets available');
  }

  const booking = {
    id: newId('bkg'),
    reference: createUniqueBookingReference(store),
    tierId,
    customerName: customerName.trim(),
    quantity,
    amountCents: tier.priceCents * quantity,
    status: 'pending',
  };

  tier.sold += quantity;
  store.bookings.set(booking.id, booking);
  store.bookingsByReference.set(booking.reference, booking.id);

  return booking;
}
// Cancels a booking and releases its tickets.
export function cancelBooking(store, bookingIdentifier) {
  // Accept either the internal booking ID or customer reference.
  const bookingId = store.bookings.has(bookingIdentifier)
    ? bookingIdentifier
    : store.bookingsByReference.get(bookingIdentifier);

  const booking = bookingId
    ? store.bookings.get(bookingId)
    : undefined;

  if (!booking) {
    throw new DomainError('NOT_FOUND', 'Booking not found');
  }

  if (!['confirmed', 'pending'].includes(booking.status)) {
    throw new DomainError(
      'ALREADY_CANCELLED',
      'Booking is not in a cancellable state',
    );
  }

  const tier = store.tiers.get(booking.tierId);

  if (!tier) {
    throw new DomainError('NOT_FOUND', 'Ticket tier not found');
  }

  tier.sold -= booking.quantity;
  booking.status = 'cancelled';

  // Waitlist offers are handled separately.
  return booking;
}

// Adds a customer to a tier's FIFO waitlist.
export function joinWaitlist(store, { tierId, customerName, quantity }) {
  const tier = store.tiers.get(tierId);

  if (!tier) {
    throw new DomainError('NOT_FOUND', 'Ticket tier not found');
  }

  validateCustomerName(customerName);
  validateQuantity(quantity);

  if (seatsLeft(store, tierId) >= quantity) {
    throw new DomainError(
      'WAITLIST_NOT_NEEDED',
      'There are enough tickets available to book directly',
    );
  }

  const waitlist = store.waitlists.get(tierId);

  const entry = {
    customerName: customerName.trim(),
    tierId,
    quantity,
  };

  waitlist.enqueue(entry);

  return entry;
}

// Offers released tickets to the first eligible person in the queue.
export function offerNextOnWaitlist(store, tierId) {
  const tier = store.tiers.get(tierId);

  if (!tier) {
    throw new DomainError('NOT_FOUND', 'Ticket tier not found');
  }

  const waitlist = store.waitlists.get(tierId);
  const nextEntry = waitlist.peek();

  // Strict FIFO: never skip the person at the front.
  if (!nextEntry || seatsLeft(store, tierId) < nextEntry.quantity) {
    return undefined;
  }

  return waitlist.dequeue();
}

// Finds a booking using its customer-facing reference.
export function findBookingByReference(store, reference) {
  const bookingId = store.bookingsByReference.get(reference);

  if (!bookingId) {
    throw new DomainError('NOT_FOUND', 'Booking not found');
  }

  return store.bookings.get(bookingId);
}


// Publishes an event that has at least one ticket tier.
export function publishEvent(store, eventId) {
  const event = store.events.get(eventId);

  if (!event) {
    throw new DomainError('NOT_FOUND', 'Event not found');
  }

  if (event.tierIds.length === 0) {
    throw new DomainError(
      'INVALID_STATE',
      'An event must have at least one ticket tier before publishing',
    );
  }

  event.status = 'published';

  return event;
}

// Creates summaries for searching and displaying events.
export function listEventSummaries(
  store,
  { publishedOnly = true } = {},
) {
  const summaries = [];

  for (const event of store.events.values()) {
    if (publishedOnly && event.status !== 'published') {
      continue;
    }

    const tiers = event.tierIds.map((tierId) =>
      store.tiers.get(tierId),
    );

    const prices = tiers.map((tier) => tier.priceCents);
    const totalSeatsLeft = tiers.reduce(
      (total, tier) => total + tier.capacity - tier.sold,
      0,
    );

    summaries.push({
      id: event.id,
      title: event.title,
      city: event.city,
      venue: event.venue,
      startsAt: event.startsAt,
      cheapestPriceCents: prices.length > 0
        ? Math.min(...prices)
        : null,
      seatsLeft: totalSeatsLeft,
    });
  }

  return summaries;
}