export function mergeSort(items, compare) {
  if (items.length <= 1) {
    return items.slice();
  }

  const middle = Math.floor(items.length / 2);

  const left = mergeSort(items.slice(0, middle), compare);
  const right = mergeSort(items.slice(middle), compare);

  const merged = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (compare(left[leftIndex], right[rightIndex]) <= 0) {
      merged.push(left[leftIndex]);
      leftIndex++;
    } else {
      merged.push(right[rightIndex]);
      rightIndex++;
    }
  }

  while (leftIndex < left.length) {
    merged.push(left[leftIndex]);
    leftIndex++;
  }

  while (rightIndex < right.length) {
    merged.push(right[rightIndex]);
    rightIndex++;
  }

  return merged;
}