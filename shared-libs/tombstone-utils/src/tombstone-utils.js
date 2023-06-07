const TOMBSTONE_TYPE = 'tombstone';
const TOMBSTONE_ID_SEPARATOR = '____';

const generateTombstoneId = (id, rev) => [id, rev, TOMBSTONE_TYPE].join(TOMBSTONE_ID_SEPARATOR);

module.exports = {
  regex: new RegExp('(.*)' + TOMBSTONE_ID_SEPARATOR + '(.*)' + TOMBSTONE_ID_SEPARATOR + TOMBSTONE_TYPE),
  isTombstoneId: tombstoneId => module.exports.regex.test(tombstoneId),
  generateTombstoneId: generateTombstoneId,
  getTombstonePrefix: id => `${id}${TOMBSTONE_ID_SEPARATOR}`,
};
