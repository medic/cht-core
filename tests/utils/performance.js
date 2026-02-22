const performance = require('perf_hooks').performance;
const WDIOReporter = require('@wdio/reporter').default;

const entries = [];
let currentSuite;

const performanceMeasuresToMarkdownTable = (measures) => {
  const escapeMd = (value) => String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');

  const formatDuration = (ms) => `${Math.round(Number(ms))} ms`;
  const rows = Array.isArray(measures) ? [...measures] : [];

  const lines = [];
  lines.push('| Action | Duration |');
  lines.push('|---|---|');

  for (const m of rows) {
    lines.push(`| ${escapeMd(m.name)} | ${escapeMd(formatDuration(m.duration))} |`);
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
    this._indent++;
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
    entry.duration = parseInt(entry.end - entry.start);

    console.log(entry.name, entry.duration / 1000, 'seconds');
  },

  export: () => entries,

  PerformanceReporter,
};
