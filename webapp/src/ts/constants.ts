// 32 million characters is guaranteed to be rejected by the API JSON
// parser limit of 32MB so don't even bother POSTing. If there are many
// 2 byte characters then a smaller body may also fail. Detecting the
// exact byte length of a string is too expensive so we let the request
// go and if it's still too long then API will respond with a 413.
const BODY_LENGTH_LIMIT = 32000000; // 32 million
export const POUCHDB_OPTIONS = {
  local: { auto_compaction: true, skip_setup: false },
  remote: {
    skip_setup: true,
    fetch: function(url, opts) {
      const parsedUrl = new URL(url);
      if (parsedUrl.pathname === '/') {
        parsedUrl.pathname = '/dbinfo';
        url = parsedUrl.toString();
      }
      if (opts.body && opts.body.length > BODY_LENGTH_LIMIT) {
        return Promise.reject({
          message: 'Payload Too Large',
          code: 413
        });
      }
      Object.keys(POUCHDB_OPTIONS.remote_headers).forEach(header => {
        opts.headers.set(header, POUCHDB_OPTIONS.remote_headers[header]);
      });
      opts.credentials = 'same-origin';
      return window.PouchDB.fetch(url, opts);
    },
  },
  remote_headers: {
    'Accept': 'application/json'
  }
};
