const MAX_HISTORY = 1000;
const MAX_RETRIES = 5;
const historyKeys = [];
const history = {};

const getKey = (change) => change && `${change.id}${change.changes && change.changes[0] && change.changes[0].rev}`;

const add = (change) => {
  const key = getKey(change);
  if (!key) {
    return;
  }

  if (history[key]) {
    history[key]++;
  } else {
    historyKeys.push(key);
    history[key] = 1;
  }

  if (historyKeys.length > MAX_HISTORY) {
    const deletedKey = historyKeys.shift();
    delete history[deletedKey];
  }
};

const shouldProcess = (change) => {
  const key = getKey(change);

  return !history[key] || history[key] <= MAX_RETRIES;
};

module.exports = {
  add,
  shouldProcess,
};
