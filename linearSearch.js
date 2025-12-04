// linearSearch.js
function linearSearch(items, query) {
  if (!query) return [];
  const lower = query.toLowerCase();
  return items.filter(item => (item.name || '').toString().toLowerCase().includes(lower));
}

module.exports = linearSearch;
