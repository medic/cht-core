const performance = require('node:perf_hooks').performance;
const fs = require('node:fs/promises');
const path = require('node:path');
const WDIOReporter = require('@wdio/reporter').default;

const tempPerformanceFile = path.resolve(__dirname, '..', 'logs', 'temp-performance.json');

const formatDuration = (ms) => ms && `${Math.round(Number(ms)) / 1000} s`;
let currentSuite;

const performanceMeasuresToMarkdownTable = (measures) => {
  const rows = {};
  let maxDurations = 0;
  measures.forEach(m => {
    if (!rows[m.name]) {
      rows[m.name] = { name: m.name, duration: [] };
    }
    rows[m.name].duration.push(m.duration);
    maxDurations = Math.max(maxDurations, rows[m.name].duration.length);
  });

  const headers = ['Action', ...new Array(maxDurations).fill('Time(s)'), 'Avg(s)'];

  // Prepare all data rows first to calculate column widths
  const dataRows = [];
  for (const key of Object.keys(rows).sort()) {
    const row = rows[key];
    const line = [
      row.name,
      ...new Array(maxDurations).fill('').map((s, i) => formatDuration(row.duration[i]) || s),
      formatDuration(row.duration.reduce((a, b) => a + b, 0) / row.duration.length),
    ];
    dataRows.push(line);
  }

  // Calculate max width for each column
  const columnWidths = headers.map((header, i) => {
    const maxDataWidth = Math.max(...dataRows.map(row => String(row[i]).length));
    return Math.max(header.length, maxDataWidth);
  });

  // Pad cell content to column width
  const padCell = (content, width) => String(content).padEnd(width, ' ');

  const lines = [];
  lines.push(
    `| ${headers.map((h, i) => padCell(h, columnWidths[i])).join(' | ')} |`,
    `| ${columnWidths.map(w => '-'.repeat(w)).join(' | ')} |`
  );

  for (const row of dataRows) {
    lines.push(`| ${row.map((cell, i) => padCell(cell, columnWidths[i])).join(' | ')} |`);
  }

  return lines.join('\n');
};

class PerformanceReporter extends WDIOReporter {
  constructor(options) {
    super(options);
  }

  onSuiteStart(suite) {
    if (!currentSuite) {
      currentSuite = suite;
      suite.entries = [];
    }
  }

  async onSuiteEnd(suite) {
    if (currentSuite !== suite) {
      return;
    }

    this.write(performanceMeasuresToMarkdownTable(currentSuite.entries));
    this.write('\n\n');

    let previousEntries;
    try {
      previousEntries = JSON.parse(await fs.readFile(tempPerformanceFile, { encoding: 'utf-8' }));
    } catch {
      previousEntries = [];
    }
    previousEntries.push(...currentSuite.entries);
    await fs.writeFile(tempPerformanceFile, JSON.stringify(previousEntries, null, 2) + '\n');
  }
}

module.exports = {
  track: (name) => {
    const entry = {
      name: name,
      start: performance.now()
    };

    currentSuite.entries.push(entry);
  },

  record: (name) => {
    const entry = currentSuite.entries.find(entry => {
      return (!name || entry.name === name) && !entry.end;
    });
    if (!entry) {
      throw new Error(`No telemetry entry found for ${name}`);
    }

    entry.end = performance.now();
    entry.duration = Number.parseInt(entry.end - entry.start, 10);

    console.log(entry.name, formatDuration(entry.duration));
  },

  PerformanceReporter,
  export: async () => {
    const previousEntries = JSON.parse(await fs.readFile(tempPerformanceFile, { encoding: 'utf-8' }));
    console.log(performanceMeasuresToMarkdownTable(previousEntries));

    return previousEntries;
  }
};
