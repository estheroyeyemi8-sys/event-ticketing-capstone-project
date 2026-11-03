import { randomUUID, randomInt } from 'node:crypto';

// Generates unique internal IDs.
export function newId(prefix) {
  if (typeof prefix !== 'string' || prefix.trim() === '') {
    throw new TypeError('ID prefix must be a non-empty string');
  }

  return `${prefix}_${randomUUID()}`;
}

// Keeps compatibility with older code using createId().
export const createId = newId;

// Characters that are easy to confuse are excluded.
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Generates a short, readable booking reference.
export function newReference() {
  let code = '';

  for (let index = 0; index < 6; index++) {
    code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  }

  return `EVT-${code}`;
}