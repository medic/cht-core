
// 32 million characters is guaranteed to be rejected by the API JSON
// parser limit of 32MB so don't even bother POSTing. If there are many
// 2 byte characters then a smaller body may also fail. Detecting the
// exact byte length of a string is too expensive so we let the request
// go and if it's still too long then API will respond with a 413.
const BODY_LENGTH_LIMIT = 32000000; // 32 million

// To keep long _changes requests open, API sends a heartbeat (a new line) every 10 seconds, starting on the 10sh
// second. Sending data through automatically adds a success 200 status, even though the results of the request is
// not known, and it can still fail.
// PouchDb only checks the request status to determine whether the request is successful or not. \
// In order to enable a retry, and not incorrectly communicate success to the client, validate _changes request
// responses and update the respons object accordingly before passing it to PouchDb for processing.
const processChangesResponse = (response) => {
  return response.json().then(json => {
    const validChangesResponse = json.results && !json.error;
    if (validChangesResponse) {
      return response;
    }

    response.ok = false;
    response.status = json.code || 500;
    return response;
  });
};

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
      const isChangesRequest = parsedUrl.pathname.startsWith('/_changes');
      return window.PouchDB
        .fetch(url, opts)
        .then(response => isChangesRequest ? processChangesResponse(response) : response);
    },
  },
  remote_headers: {
    Accept: 'application/json'
  }
};
