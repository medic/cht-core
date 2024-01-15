const TOMBSTONE_TYPE = 'tombstone';
const TOMBSTONE_ID_SEPARATOR = '____';

module.exports = {
  regex: new RegExp('(.*)' + TOMBSTONE_ID_SEPARATOR + '(.*)' + TOMBSTONE_ID_SEPARATOR + TOMBSTONE_TYPE),
  isTombstoneId: tombstoneId => module.exports.regex.test(tombstoneId),
};
