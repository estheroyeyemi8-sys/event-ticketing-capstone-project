import { performance } from 'node:perf_hooks';

const RECORD_COUNT = 20000;
const ITERATIONS = 1000;

const bookingsArray = [];
const bookingsMap = new Map();

// Create sample bookings in both data structures.
for (let index = 0; index < RECORD_COUNT; index++) {
  const booking = {
    id: `booking-${index}`,
    customerName: `Customer ${index}`,
  };

  bookingsArray.push(booking);
  bookingsMap.set(booking.id, booking);
}

const targetId = `booking-${RECORD_COUNT - 1}`;
let result;

// Measure Array.find().
const arrayStart = performance.now();

for (let index = 0; index < ITERATIONS; index++) {
  result = bookingsArray.find((booking) => booking.id === targetId);
}

const arrayTime = performance.now() - arrayStart;

// Measure Map.get().
const mapStart = performance.now();

for (let index = 0; index < ITERATIONS; index++) {
  result = bookingsMap.get(targetId);
}

const mapTime = performance.now() - mapStart;

if (!result) {
  throw new Error('Benchmark lookup failed to find the target booking');
}

console.log('\n=== BOOKING LOOKUP BENCHMARK ===');
console.log(`Bookings stored: ${RECORD_COUNT.toLocaleString()}`);
console.log(`Lookups performed per method: ${ITERATIONS.toLocaleString()}`);
console.log(`Array.find(): ${arrayTime.toFixed(3)} ms`);
console.log(`Map.get():     ${mapTime.toFixed(3)} ms`);

if (mapTime > 0) {
  console.log(`Observed speed difference: ${(arrayTime / mapTime).toFixed(1)}x`);
}

console.log('\nBig O explanation:');
console.log('- Array.find() is O(n) in the worst case: it may inspect every booking.');
console.log('- Map.get() is O(1) on average: lookup time does not grow linearly with Map size.');
console.log('Actual timings vary by machine and runtime; Big O describes how work scales.\n');