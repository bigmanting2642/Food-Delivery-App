// bubbleSort.js
function bubbleSort(items, key) {
  const arr = [...items];
  for (let i = 0; i < arr.length - 1; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      if (Number(arr[j][key]) > Number(arr[j + 1][key])) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}

module.exports = bubbleSort;

