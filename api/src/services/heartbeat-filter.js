/**
 * Clean up user-supplied input passed to /_changes and turn it into a safe
 * value to pass to setInterval().  If `true` or an invalid value is passed,
 * return the couchdb default of 60 seconds.
 * @module heartbeat-filter
 * @see http://docs.couchdb.org/en/2.1.1/api/database/changes.html#get--db-_changes
 */
const COUCH_DEFAULT = 60000;

module.exports = string => {
  if (string === 'true') {
    return COUCH_DEFAULT;
  }

  const int = Number.parseInt(string, 10);
  if (Number.isNaN(int) || int < 5000) {
    return COUCH_DEFAULT;
  }

  return int;
};
