const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeCollectIds,
  filterAndSortAudio,
  findAudioById
} = require('../utils/audioState');

test('normalizes legacy JSON-string and current array collection storage', () => {
  assert.deepEqual(normalizeCollectIds('["a","b","a"]'), ['a', 'b']);
  assert.deepEqual(normalizeCollectIds(['a', 'b', 'a']), ['a', 'b']);
  assert.deepEqual(normalizeCollectIds('broken'), []);
});

test('sorting and filtering keeps stable ids instead of positional indexes', () => {
  const source = [
    { id: 'old', sortTime: 1, isCollect: true, status: 'normal' },
    { id: 'new', sortTime: 2, isCollect: false, status: 'emergency' }
  ];

  assert.deepEqual(
    filterAndSortAudio(source, 'all', 'desc').map(item => item.id),
    ['new', 'old']
  );
  assert.deepEqual(
    filterAndSortAudio(source, 'collected', 'desc').map(item => item.id),
    ['old']
  );
  assert.equal(findAudioById(source, 'new').id, 'new');
});
