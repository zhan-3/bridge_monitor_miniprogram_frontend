function normalizeCollectIds(value) {
  let ids = value;
  if (typeof ids === 'string') {
    try {
      ids = JSON.parse(ids);
    } catch (err) {
      ids = [];
    }
  }
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter(id => typeof id === 'string' && id))];
}

function filterAndSortAudio(source, filterType, sortType) {
  const list = (Array.isArray(source) ? source : []).filter(item =>
    filterType === 'all' ||
    (filterType === 'collected' && item.isCollect) ||
    (filterType === 'emergency' && item.status === 'emergency')
  );
  const sign = sortType === 'desc' ? -1 : 1;
  return list.slice().sort((a, b) => (a.sortTime - b.sortTime) * sign);
}

function findAudioById(source, id) {
  return (Array.isArray(source) ? source : []).find(item => item.id === id) || null;
}

module.exports = { normalizeCollectIds, filterAndSortAudio, findAudioById };
