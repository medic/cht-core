// https://docs.couchdb.org/en/stable/ddocs/nouveau.html#query-syntax
// The following characters require escaping if you want to search on them:
// + - && || ! ( ) { } [ ] ^ " ~ * ? : \ /

const specialChars = [ '\\+', '&', '\\|', '!', '\\^', '"',  '\\~',  '\\*', '\\?', ':', '\\-', ];
const charSet = specialChars.join('');
const pattern = new RegExp(`([${charSet}])`, 'g');

const escapeKeys = (key) => {
  return String(key).replace(pattern, `\\$1`);
};

module.exports = {
  escapeKeys,
  BATCH_LIMIT: 1000,
  RESULTS_LIMIT: 200 * 1000,
};
