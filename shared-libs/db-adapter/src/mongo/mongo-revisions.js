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

module.exports = {
  generateFirstRev,
  generateNextRev,
  generateRevHash,
  parseRevGeneration,
};
