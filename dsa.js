// Bubble sort by name (ascending or descending)
export function bubbleSortByName(arr, asc = true) {
  const sorted = [...arr];
  const n = sorted.length;

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (asc) {
        if (sorted[j].name.toLowerCase() > sorted[j + 1].name.toLowerCase()) {
          [sorted[j], sorted[j + 1]] = [sorted[j + 1], sorted[j]];
        }
      } else {
        if (sorted[j].name.toLowerCase() < sorted[j + 1].name.toLowerCase()) {
          [sorted[j], sorted[j + 1]] = [sorted[j + 1], sorted[j]];
        }
      }
    }
  }
  return sorted;
}

// Bubble sort by price ascending
export function bubbleSortPriceAsc(arr) {
  const sorted = [...arr];
  const n = sorted.length;

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (parseFloat(sorted[j].price) > parseFloat(sorted[j + 1].price)) {
        [sorted[j], sorted[j + 1]] = [sorted[j + 1], sorted[j]];
      }
    }
  }
  return sorted;
}

// Bubble sort by price descending
export function bubbleSortPriceDesc(arr) {
  const sorted = [...arr];
  const n = sorted.length;

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (parseFloat(sorted[j].price) < parseFloat(sorted[j + 1].price)) {
        [sorted[j], sorted[j + 1]] = [sorted[j + 1], sorted[j]];
      }
    }
  }
  return sorted;
}

// Binary search for name
export function binarySearchByName(arr, target) {
  let low = 0, high = arr.length - 1;
  target = target.toLowerCase();

  while (low <= high) {
    let mid = Math.floor((low + high) / 2);
    const name = arr[mid].name.toLowerCase();

    if (name === target) return arr[mid];
    if (name < target) low = mid + 1;
    else high = mid - 1;
  }

  return null;
}
