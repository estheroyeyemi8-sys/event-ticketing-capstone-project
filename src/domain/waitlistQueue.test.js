
import test from 'node:test';
import assert from 'node:assert/strict';
import { WaitlistQueue } from './waitlistQueue.js';

test('a new queue is empty', () => {
  const queue = new WaitlistQueue();

  assert.equal(queue.size(), 0);
  assert.equal(queue.peek(), undefined);
  assert.equal(queue.dequeue(), undefined);
});

test('items are dequeued in FIFO order', () => {
  const queue = new WaitlistQueue();

  queue.enqueue('Ada');
  queue.enqueue('Bayo');
  queue.enqueue('Chika');

  assert.equal(queue.dequeue(), 'Ada');
  assert.equal(queue.dequeue(), 'Bayo');
  assert.equal(queue.dequeue(), 'Chika');
});


test('peek returns the first item without removing it', () => {
  const queue = new WaitlistQueue();

  queue.enqueue('Ada');
  queue.enqueue('Bayo');

  assert.equal(queue.peek(), 'Ada');
  assert.equal(queue.size(), 2);
  assert.equal(queue.peek(), 'Ada');
});

test('queue works after becoming empty', () => {
  const queue = new WaitlistQueue();

  queue.enqueue('Ada');

  assert.equal(queue.dequeue(), 'Ada');
  assert.equal(queue.size(), 0);
  assert.equal(queue.peek(), undefined);
  assert.equal(queue.dequeue(), undefined);

  queue.enqueue('Bayo');

  assert.equal(queue.size(), 1);
  assert.equal(queue.peek(), 'Bayo');
  assert.equal(queue.dequeue(), 'Bayo');
  assert.equal(queue.size(), 0);
});

test('size updates as items are added and removed', () => {
  const queue = new WaitlistQueue();

  assert.equal(queue.size(), 0);

  queue.enqueue('Ada');
  assert.equal(queue.size(), 1);

  queue.enqueue('Bayo');
  assert.equal(queue.size(), 2);

  queue.dequeue();
  assert.equal(queue.size(), 1);

  queue.dequeue();
  assert.equal(queue.size(), 0);
});
