# Build 1 AI Usage Log

## Purpose
This log records AI assistance used while implementing the Build 1 domain core.

## Assistance used
- Reviewed the event, ticket tier, booking, cancellation, and waitlist domain implementation.
- Reviewed the linked-list waitlist queue and its tests.
- Reviewed the inventory tests and identified differences between automatic waitlist promotion and the Build 1 requirement to offer the next eligible person separately.
- Added a cryptographically generated, short, readable booking reference using Node.js `node:crypto`.
- Prepared the `offerNextOnWaitlist()` operation separately from cancellation.
- Prepared a terminal demo and a benchmark comparing `Array.find()` with `Map.get()`.

## Design decisions
- Existing UUID-based internal IDs are retained.
- Booking references use a short alphabet that avoids visually ambiguous characters.
- The waitlist remains a linked list with O(1) enqueue, dequeue, peek, and size operations.
- Cancellation releases ticket capacity but does not automatically create bookings for waitlisted customers.
- `offerNextOnWaitlist()` checks only the queue head to preserve strict FIFO order.
- Booking-reference lookup uses a Map rather than scanning an array.
- Ticket prices remain represented in whole cents.

## Verification
Record the actual test and demo results here after running them locally. Do not mark checks as passed until they have been run.