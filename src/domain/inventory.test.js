import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStore,
  createEvent,
  addTier,
  publishEvent,
  listEventSummaries,
  seatsLeft,
  bookTickets,
  cancelBooking,
  findBookingByReference,
  joinWaitlist,
  offerNextOnWaitlist,
} from './inventory.js';

function makeStore(capacity = 10, shouldPublish = true) {
  const store = createStore();

  const event = createEvent(store, {
    title: 'Tech Night',
    city: 'Lagos',
    startsAt: '2027-03-21T10:00:00Z',
    organizerId: 'org_1',
  });

  const tier = addTier(store, event.id, {
    name: 'Regular',
    priceCents: 500000,
    capacity,
  });

  if (shouldPublish) {
    publishEvent(store, event.id);
  }

  return { store, event, tier };
}

// S02: Create event

test('createStore creates empty Map collections', () => {
  const store = createStore();

  assert.ok(store.events instanceof Map);
  assert.ok(store.tiers instanceof Map);
  assert.ok(store.bookings instanceof Map);
  assert.ok(store.bookingsByReference instanceof Map);
  assert.ok(store.waitlists instanceof Map);

  assert.equal(store.events.size, 0);
  assert.equal(store.bookings.size, 0);
});

test('createEvent creates and stores a draft event', () => {
  const { store, event } = makeStore(10, false);

  assert.equal(event.title, 'Tech Night');
  assert.equal(event.city, 'Lagos');
  assert.equal(event.status, 'draft');
  assert.ok(event.id.startsWith('evt_'));
  assert.equal(event.tierIds.length, 1);
  assert.equal(store.events.get(event.id), event);
});

test('createEvent rejects invalid required fields', () => {
  const store = createStore();

  assert.throws(
    () => createEvent(store, {
      title: ' ',
      city: 'Lagos',
      startsAt: '2027-03-21T10:00:00Z',
    }),
    { code: 'VALIDATION' },
  );

  assert.throws(
    () => createEvent(store, {
      title: 'Tech Night',
      city: 'Lagos',
      startsAt: 'not-a-date',
    }),
    { code: 'VALIDATION' },
  );

  assert.throws(
    () => createEvent(store, {
      title: 'Tech Night',
      city: 'Lagos',
      startsAt: '2026-02-30',
    }),
    { code: 'VALIDATION' },
  );

  assert.throws(
    () => createEvent(store, {
      title: 'Tech Night',
      city: ' ',
      startsAt: '2027-03-21T10:00:00Z',
    }),
    { code: 'VALIDATION' },
  );

  assert.throws(
    () => createEvent(store, {
      title: 'Tech Night',
      city: 'Lagos',
    }),
    { code: 'VALIDATION' },
  );

  assert.equal(store.events.size, 0);
});

// S03: Add ticket tier

test('addTier creates a tier and an empty waitlist', () => {
  const { store, tier, event } = makeStore(100);

  assert.equal(tier.name, 'Regular');
  assert.equal(tier.priceCents, 500000);
  assert.equal(tier.capacity, 100);
  assert.equal(tier.sold, 0);
  assert.equal(seatsLeft(store, tier.id), 100);
  assert.equal(store.tiers.get(tier.id), tier);
  assert.ok(event.tierIds.includes(tier.id));
  assert.equal(store.waitlists.get(tier.id).size(), 0);
});

test('addTier rejects an unknown event', () => {
  const { store } = makeStore();

  assert.throws(
    () => addTier(store, 'missing-event', {
      name: 'Regular',
      priceCents: 500000,
      capacity: 10,
    }),
    { code: 'NOT_FOUND' },
  );
});

test('addTier rejects a fractional price', () => {
  const { store, event } = makeStore();
  const initialTierCount = store.tiers.size;

  assert.throws(
    () => addTier(store, event.id, {
      name: 'VIP',
      priceCents: 500000.5,
      capacity: 10,
    }),
    { code: 'VALIDATION' },
  );

  assert.equal(store.tiers.size, initialTierCount);
});

test('addTier rejects a capacity below one', () => {
  const { store, event } = makeStore();
  const initialTierCount = store.tiers.size;

  assert.throws(
    () => addTier(store, event.id, {
      name: 'VIP',
      priceCents: 500000,
      capacity: 0,
    }),
    { code: 'VALIDATION' },
  );

  assert.equal(store.tiers.size, initialTierCount);
});

// S04: Publish event

test('publishEvent publishes an event with at least one ticket tier', () => {
  const { store, event } = makeStore(10, false);

  const publishedEvent = publishEvent(store, event.id);

  assert.equal(publishedEvent.status, 'published');
  assert.equal(store.events.get(event.id).status, 'published');
});

test('publishEvent rejects an event that does not exist', () => {
  const store = createStore();

  assert.throws(
    () => publishEvent(store, 'missing-event'),
    { code: 'NOT_FOUND' },
  );
});

test('publishEvent rejects an event without ticket tiers', () => {
  const store = createStore();

  const event = createEvent(store, {
    title: 'No Tickets Event',
    city: 'Lagos',
    startsAt: '2027-03-21T10:00:00Z',
    organizerId: 'org_1',
  });

  assert.throws(
    () => publishEvent(store, event.id),
    { code: 'INVALID_STATE' },
  );

  assert.equal(event.status, 'draft');
});

test('listEventSummaries excludes draft events by default', () => {
  const { store } = makeStore(10, false);

  assert.deepEqual(listEventSummaries(store), []);
});

test('listEventSummaries includes published event summaries', () => {
  const { store, event, tier } = makeStore(100);

  const summaries = listEventSummaries(store);

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].id, event.id);
  assert.equal(summaries[0].title, 'Tech Night');
  assert.equal(summaries[0].city, 'Lagos');
  assert.equal(summaries[0].cheapestPriceCents, 500000);
  assert.equal(summaries[0].seatsLeft, 100);

  assert.equal(tier.sold, 0);
});

test('listEventSummaries can include draft events when requested', () => {
  const { store, event } = makeStore(10, false);

  const summaries = listEventSummaries(store, {
    publishedOnly: false,
  });

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].id, event.id);
});

// S06: Booking and inventory

test('seatsLeft returns remaining capacity', () => {
  const { store, tier } = makeStore(50);

  tier.sold = 12;

  assert.equal(seatsLeft(store, tier.id), 38);
});

test('bookTickets creates a pending booking and reduces available seats', () => {
  const { store, tier } = makeStore(50);

  const booking = bookTickets(store, {
    tierId: tier.id,
    customerName: 'Ada',
    quantity: 2,
  });

  assert.equal(booking.quantity, 2);
  assert.equal(booking.customerName, 'Ada');
  assert.equal(booking.amountCents, 1000000);
  assert.equal(booking.status, 'pending');
  assert.match(booking.reference, /^EVT-[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(tier.sold, 2);
  assert.equal(seatsLeft(store, tier.id), 48);
  assert.equal(findBookingByReference(store, booking.reference), booking);
});

test('bookTickets rejects bookings for unpublished events', () => {
  const { store, event, tier } = makeStore(3, false);

  assert.throws(
    () => bookTickets(store, {
      tierId: tier.id,
      customerName: 'Ada',
      quantity: 2,
    }),
    { code: 'INVALID_STATE' },
  );

  assert.equal(event.status, 'draft');
  assert.equal(tier.sold, 0);
  assert.equal(store.bookings.size, 0);
});

test('bookTickets rejects an invalid customer name', () => {
  const { store, tier } = makeStore();

  assert.throws(
    () => bookTickets(store, {
      tierId: tier.id,
      customerName: ' ',
      quantity: 1,
    }),
    { code: 'VALIDATION' },
  );

  assert.equal(tier.sold, 0);
  assert.equal(store.bookings.size, 0);
});

test('bookTickets rejects invalid quantities', () => {
  const { store, tier } = makeStore();

  for (const quantity of [0, 1.5, 11, -1]) {
    assert.throws(
      () => bookTickets(store, {
        tierId: tier.id,
        customerName: 'Ada',
        quantity,
      }),
      { code: 'VALIDATION' },
    );
  }

  assert.equal(tier.sold, 0);
  assert.equal(store.bookings.size, 0);
});

test('booking two tickets from three available leaves one seat', () => {
  const { store, tier } = makeStore(3);

  const booking = bookTickets(store, {
    tierId: tier.id,
    customerName: 'Ada',
    quantity: 2,
  });

  assert.equal(booking.status, 'pending');
  assert.equal(booking.amountCents, 1000000);
  assert.equal(tier.sold, 2);
  assert.equal(seatsLeft(store, tier.id), 1);
});

test('failed booking does not change inventory or bookings', () => {
  const { store, tier } = makeStore(3);

  bookTickets(store, {
    tierId: tier.id,
    customerName: 'Ada',
    quantity: 2,
  });

  assert.throws(
    () => bookTickets(store, {
      tierId: tier.id,
      customerName: 'Bayo',
      quantity: 2,
    }),
    { code: 'SOLD_OUT' },
  );

  assert.equal(tier.sold, 2);
  assert.equal(seatsLeft(store, tier.id), 1);
  assert.equal(store.bookings.size, 1);
});

test('cancelBooking releases tickets without automatically booking waitlisted people', () => {
  const { store, tier } = makeStore(3);

  const adaBooking = bookTickets(store, {
    tierId: tier.id,
    customerName: 'Ada',
    quantity: 2,
  });

  bookTickets(store, {
    tierId: tier.id,
    customerName: 'Bayo',
    quantity: 1,
  });

  joinWaitlist(store, {
    tierId: tier.id,
    customerName: 'Chidi',
    quantity: 2,
  });

  cancelBooking(store, adaBooking.id);

  assert.equal(adaBooking.status, 'cancelled');
  assert.equal(tier.sold, 1);
  assert.equal(seatsLeft(store, tier.id), 2);
  assert.equal(store.bookings.size, 2);
  assert.equal(store.waitlists.get(tier.id).size(), 1);
});

test('cancelBooking accepts a booking reference', () => {
  const { store, tier } = makeStore(3);

  const booking = bookTickets(store, {
    tierId: tier.id,
    customerName: 'Ada',
    quantity: 2,
  });

  cancelBooking(store, booking.reference);

  assert.equal(booking.status, 'cancelled');
  assert.equal(tier.sold, 0);
});

test('cancelBooking rejects a missing or already cancelled booking', () => {
  const { store, tier } = makeStore(3);

  const booking = bookTickets(store, {
    tierId: tier.id,
    customerName: 'Ada',
    quantity: 2,
  });

  assert.throws(
    () => cancelBooking(store, 'missing-booking'),
    { code: 'NOT_FOUND' },
  );

  cancelBooking(store, booking.id);

  assert.throws(
    () => cancelBooking(store, booking.id),
    { code: 'ALREADY_CANCELLED' },
  );

  assert.equal(tier.sold, 0);
});

test('joinWaitlist rejects a request when enough tickets are available', () => {
  const { store, tier } = makeStore(10);

  assert.throws(
    () => joinWaitlist(store, {
      tierId: tier.id,
      customerName: 'Ada',
      quantity: 2,
    }),
    { code: 'WAITLIST_NOT_NEEDED' },
  );

  assert.equal(store.waitlists.get(tier.id).size(), 0);
});

test('joinWaitlist validates customer name and quantity', () => {
  const { store, tier } = makeStore(1);

  bookTickets(store, {
    tierId: tier.id,
    customerName: 'Ada',
    quantity: 1,
  });

  assert.throws(
    () => joinWaitlist(store, {
      tierId: tier.id,
      customerName: '',
      quantity: 1,
    }),
    { code: 'VALIDATION' },
  );

  assert.throws(
    () => joinWaitlist(store, {
      tierId: tier.id,
      customerName: 'Bayo',
      quantity: 0,
    }),
    { code: 'VALIDATION' },
  );

  assert.equal(store.waitlists.get(tier.id).size(), 0);
});

test('joinWaitlist preserves FIFO order', () => {
  const { store, tier } = makeStore(1);

  bookTickets(store, {
    tierId: tier.id,
    customerName: 'Customer already booked',
    quantity: 1,
  });

  joinWaitlist(store, { tierId: tier.id, customerName: 'Ada', quantity: 2 });
  joinWaitlist(store, { tierId: tier.id, customerName: 'Bayo', quantity: 1 });
  joinWaitlist(store, { tierId: tier.id, customerName: 'Tolu', quantity: 3 });

  const waitlist = store.waitlists.get(tier.id);

  assert.equal(waitlist.dequeue().customerName, 'Ada');
  assert.equal(waitlist.dequeue().customerName, 'Bayo');
  assert.equal(waitlist.dequeue().customerName, 'Tolu');
});

test('offerNextOnWaitlist does not skip the FIFO head', () => {
  const { store, tier } = makeStore(3);

  const adaBooking = bookTickets(store, {
    tierId: tier.id,
    customerName: 'Ada',
    quantity: 2,
  });

  bookTickets(store, {
    tierId: tier.id,
    customerName: 'Bayo',
    quantity: 1,
  });

  joinWaitlist(store, {
    tierId: tier.id,
    customerName: 'Chidi',
    quantity: 3,
  });

  joinWaitlist(store, {
    tierId: tier.id,
    customerName: 'Dayo',
    quantity: 1,
  });

  cancelBooking(store, adaBooking.id);

  assert.equal(seatsLeft(store, tier.id), 2);

  assert.equal(offerNextOnWaitlist(store, tier.id), undefined);

  assert.equal(
    store.waitlists.get(tier.id).peek().customerName,
    'Chidi',
  );
});