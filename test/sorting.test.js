import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSort } from '../src/domain/sorting.js';

test('mergeSort sorts items using the comparator', () => {
  const numbers = [5, 2, 8, 1, 3];

  const result = mergeSort(numbers, (a, b) => a - b);

  assert.deepEqual(result, [1, 2, 3, 5, 8]);
});

test('mergeSort is stable when two items compare equally', () => {
  const items = [
    { name: 'First', score: 10 },
    { name: 'Second', score: 5 },
    { name: 'Third', score: 10 },
  ];

  const result = mergeSort(items, (a, b) => a.score - b.score);

  assert.deepEqual(
    result.map((item) => item.name),
    ['Second', 'First', 'Third']
  );
});

test('mergeSort does not mutate the original array', () => {
  const numbers = [4, 1, 3, 2];
  const original = numbers.slice();

  mergeSort(numbers, (a, b) => a - b);

  assert.deepEqual(numbers, original);
});

test('mergeSort returns a new array', () => {
  const numbers = [1, 2, 3];

  const result = mergeSort(numbers, (a, b) => a - b);

  assert.notStrictEqual(result, numbers);
});

test('mergeSort handles empty and single-item arrays', () => {
  const empty = [];
  const single = [7];

  assert.deepEqual(mergeSort(empty, (a, b) => a - b), []);
  assert.deepEqual(mergeSort(single, (a, b) => a - b), [7]);

  assert.notStrictEqual(mergeSort(empty, (a, b) => a - b), empty);
  assert.notStrictEqual(mergeSort(single, (a, b) => a - b), single);
});