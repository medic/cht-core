
const sortBy = (a, b) => a - b;
const list = [5, 10, 10, 15];
const item = 10;

function linear(list, item, sortBy) {
  let insertIndex = list.length;
  while (insertIndex && sortBy(item, list[insertIndex - 1]) < 0) {
    --insertIndex;
  }
  return insertIndex;
}

function binary(list, item, sortBy) {
  let low = 0;
  let high = list.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (sortBy(item, list[mid]) < 0) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
}

console.log('Linear:', linear(list, item, sortBy));
console.log('Binary:', binary(list, item, sortBy));

// Test with various cases
const cases = [
  { list: [], item: 10 },
  { list: [5], item: 10 },
  { list: [15], item: 10 },
  { list: [5, 15], item: 10 },
  { list: [5, 10, 15], item: 10 },
  { list: [10, 10, 10], item: 10 },
];

cases.forEach(c => {
  const l = linear(c.list, c.item, sortBy);
  const b = binary(c.list, c.item, sortBy);
  console.log(`List: [${c.list}] Item: ${c.item} -> Linear: ${l}, Binary: ${b} ${l === b ? 'PASS' : 'FAIL'}`);
});
