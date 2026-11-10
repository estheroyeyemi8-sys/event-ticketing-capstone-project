import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterEvents,
  sortEvents,
  searchEvents,
} from '../src/domain/eventSearch.js';

const events = [
  {
    id: '1',
    title: 'Lagos Tech Meetup',
    city: 'Lagos',
    venue: 'Tech Hub',
    startsAt: '2026-12-05T17:00:00.000Z',
    cheapestPriceCents: 5000,
    seatsLeft: 20,
  },
  {
    id: '2',
    title: 'Abuja Jazz Night',
    city: 'Abuja',
    venue: 'Jazz Arena',
    startsAt: '2026-12-05T10:00:00.000Z',
    cheapestPriceCents: 3000,
    seatsLeft: 10,
  },
  {
    id: '3',
    title: 'Lagos Art Show',
    city: 'Lagos',
    venue: 'City Gallery',
    startsAt: '2026-12-06T12:00:00.000Z',
    cheapestPriceCents: 7000,
    seatsLeft: 0,
  },
];

test('filterEvents searches title and venue without case sensitivity', () => {
  assert.deepEqual(
    filterEvents(events, { q: 'JAZZ' }).map((event) => event.id),
    ['2'],
  );
});

test('filterEvents filters city without case sensitivity', () => {
  assert.deepEqual(
    filterEvents(events, { city: 'lagos' }).map((event) => event.id),
    ['1', '3'],
  );
});

test('filterEvents includes the entire date-only end date', () => {
  assert.deepEqual(
    filterEvents(events, { to: '2026-12-05' }).map((event) => event.id),
    ['1', '2'],
  );
});

test('filterEvents applies maximum price and excludes events without tiers', () => {
  const result = filterEvents(
    [...events, {
      id: '4',
      title: 'Free Event',
      city: 'Lagos',
      venue: 'Park',
      startsAt: '2026-12-07T10:00:00.000Z',
      cheapestPriceCents: null,
      seatsLeft: 50,
    }],
    { maxPriceCents: 5000 },
  );

  assert.deepEqual(result.map((event) => event.id), ['1', '2']);
});

test('filterEvents filters unavailable events', () => {
  assert.deepEqual(
    filterEvents(events, { onlyAvailable: true }).map((event) => event.id),
    ['1', '2'],
  );
});

test('sortEvents sorts by price, with missing prices last', () => {
  const result = sortEvents(
    [...events, { ...events[0], id: '4', title: 'Free', cheapestPriceCents: null }],
    'price',
  );

  assert.deepEqual(result.map((event) => event.id), ['2', '1', '3', '4']);
});

test('sortEvents sorts by availability, highest first', () => {
  assert.deepEqual(
    sortEvents(events, 'availability').map((event) => event.id),
    ['1', '2', '3'],
  );
});

test('searchEvents filters before sorting', () => {
  assert.deepEqual(
    searchEvents(events, { city: 'lagos' }, 'price').map((event) => event.id),
    ['1', '3'],
  );
});

test('filterEvents rejects invalid dates and fractional prices', () => {
  assert.throws(
    () => filterEvents(events, { from: 'not-a-date' }),
    { code: 'VALIDATION' },
  );

  assert.throws(
    () => filterEvents(events, { maxPriceCents: 10.5 }),
    { code: 'VALIDATION' },
  );
});

test('sortEvents rejects unknown sorting options', () => {
  assert.throws(
    () => sortEvents(events, 'unknown'),
    { code: 'VALIDATION' },
  );
});

test('filtering and sorting do not mutate the original summaries', () => {
  const original = events.slice();

  searchEvents(events, { city: 'lagos' }, 'price');

  assert.deepEqual(events, original);
});