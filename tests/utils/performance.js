const performance = require('perf_hooks').performance;

const entries = [];

module.exports = {
  track: (name) => {
    const entry = {
      name: name,
      start: performance.now()
    };

    entries.push(entry);
  },

  record: (name) => {
    const entry = entries.find(entry => {
      return (name && entry.name === name || !name) && !entry.end;
    });
    if (!entry) {
      throw new Error(`No telemetry entry found for ${name}`);
    }

    entry.end = performance.now();
    entry.duration = parseInt(entry.end - entry.start);

    console.log(entry.name, entry.duration / 1000, 'seconds');
  },

  export: () => entries,
};
