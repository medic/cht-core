const crypto = require('crypto');

const generateRevHash = (doc) => {
  const str = JSON.stringify(doc, Object.keys(doc).sort());
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 32);
};

const generateFirstRev = (doc) => {
  return `1-${generateRevHash(doc)}`;
};

const generateNextRev = (currentRev, doc) => {
  const gen = parseRevGeneration(currentRev);
  return `${gen + 1}-${generateRevHash(doc)}`;
};

const parseRevGeneration = (rev) => {
  if (!rev) {
    return 0;
  }
  const gen = parseInt(rev.split('-')[0], 10);
  return isNaN(gen) ? 0 : gen;
};

const buildRevisions = (currentRev, newRev) => {
  const gen = parseRevGeneration(newRev);
  const newHash = newRev.split('-')[1];
  const ids = [newHash];
  if (currentRev) {
    ids.push(currentRev.split('-')[1]);
  }
  return { start: gen, ids };
};

const mergeRevisions = (existing, newRev) => {
  const gen = parseRevGeneration(newRev);
  const newHash = newRev.split('-')[1];
  if (!existing) {
    return { start: gen, ids: [newHash] };
  }
  const ids = [newHash, ...existing.ids];
  return { start: gen, ids };
};

module.exports = {
  generateFirstRev,
  generateNextRev,
  generateRevHash,
  parseRevGeneration,
  buildRevisions,
  mergeRevisions,
};
