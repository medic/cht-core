//
// Writing more globals is gross, but the alternatives are grosser!
//
// We could write to localstorage, but we're only allowed to store a single
// string per key (no arrays), and we'd have to manage clearing logic manually
// (globals only persist for this reboot, which is what we're after).
//
let replicationId;
const setReplicationId = id => {
  replicationId = id;
};

const feedback = (msg) => {
  if (!window.bootstrapFeedback) {
    window.bootstrapFeedback = [msg];
  } else {
    window.bootstrapFeedback.push(msg);
  }
};

const getBaseUrl = () => {
  // parse the URL to determine the remote and local database names
  const location = window.location;
  const port = location.port ? ':' + location.port : '';
  return `${location.protocol}//${location.hostname}${port}`;
};

const fetchJSON = (path) => {
  const baseUrl = getBaseUrl();
  const opts = {
    credentials: 'same-origin',
    headers: {
      'Accept': 'application/json',
      'medic-replication-id': replicationId
    }
  };
  return fetch(`${baseUrl}${path}`, opts)
    .then(res => res.json());
};

module.exports = {
  // Store a piece of feedback to be later sent as a feedback document when (if)
  // the application boots, via the Feedback service.
  feedback,
  getBaseUrl,
  fetchJSON,
  setReplicationId
};
