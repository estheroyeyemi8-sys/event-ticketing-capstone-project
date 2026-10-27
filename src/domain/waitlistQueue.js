
export class WaitlistQueue {
  #head = null;
  #tail = null;
  #length = 0;

  enqueue(value) {
    const node = { value, next: null };

    if (this.#tail === null) {
      this.#head = node;
      this.#tail = node;
    } else {
      this.#tail.next = node;
      this.#tail = node;
    }

    this.#length++;
  }

  dequeue() {
    if (this.#head === null) {
      return undefined;
    }

    const value = this.#head.value;
    this.#head = this.#head.next;

    if (this.#head === null) {
      this.#tail = null;
    }

    this.#length--;
    return value;
  }
  peek() {
    return this.#head === null ? undefined : this.#head.value;
  }

  size() {
    return this.#length;
  }
}
