import {
  createStore,
  createEvent,
  addTier,
  bookTickets,
  cancelBooking,
  findBookingByReference,
  joinWaitlist,
  offerNextOnWaitlist,
  seatsLeft,
} from '../src/domain/inventory.js';

const store = createStore();

const event = createEvent(store, {
  title: 'Incubator Hub Demo Night',
  city: 'Lagos',
  venue: 'University of Lagos',
  startsAt: '2027-03-21T10:00:00Z',
  organizerId: 'org_demo',
});

const tier = addTier(store, event.id, {
  name: 'Regular',
  priceCents: 500000,
  capacity: 3,
});

console.log('\n=== EVENT TICKETING: BUILD 1 DEMO ===');
console.log(`Event: ${event.title}`);
console.log(`Ticket capacity: ${tier.capacity}`);

const adaBooking = bookTickets(store, {
  tierId: tier.id,
  customerName: 'Ada',
  quantity: 2,
});

console.log(`\nAda books 2 tickets. Reference: ${adaBooking.reference}`);
console.log(`Seats left: ${seatsLeft(store, tier.id)}`);

console.log('\nBayo tries to book 2 tickets...');

try {
  bookTickets(store, {
    tierId: tier.id,
    customerName: 'Bayo',
    quantity: 2,
  });
} catch (error) {
  console.log(`Booking refused: ${error.code} — ${error.message}`);
}

console.log(`Seats left remain unchanged: ${seatsLeft(store, tier.id)}`);

const bayoBooking = bookTickets(store, {
  tierId: tier.id,
  customerName: 'Bayo',
  quantity: 1,
});

console.log(`\nBayo books the final ticket. Reference: ${bayoBooking.reference}`);
console.log(`Seats left: ${seatsLeft(store, tier.id)}`);

joinWaitlist(store, {
  tierId: tier.id,
  customerName: 'Chidi',
  quantity: 2,
});

console.log('\nChidi joins the waitlist for 2 tickets.');

joinWaitlist(store, {
  tierId: tier.id,
  customerName: 'Dayo',
  quantity: 1,
});

console.log('Dayo joins the waitlist for 1 ticket.');

const foundAdaBooking = findBookingByReference(store, adaBooking.reference);

console.log(
  `\nBooking lookup by reference ${adaBooking.reference}: ${foundAdaBooking.customerName}`,
);

cancelBooking(store, adaBooking.id);

console.log('\nAda cancels her booking.');
console.log(`Seats released. Seats left: ${seatsLeft(store, tier.id)}`);

const nextOffer = offerNextOnWaitlist(store, tier.id);

if (nextOffer) {
  console.log(
    `Next eligible person in the FIFO waitlist: ${nextOffer.customerName} (${nextOffer.quantity} tickets)`,
  );
} else {
  console.log('No waitlisted customer can be offered tickets yet.');
}

console.log(`People remaining on waitlist: ${store.waitlists.get(tier.id).size()}`);
console.log('\n=== DEMO COMPLETE ===\n');
