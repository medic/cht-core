const performance = require('node:perf_hooks').performance;
const WDIOReporter = require('@wdio/reporter').default;

const entries = [];
let currentSuite;

const performanceMeasuresToMarkdownTable = (measures) => {
  const formatDuration = (ms) => `${Math.round(Number(ms))} ms`;
  const rows = Array.isArray(measures) ? [...measures] : [];

  const lines = [];
  lines.push('| Action | Duration |', '|---|---|');

  for (const m of rows) {
    lines.push(`| ${m.name} | ${formatDuration(m.duration)} |`);
  }

  return lines.join('\n');
};

class PerformanceReporter extends WDIOReporter {
  constructor(options) {
    super(options);
    this._options = options;
  }

  onSuiteStart(suite) {
    suite.entries = [];
    currentSuite = suite;
  }

  onSuiteEnd(suite) {
    this._indent = Math.max(0, this._indent - 1);
    this.write(performanceMeasuresToMarkdownTable(suite.entries));
    this.write('\n\n');
  }
}

module.exports = {
  track: (name) => {
    const entry = {
      name: name,
      start: performance.now()
    };

    entries.push(entry);
    currentSuite.entries.push(entry);
  },

  record: (name) => {
    const entry = entries.find(entry => {
      return (name && entry.name === name || !name) && !entry.end;
    });
    if (!entry) {
      throw new Error(`No telemetry entry found for ${name}`);
    }

    entry.end = performance.now();
    entry.duration = Number.parseInt(entry.end - entry.start, 10);

    console.log(entry.name, entry.duration / 1000, 'seconds');
  },

  export: () => entries,

  PerformanceReporter,
};
