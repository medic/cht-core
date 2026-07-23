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
 *   --job <name>        Only scan jobs whose name matches (substring or /regex/).
 *                       A spec runs in one CI suite, so naming it (e.g. the
 *                       "ci-webdriver-default-lowLevel" partition) skips the
 *                       other jobs' log downloads and is much faster.
 *   --scan-all          Also scan green runs and passing jobs. Catches specs
 *                       that failed an attempt but were retried-and-passed
 *                       (flaky-recovered). Slower. Default scans only failed
 *                       runs / failed jobs (i.e. final, job-failing failures).
 *   --json              Emit machine-readable JSON instead of a table.
 *   --debug             Print per-job parsing diagnostics to stderr.
 *   -h, --help          Show this help.
 *
 * Examples:
 *   node scripts/ci/find-test-failures.js reports-list.wdio-spec.js
 *   node scripts/ci/find-test-failures.js "should display the correct number" --since 2026-01-01
 *   node scripts/ci/find-test-failures.js replace_user --job lowLevel
 *   node scripts/ci/find-test-failures.js "/replication.*offline/" --scan-all --json
 */

'use strict';

const { spawnSync } = require('node:child_process');
const { parseArgs: nodeParseArgs } = require('node:util');

// ---------------------------------------------------------------------------
// CI workflow coupling — keep in sync with .github/workflows/build.yml
// ---------------------------------------------------------------------------

const CI_WORKFLOW_FILE = 'build.yml';
// Jobs that run tests and whose logs are worth scanning.
const TEST_JOB_RE = /(ci-webdriver|wdio-performance|ci-integration|test-cht-form|integration-cht-form|upgrade-)/i;
// Integration jobs use mocha; every other job in TEST_JOB_RE is wdio.
const INTEGRATION_JOB_RE = /ci-integration/i;

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

const parseArgs = (argv) => {
  const { values, positionals } = nodeParseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      'scan-all': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      debug: { type: 'boolean', default: false },
      branch: { type: 'string' },
      since: { type: 'string' },
      repo: { type: 'string', default: 'medic/cht-core' },
      job: { type: 'string' },
      limit: { type: 'string', default: '100' },
    },
  });
  return {
    term: positionals[0] || null,
    branch: values.branch || null,
    since: values.since || null,
    job: values.job || null,
    repo: values.repo,
    limit: Number(values.limit),
    scanAll: values['scan-all'],
    json: values.json,
    debug: values.debug,
    help: values.help,
  };
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
  --job <name>        Only scan jobs whose name matches (substring or /regex/);
                      faster, since it skips other suites' log downloads.
  --scan-all          Also scan green runs / passing jobs (catches flaky-recovered).
  --json              Emit JSON instead of a table.
  --debug             Print parsing diagnostics to stderr.
  -h, --help          Show this help.
`;

// ---------------------------------------------------------------------------
// gh helpers
// ---------------------------------------------------------------------------

const runGh = (args, { allowFail = false } = {}) => {
  // 256MB: job logs can be tens of MB, well above spawnSync's 1MB default
  const res = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
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
// Shared helpers
// ---------------------------------------------------------------------------

const SPEC_FILE_SUFFIX_RE = /\.(?:wdio-spec|spec)\.js/;
const SPEC_FILE_CHAR_RE = /[\w./-]/;

const groupBy = (items, keyFn) => {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(item);
  }
  return map;
};

// ---------------------------------------------------------------------------
// Log parsing: produce a list of failure records { title, file, source }
// ---------------------------------------------------------------------------

const WDIO_SPEC_HEADER_RE = /^\s*(?:Spec:|»)\s*(\S+\.js)\s*$/;
const WDIO_STREAMING_TAIL_RE = /»\s*\[/;
const WDIO_FAIL_MARKER_RE = /\[FAIL\]|✖/;

// "✖ <title> » [ <path> ]" — split on the marker so the regex stays linear.
const isStreamingLine = (line) => {
  const marker = line.indexOf('✖');
  return marker !== -1 && WDIO_STREAMING_TAIL_RE.test(line.slice(marker + 1));
};

// The title is everything after the fail marker; slicing it off in code keeps
// the regex quantifier-free (sonar S8786).
const recordFailLine = (line, block) => {
  const marker = line.match(WDIO_FAIL_MARKER_RE);
  if (!marker || !block) {
    return;
  }
  const title = line.slice(marker.index + marker[0].length).trim();
  if (title) {
    block.fails.push(title);
  }
};

// Fold one (prefix-stripped) wdio log line into the running block list, and
// return the block that subsequent failure lines belong to.
const foldWdioLine = (line, blocks, current) => {
  const specMatch = line.match(WDIO_SPEC_HEADER_RE);
  if (specMatch) {
    const block = { file: specMatch[1], fails: [] };
    blocks.push(block);
    return block;
  }
  // Streaming concise lines ("✖ <title> » [ <path> ]") repeat every attempt and
  // aren't tied to an open block; skip them. The grouped block re-reports the
  // same failures and is authoritative for retry handling.
  if (isStreamingLine(line)) {
    return current;
  }
  recordFailLine(line, current);
  return current;
};

const collectWdioBlocks = (lines) => {
  const blocks = [];
  let current = null;
  for (const raw of lines) {
    current = foldWdioLine(cleanLine(raw).replace(WDIO_RUNNER_PREFIX, ''), blocks, current);
  }
  return blocks;
};

const blocksToFailures = (file, blocks) => blocks.flatMap(
  (block) => block.fails.map((title) => ({ title, file, source: 'wdio' }))
);

// Parse wdio "spec" reporter output. Returns failures grouped per spec file,
// keeping only the *final* attempt unless includeAllAttempts is set.
const parseWdioLog = (lines, includeAllAttempts) => {
  const byFile = groupBy(collectWdioBlocks(lines), (block) => block.file);
  const failures = [];
  for (const [file, fileBlocks] of byFile) {
    const relevant = includeAllAttempts ? fileBlocks : [fileBlocks.at(-1)];
    failures.push(...blocksToFailures(file, relevant));
  }
  return failures;
};

// Mocha "N failing" entry: "  1) Suite title", indented sub-titles, then the
// error message / stack. These delimit the title and the stack respectively.
const MOCHA_HEADER_RE = /^\s{1,4}(\d+)\)\s+(\S.*)$/;
const MOCHA_NEXT_RE = /^\s{1,4}\d+\)\s/;
const MOCHA_STACK_RE = /^\s*(at\s|[A-Z]\w*(Error|Exception):|AssertionError|\+ expected|- actual|Error:)/;

// Index where the multi-line title ends: first blank, next-entry, or stack line.
const findTitleEnd = (clean, start) => {
  let j = start + 1;
  for (; j < clean.length; j++) {
    const l = clean[j];
    if (!l.trim() || MOCHA_NEXT_RE.test(l) || MOCHA_STACK_RE.test(l)) {
      break;
    }
  }
  return j;
};

const gatherTitle = (clean, start, end, firstPart) => {
  const parts = [firstPart];
  for (let k = start + 1; k < end; k++) {
    parts.push(clean[k].trim());
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim().replace(/:$/, '');
};

// Index of the next numbered entry (or end of log), bounding this entry's stack.
const nextEntryIndex = (clean, start) => {
  for (let k = start + 1; k < clean.length; k++) {
    if (MOCHA_NEXT_RE.test(clean[k])) {
      return k;
    }
  }
  return clean.length;
};

// Locate the spec suffix, then extend backwards over path characters. A single
// path regex here backtracks super-linearly on non-matching lines (sonar S8786).
const matchSpecFile = (line) => {
  const suffix = line.match(SPEC_FILE_SUFFIX_RE);
  if (!suffix) {
    return null;
  }
  let start = suffix.index;
  while (start > 0 && SPEC_FILE_CHAR_RE.test(line[start - 1])) {
    start--;
  }
  const file = line.slice(start, suffix.index + suffix[0].length);
  return file.includes('tests/') ? file : null;
};

const findSpecFile = (entryLines) => {
  for (const line of entryLines) {
    const file = matchSpecFile(line);
    if (file) {
      return file;
    }
  }
  return null;
};

// Build the failure for the entry starting at `start`, plus the index to resume
// scanning from (after the title — stack lines are skipped by the main loop).
const parseMochaEntry = (clean, start, firstPart) => {
  const titleEnd = findTitleEnd(clean, start);
  const entryEnd = nextEntryIndex(clean, start);
  return {
    failure: {
      title: gatherTitle(clean, start, titleEnd, firstPart),
      file: findSpecFile(clean.slice(start, entryEnd)),
      source: 'mocha',
    },
    next: titleEnd,
  };
};

const parseMochaLog = (lines) => {
  const clean = lines.map(cleanLine);
  const failures = [];
  let i = 0;
  while (i < clean.length) {
    const header = clean[i].match(MOCHA_HEADER_RE);
    if (!header) {
      i++;
      continue;
    }
    const { failure, next } = parseMochaEntry(clean, i, header[2]);
    failures.push(failure);
    i = next;
  }
  return failures;
};

// ---------------------------------------------------------------------------
// Concurrency helper
// ---------------------------------------------------------------------------

// Parallel log downloads per run. Modest enough to stay well under GitHub's
// secondary rate limits while keeping each run's scan fast.
const LOG_DOWNLOAD_CONCURRENCY = 6;

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

const runsEndpoint = (opts, perPage, page) => {
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
  return `/repos/${opts.repo}/actions/workflows/${CI_WORKFLOW_FILE}/runs?${params.join('&')}`;
};

const listRuns = (opts) => {
  const runs = [];
  const perPage = 100;
  let page = 1;
  while (runs.length < opts.limit) {
    const batch = ghJson(runsEndpoint(opts, perPage, page)).workflow_runs || [];
    runs.push(...batch);
    page++;
    if (batch.length < perPage) {
      break; // last (or empty) page reached
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

const isScannableJob = (job, opts) => {
  if (!TEST_JOB_RE.test(job.name)) {
    return false;
  }
  if (opts.jobMatcher && !opts.jobMatcher(job.name)) {
    return false;
  }
  return opts.scanAll || job.conclusion === 'failure';
};

const scanJob = async (job, run, opts, matcher) => {
  const log = fetchJobLog(opts.repo, job.id);
  if (log === null) {
    if (opts.debug) {
      process.stderr.write(`run ${run.id} job ${job.name}: log unavailable\n`);
    }
    return [];
  }
  const lines = log.split('\n');
  const failures = INTEGRATION_JOB_RE.test(job.name)
    ? parseMochaLog(lines)
    : parseWdioLog(lines, opts.scanAll);

  const matched = failures.filter((f) => matcher(f.title || '') || (f.file && matcher(f.file)));
  if (opts.debug) {
    process.stderr.write(`run ${run.id} job ${job.name}: ` +
                         `${failures.length} failures, ${matched.length} matched\n`);
  }
  return matched.map((f) => ({ ...f, jobName: job.name, jobUrl: job.html_url }));
};

const listRunJobs = (run, opts) => {
  try {
    const jobsData = ghJson(`/repos/${opts.repo}/actions/runs/${run.id}/jobs?per_page=100`);
    return jobsData.jobs || [];
  } catch (err) {
    if (opts.debug) {
      process.stderr.write(`run ${run.id}: failed to list jobs: ${err.message}\n`);
    }
    return [];
  }
};

const scanRun = async (run, opts, matcher) => {
  const jobs = listRunJobs(run, opts).filter((job) => isScannableJob(job, opts));
  const perJob = await mapWithConcurrency(jobs, LOG_DOWNLOAD_CONCURRENCY, (job) => scanJob(job, run, opts, matcher));
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

const printNoMatches = (scannedCount, opts) => {
  console.log(`\nNo failures of "${opts.term}" found in ${scannedCount} scanned run(s).`);
  if (!opts.scanAll) {
    console.log('(Only failed runs/jobs were scanned. Use --scan-all to also catch ' +
                'specs that failed but were retried-and-passed.)');
  }
};

const printRun = (row) => {
  const prNote = row.event === 'pull_request' ? ' (PR)' : '';
  console.log(`● ${row.date}  ${row.branch}${prNote}  [run #${row.runNumber}, ${row.conclusion}]`);
  console.log(`  jobs:  ${row.jobs.join(', ')}`);
  for (const title of row.titles) {
    console.log(`  fail:  ${title}`);
  }
  console.log(`  ${row.url}`);
  console.log('');
};

const printBranchBreakdown = (matchedRuns) => {
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

const printTable = (matchedRuns, scannedCount, opts) => {
  if (!matchedRuns.length) {
    printNoMatches(scannedCount, opts);
    return;
  }
  console.log(`\n"${opts.term}" failed in ${matchedRuns.length} of ${scannedCount} scanned run(s):\n`);
  matchedRuns.forEach(printRun);
  printBranchBreakdown(matchedRuns);
};

const handleHelp = (opts) => {
  if (opts.help || !opts.term) {
    console.log(HELP);
    process.exit(opts.term ? 0 : 1);
  }
};

// repo and since are interpolated into `gh api` endpoint paths — allowlist
// their shape so arbitrary CLI input can't reshape the request (sonar S8705).
const REPO_RE = /^[\w.-]+\/[\w.-]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const validateOpts = (opts) => {
  if (!Number.isFinite(opts.limit) || opts.limit <= 0) {
    throw new Error('--limit must be a positive number');
  }
  if (!REPO_RE.test(opts.repo)) {
    throw new Error('--repo must be in owner/repo format');
  }
  if (opts.since && !DATE_RE.test(opts.since)) {
    throw new Error('--since must be a YYYY-MM-DD date');
  }
};

const describeScan = (opts) => {
  const scope = opts.scanAll ? 'all' : 'failed-only';
  const branch = opts.branch ? `, branch=${opts.branch}` : ', all branches';
  const since = opts.since ? `, since=${opts.since}` : '';
  return `Listing ${CI_WORKFLOW_FILE} runs (${scope}${branch}${since}, limit=${opts.limit})...`;
};

// scan runs sequentially; log downloads within each run are parallelised
const scanAllRuns = async (runs, opts, matcher) => {
  const matchedRuns = [];
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    process.stderr.write(`  [${i + 1}/${runs.length}] run #${run.run_number} (${run.head_branch})\r`);
    const failures = await scanRun(run, opts, matcher);
    if (failures.length) {
      matchedRuns.push(formatRow(run, failures));
    }
  }
  return matchedRuns;
};

const emitResults = (matchedRuns, runs, opts) => {
  if (opts.json) {
    console.log(JSON.stringify({
      term: opts.term,
      scanned: runs.length,
      failedRuns: matchedRuns.length,
      runs: matchedRuns,
    }, null, 2));
    return;
  }
  printTable(matchedRuns, runs.length, opts);
};

const main = async () => {
  const opts = parseArgs(process.argv.slice(2));
  handleHelp(opts);
  validateOpts(opts);

  assertAuth();
  const matcher = buildMatcher(opts.term);
  opts.jobMatcher = opts.job ? buildMatcher(opts.job) : null;

  process.stderr.write(`${describeScan(opts)}\n`);
  const runs = listRuns(opts);
  process.stderr.write(`Scanning ${runs.length} run(s) for "${opts.term}"...\n`);

  const matchedRuns = await scanAllRuns(runs, opts, matcher);
  process.stderr.write('\n');

  emitResults(matchedRuns, runs, opts);
};

main().catch((err) => {
  process.stderr.write(`\nError: ${err.message}\n`);
  process.exit(1);
});
