#!/usr/bin/env node

/**
 * find-test-failures.js
 *
 * Search CI history (the "Build and test" workflow, build.yml) for runs where a
 * specific test failed, and report how often it failed.
 *
 * GitHub does not store per-test results, so the only spec-level signal lives in
 * the job *logs*. This script pulls per-job logs via the GitHub API (`gh`) and
 * greps them for failures of the test you name. It understands both test styles
 * used by this repo:
 *
 *   - WebdriverIO e2e specs (ci-webdriver-*, wdio-performance, test-cht-form,
 *     upgrade-*): each spec attempt prints a per-worker block headed by either
 *     `Spec: <path>` or `» <path>`, with failures marked `[FAIL] <title>` or
 *     `✖ <title>`. Specs are retried up to 3x, so the same spec can appear in
 *     several blocks; the last block is the final result.
 *
 *   - Integration mocha tests (ci-integration-*): the mocha "spec" reporter
 *     prints a trailing "N failing" summary. With fullTrace enabled the stack
 *     lines contain the `tests/integration/.../*.spec.js` path, so we can match
 *     by test title OR by spec file.
 *
 * Requirements: the `gh` CLI must be installed and authenticated
 * (`gh auth login`), or a GH_TOKEN / GITHUB_TOKEN env var must be set.
 *
 * Usage:
 *   node scripts/ci/find-test-failures.js <search-term> [options]
 *
 *   <search-term>   Substring (case-insensitive) or /regex/ matched against the
 *                   failing test's title, its spec-file path, and (wdio) the
 *                   `Spec:` header. Pass a spec file basename
 *                   (e.g. "reports-list.wdio-spec.js") or a test-title fragment.
 *
 * Options:
 *   --branch <name>     Only scan runs on this branch (default: all branches).
 *   --limit <n>         Max number of runs to scan (default: 100).
 *   --since <date>      Only runs created on/after this date (YYYY-MM-DD).
 *   --repo <owner/repo> Repository to query (default: medic/cht-core).
 *   --scan-all          Also scan green runs and passing jobs. Catches specs
 *                       that failed an attempt but were retried-and-passed
 *                       (flaky-recovered). Slower. Default scans only failed
 *                       runs / failed jobs (i.e. final, job-failing failures).
 *   --concurrency <n>   Parallel log downloads (default: 6).
 *   --json              Emit machine-readable JSON instead of a table.
 *   --debug             Print per-job parsing diagnostics to stderr.
 *   -h, --help          Show this help.
 *
 * Examples:
 *   node scripts/ci/find-test-failures.js reports-list.wdio-spec.js
 *   node scripts/ci/find-test-failures.js "should display the correct number" --since 2026-01-01
 *   node scripts/ci/find-test-failures.js "/replication.*offline/" --scan-all --json
 */

'use strict';

const { spawnSync } = require('node:child_process');

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

const parseArgs = (argv) => {
  const opts = {
    term: null,
    branch: null,
    limit: 100,
    since: null,
    repo: 'medic/cht-core',
    scanAll: false,
    concurrency: 6,
    json: false,
    debug: false,
  };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '-h':
      case '--help':
        opts.help = true;
        break;
      case '--branch': opts.branch = argv[++i]; break;
      case '--limit': opts.limit = Number(argv[++i]); break;
      case '--since': opts.since = argv[++i]; break;
      case '--repo': opts.repo = argv[++i]; break;
      case '--concurrency': opts.concurrency = Number(argv[++i]); break;
      case '--scan-all': opts.scanAll = true; break;
      case '--json': opts.json = true; break;
      case '--debug': opts.debug = true; break;
      default:
        if (arg.startsWith('--')) {
          throw new Error(`Unknown option: ${arg}`);
        }
        rest.push(arg);
    }
  }
  opts.term = rest[0] || null;
  return opts;
};

const HELP = `Search CI history for runs where a specific test failed.

Usage:
  node scripts/ci/find-test-failures.js <search-term> [options]

  <search-term>   Substring (case-insensitive) or /regex/ matched against the
                  failing test's title and spec-file path. Pass a spec file
                  basename (e.g. "reports-list.wdio-spec.js") or a title fragment.

Options:
  --branch <name>     Only scan runs on this branch (default: all branches).
  --limit <n>         Max number of runs to scan (default: 100).
  --since <date>      Only runs created on/after this date (YYYY-MM-DD).
  --repo <owner/repo> Repository to query (default: medic/cht-core).
  --scan-all          Also scan green runs / passing jobs (catches flaky-recovered).
  --concurrency <n>   Parallel log downloads (default: 6).
  --json              Emit JSON instead of a table.
  --debug             Print parsing diagnostics to stderr.
  -h, --help          Show this help.
`;

// ---------------------------------------------------------------------------
// gh helpers
// ---------------------------------------------------------------------------

const runGh = (args, { allowFail = false, maxBuffer = 256 * 1024 * 1024 } = {}) => {
  const res = spawnSync('gh', args, { encoding: 'utf8', maxBuffer });
  if (res.error) {
    if (res.error.code === 'ENOENT') {
      throw new Error('`gh` CLI not found. Install it: https://cli.github.com/');
    }
    throw res.error;
  }
  if (res.status !== 0 && !allowFail) {
    throw new Error(`gh ${args.join(' ')} failed (exit ${res.status}):\n${res.stderr}`);
  }
  return { stdout: res.stdout, stderr: res.stderr, status: res.status };
};

const ghJson = (endpoint) => {
  const { stdout } = runGh(['api', endpoint]);
  return JSON.parse(stdout);
};

const assertAuth = () => {
  const res = runGh(['auth', 'status'], { allowFail: true });
  if (res.status !== 0 && !process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
    throw new Error(
      'gh is not authenticated. Run `gh auth login`, or set GH_TOKEN.\n' + (res.stderr || '')
    );
  }
};

// ---------------------------------------------------------------------------
// Text cleaning
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-control-regex
const ANSI = /\x1B\[[0-9;]*[A-Za-z]/g;
const GH_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z\s/;
// wdio spec-reporter prefixes lines with a runner tag like "[chrome 119 linux #0-0] "
const WDIO_RUNNER_PREFIX = /^\[[^\]]*#\d+-\d+\]\s?/;

const cleanLine = (line) => line.replace(ANSI, '').replace(GH_TIMESTAMP, '');

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

const buildMatcher = (term) => {
  const regexMatch = term.match(/^\/(.*)\/([a-z]*)$/);
  if (regexMatch) {
    const re = new RegExp(regexMatch[1], regexMatch[2].includes('i') ? regexMatch[2] : regexMatch[2] + 'i');
    return (text) => re.test(text);
  }
  const needle = term.toLowerCase();
  return (text) => text.toLowerCase().includes(needle);
};

// ---------------------------------------------------------------------------
// Log parsing: produce a list of failure records { title, file, source }
// ---------------------------------------------------------------------------

const SPEC_FILE_RE = /(?:[\w./-]*\/)?[\w.-]+\.(?:wdio-spec|spec)\.js/;

// Parse wdio "spec" reporter output. Returns failures grouped per spec file,
// keeping only the *final* attempt unless includeAllAttempts is set.
const parseWdioLog = (lines, includeAllAttempts) => {
  // collect ordered blocks: { file, fails: [titles] }
  const blocks = [];
  let current = null;
  for (const raw of lines) {
    const line = cleanLine(raw).replace(WDIO_RUNNER_PREFIX, '');
    // Spec-block header. Two reporter styles show up in this repo's logs:
    //   - classic spec-reporter:    "Spec: <path>"
    //   - per-worker grouped block: "» <path>"  (current wdio output)
    const specMatch = line.match(/^\s*(?:Spec:|»)\s*(\S+\.js)\s*$/);
    if (specMatch) {
      current = { file: specMatch[1], fails: [] };
      blocks.push(current);
      continue;
    }
    // Streaming concise lines ("✖ <title> » [ <path> ]") repeat every
    // attempt and aren't tied to an open block; skip them. The grouped block
    // re-reports the same failures and is authoritative for retry handling.
    if (/✖.*»\s*\[/.test(line)) {
      continue;
    }
    // Failure markers within a block: classic "[FAIL] <title>" or the
    // "✖ <title>" tree line emitted by the grouped block.
    const failMatch = line.match(/(?:\[FAIL\]|✖)\s*(.+?)\s*$/);
    if (failMatch && current) {
      current.fails.push(failMatch[1].trim());
    }
  }

  // group blocks by file, preserving order so the last block is the final attempt
  const byFile = new Map();
  for (const block of blocks) {
    if (!byFile.has(block.file)) {
      byFile.set(block.file, []);
    }
    byFile.get(block.file).push(block);
  }

  const failures = [];
  for (const [file, fileBlocks] of byFile) {
    const relevant = includeAllAttempts ? fileBlocks : [fileBlocks[fileBlocks.length - 1]];
    for (const block of relevant) {
      for (const title of block.fails) {
        failures.push({ title, file, source: 'wdio' });
      }
    }
  }
  return failures;
};

// Parse mocha "spec" reporter trailing "N failing" summary. Each entry looks like:
//   1) Suite title
//        sub-suite
//          test name:
//      AssertionError: ...
//        at Context.<anonymous> (tests/integration/.../foo.spec.js:12:34)
const parseMochaLog = (lines) => {
  const clean = lines.map(cleanLine);
  const failures = [];
  let i = 0;
  while (i < clean.length) {
    const header = clean[i].match(/^\s{1,4}(\d+)\)\s+(.*\S)\s*$/);
    if (!header) {
      i++;
      continue;
    }
    // gather the multi-line title: indented lines until we hit the error/stack
    const titleParts = [header[2]];
    let j = i + 1;
    for (; j < clean.length; j++) {
      const l = clean[j];
      if (!l.trim()) {
        break;
      }
      // start of next numbered failure
      if (/^\s{1,4}\d+\)\s/.test(l)) {
        break;
      }
      // error message / stack lines: typically "     SomeError: ..." or "at ..."
      if (/^\s*(at\s|[A-Z]\w*(Error|Exception):|AssertionError|\+ expected|- actual|Error:)/.test(l)) {
        break;
      }
      titleParts.push(l.trim());
    }
    // scan forward (within this entry) for a spec-file path in the stack
    let file = null;
    for (let k = i; k < clean.length; k++) {
      if (k > i && /^\s{1,4}\d+\)\s/.test(clean[k])) {
        break;
      }
      const m = clean[k].match(SPEC_FILE_RE);
      if (m && /tests\//.test(m[0])) {
        file = m[0];
        break;
      }
    }
    const title = titleParts.join(' ').replace(/:$/, '').replace(/\s+/g, ' ').trim();
    failures.push({ title, file, source: 'mocha' });
    i = j;
  }
  return failures;
};

const isIntegrationJob = (jobName) => /ci-integration/i.test(jobName);

const TEST_JOB_RE = /(ci-webdriver|wdio-performance|ci-integration|test-cht-form|integration-cht-form|upgrade-)/i;

// ---------------------------------------------------------------------------
// Concurrency helper
// ---------------------------------------------------------------------------

const mapWithConcurrency = async (items, limit, worker) => {
  const results = new Array(items.length);
  let next = 0;
  const runWorker = async () => {
    while (true) {
      const idx = next++;
      if (idx >= items.length) {
        return;
      }
      results[idx] = await worker(items[idx], idx);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runWorker));
  return results;
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const listRuns = (opts) => {
  const runs = [];
  const perPage = 100;
  let page = 1;
  while (runs.length < opts.limit) {
    const params = [`per_page=${perPage}`, `page=${page}`];
    if (opts.branch) {
      params.push(`branch=${encodeURIComponent(opts.branch)}`);
    }
    if (!opts.scanAll) {
      params.push('status=failure'); // only runs that ended in failure
    }
    if (opts.since) {
      params.push(`created=${encodeURIComponent('>=' + opts.since)}`);
    }
    const endpoint = `/repos/${opts.repo}/actions/workflows/build.yml/runs?${params.join('&')}`;
    const data = ghJson(endpoint);
    const batch = data.workflow_runs || [];
    if (!batch.length) {
      break;
    }
    runs.push(...batch);
    page++;
    if (batch.length < perPage) {
      break;
    }
  }
  return runs.slice(0, opts.limit);
};

const fetchJobLog = (repo, jobId) => {
  const res = runGh(['api', '-H', 'Accept: application/vnd.github.raw',
    `/repos/${repo}/actions/jobs/${jobId}/logs`], { allowFail: true });
  if (res.status !== 0) {
    return null; // logs expired / unavailable
  }
  return res.stdout;
};

const scanRun = async (run, opts, matcher) => {
  let jobsData;
  try {
    jobsData = ghJson(`/repos/${opts.repo}/actions/runs/${run.id}/jobs?per_page=100`);
  } catch (err) {
    if (opts.debug) {
      process.stderr.write(`run ${run.id}: failed to list jobs: ${err.message}\n`);
    }
    return [];
  }
  const jobs = (jobsData.jobs || []).filter((job) => {
    if (!TEST_JOB_RE.test(job.name)) {
      return false;
    }
    if (!opts.scanAll && job.conclusion !== 'failure') {
      return false;
    }
    return true;
  });

  const perJob = await mapWithConcurrency(jobs, opts.concurrency, async (job) => {
    const log = fetchJobLog(opts.repo, job.id);
    if (log === null) {
      if (opts.debug) {
        process.stderr.write(`run ${run.id} job ${job.name}: log unavailable\n`);
      }
      return [];
    }
    const lines = log.split('\n');
    const failures = isIntegrationJob(job.name)
      ? parseMochaLog(lines)
      : parseWdioLog(lines, opts.scanAll);

    const matched = failures.filter((f) => matcher(f.title || '') || (f.file && matcher(f.file)));

    if (opts.debug) {
      process.stderr.write(`run ${run.id} job ${job.name}: ` +
                           `${failures.length} failures, ${matched.length} matched\n`);
    }
    return matched.map((f) => ({ ...f, jobName: job.name, jobUrl: job.html_url }));
  });

  return perJob.flat();
};

const formatRow = (run, failures) => {
  const titles = [...new Set(failures.map((f) => f.title).filter(Boolean))];
  const jobs = [...new Set(failures.map((f) => f.jobName))];
  return {
    date: (run.created_at || '').slice(0, 10),
    branch: run.head_branch,
    event: run.event,
    runNumber: run.run_number,
    conclusion: run.conclusion,
    jobs,
    titles,
    url: run.html_url,
  };
};

const printTable = (matchedRuns, scannedCount, opts) => {
  if (!matchedRuns.length) {
    console.log(`\nNo failures of "${opts.term}" found in ${scannedCount} scanned run(s).`);
    if (!opts.scanAll) {
      console.log('(Only failed runs/jobs were scanned. Use --scan-all to also catch ' +
                  'specs that failed but were retried-and-passed.)');
    }
    return;
  }
  console.log(`\n"${opts.term}" failed in ${matchedRuns.length} of ${scannedCount} scanned run(s):\n`);
  for (const row of matchedRuns) {
    const prNote = row.event === 'pull_request' ? ' (PR)' : '';
    console.log(`● ${row.date}  ${row.branch}${prNote}  [run #${row.runNumber}, ${row.conclusion}]`);
    console.log(`  jobs:  ${row.jobs.join(', ')}`);
    for (const title of row.titles) {
      console.log(`  fail:  ${title}`);
    }
    console.log(`  ${row.url}`);
    console.log('');
  }

  // simple branch breakdown
  const byBranch = {};
  for (const row of matchedRuns) {
    byBranch[row.branch] = (byBranch[row.branch] || 0) + 1;
  }
  const branches = Object.entries(byBranch).sort((a, b) => b[1] - a[1]);
  console.log('By branch:');
  for (const [branch, count] of branches) {
    console.log(`  ${count}x  ${branch}`);
  }
};

const main = async () => {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.term) {
    console.log(HELP);
    process.exit(opts.term ? 0 : 1);
  }
  if (!Number.isFinite(opts.limit) || opts.limit <= 0) {
    throw new Error('--limit must be a positive number');
  }

  assertAuth();
  const matcher = buildMatcher(opts.term);

  process.stderr.write(`Listing build.yml runs (${opts.scanAll ? 'all' : 'failed-only'}` +
                       `${opts.branch ? `, branch=${opts.branch}` : ', all branches'}` +
                       `${opts.since ? `, since=${opts.since}` : ''}, limit=${opts.limit})...\n`);
  const runs = listRuns(opts);
  process.stderr.write(`Scanning ${runs.length} run(s) for "${opts.term}"...\n`);

  const matchedRuns = [];
  // scan runs sequentially; log downloads within each run are parallelised
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    process.stderr.write(`  [${i + 1}/${runs.length}] run #${run.run_number} (${run.head_branch})\r`);
    const failures = await scanRun(run, opts, matcher);
    if (failures.length) {
      matchedRuns.push(formatRow(run, failures));
    }
  }
  process.stderr.write('\n');

  if (opts.json) {
    console.log(JSON.stringify({
      term: opts.term,
      scanned: runs.length,
      failedRuns: matchedRuns.length,
      runs: matchedRuns,
    }, null, 2));
  } else {
    printTable(matchedRuns, runs.length, opts);
  }
};

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`\nError: ${err.message}\n`);
    process.exit(1);
  });
}

module.exports = { parseWdioLog, parseMochaLog, cleanLine, buildMatcher };
