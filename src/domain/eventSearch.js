import { mergeSort } from './sorting.js';
import { DomainError } from './errors.js';

// Validates a date filter and returns its timestamp.
function parseDateFilter(value, fieldName) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime()) ||
    (
      typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      date.toISOString().slice(0, 10) !== value
    )
  ) {
    throw new DomainError(
      'VALIDATION',
      `${fieldName} must be a valid date`,
    );
  }

  return date;
}



// Makes a date-only "to" filter include the entire day.
function getInclusiveEndDate(value) {
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    const date = parseDateFilter(value, 'to');

    date.setUTCHours(23, 59, 59, 999);

    return date;
  }

  return parseDateFilter(value, 'to');
}


export function filterEvents(
  summaries,
  {
    q,
    city,
    from,
    to,
    maxPriceCents,
    onlyAvailable,
  } = {},
) {
  const startDate = parseDateFilter(from, 'from');
  const endDate = getInclusiveEndDate(to);

  if (
    maxPriceCents !== undefined &&
    maxPriceCents !== null &&
    !Number.isInteger(maxPriceCents)
  ) {
    throw new DomainError(
      'VALIDATION',
      'maxPriceCents must be a whole number',
    );
  }

  const searchText = q?.trim().toLowerCase();
  const searchCity = city?.trim().toLowerCase();

  return summaries.filter((event) => {
    if (
      searchText &&
      !event.title.toLowerCase().includes(searchText) &&
      !event.venue.toLowerCase().includes(searchText)
    ) {
      return false;
    }

    if (
      searchCity &&
      event.city.toLowerCase() !== searchCity
    ) {
      return false;
    }

    const eventDate = new Date(event.startsAt);

    if (startDate && eventDate < startDate) {
      return false;
    }

    if (endDate && eventDate > endDate) {
      return false;
    }

    if (
      maxPriceCents !== undefined &&
      maxPriceCents !== null &&
      (
        event.cheapestPriceCents === null ||
        event.cheapestPriceCents > maxPriceCents
      )
    ) {
      return false;
    }

    if (onlyAvailable && event.seatsLeft <= 0) {
      return false;
    }

    return true;
  });
}

export function sortEvents(summaries, sortBy = 'date') {
  let compare;

  if (sortBy === 'date') {
    compare = (a, b) =>
      new Date(a.startsAt) - new Date(b.startsAt);
  } else if (sortBy === 'price') {
    compare = (a, b) => {
      if (a.cheapestPriceCents === null) return 1;
      if (b.cheapestPriceCents === null) return -1;

      return a.cheapestPriceCents - b.cheapestPriceCents;
    };
  } else if (sortBy === 'availability') {
    compare = (a, b) => b.seatsLeft - a.seatsLeft;
  } else {
    throw new DomainError(
      'VALIDATION',
      'Unknown sort option',
    );
  }

  return mergeSort(summaries, (a, b) => {
    const primaryComparison = compare(a, b);

    if (primaryComparison !== 0) {
      return primaryComparison;
    }

    const titleComparison = a.title.localeCompare(b.title);

    if (titleComparison !== 0) {
      return titleComparison;
    }

    return a.id.localeCompare(b.id);
  });
}


export function searchEvents(summaries, criteria, sortBy = 'date') {
  const filteredEvents = filterEvents(summaries, criteria);

  return sortEvents(filteredEvents, sortBy);
}