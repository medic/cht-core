/**
 * TEMPORARY diagnostic test — DO NOT MERGE.
 *
 * Fires N requests at the `docs_by_replication_key` nouveau index to look for the
 * intermittent 30s timeout we saw in couchdb logs (POST .../_nouveau/... 500 ... 30009)
 * that lines up with a sentinel purge round where purging started but never completed.
 *
 * CouchDB enforces `[nouveau] request_timeout` (default 30000ms) on the coordinator->nouveau
 * HTTP call; when it trips, couch returns 500 and nouveau itself logs nothing. This test
 * records per-request status + duration so we can catch any request that hits ~30s.
 *
 * Mirrors the purging query shape (sentinel/src/lib/purging.js): `key:(...) AND type:data_record`.
 *
 * The query keys come from reports this test seeds (see `before`): each report's
 * replication key is its subject (patient_id), so we query exactly those subjects.
 *
 * Tunable via env:
 *   NOUVEAU_PROBE_REQUESTS    total requests   (default 1000)
 *   NOUVEAU_PROBE_CONCURRENCY in-flight at once (default 10)
 *   NOUVEAU_PROBE_REPORTS     reports to seed  (default 200)
 *
 * Best pointed at a populated DB (override the test env's BASE_URL/DB) — on an empty CI
 * dataset queries return instantly and nothing will time out.
 */
const utils = require('@utils');
const nouveau = require('@medic/nouveau');
const { DOC_TYPES } = require('@medic/constants');

const TOTAL = Number(process.env.NOUVEAU_PROBE_REQUESTS) || 3000;
const CONCURRENCY = Number(process.env.NOUVEAU_PROBE_CONCURRENCY) || 15;
const SEED_REPORTS = Number(process.env.NOUVEAU_PROBE_REPORTS) || 1000;

// anything within a couple seconds of couch's 30s request_timeout is a (near-)miss worth flagging
const SLOW_MS = 28 * 1000;

const PREFIX = 'nouveau_probe_';

// subject keys to query — populated from the reports we seed in `before`
let KEYS = [];

const buildReports = (count) => {
  const docs = [];
  for (let i = 0; i < count; i++) {
    const subject = `${PREFIX}patient_${i}`;
    docs.push({
      _id: `${PREFIX}report_${i}`,
      type: DOC_TYPES.DATA_RECORD,
      form: 'V',
      reported_date: 1,
      patient_id: subject,
      contact: { _id: `contact_${i}` },

    });
  }
  return docs;
};

const probeOnce = async (index) => {
  const opts = {
    q: `key:(${KEYS.map(nouveau.escapeKeys).join(' OR ')}) AND type:data_record`,
    limit: nouveau.RESULTS_LIMIT,
  };

  const start = process.hrtime.bigint();
  let status;
  let error;
  let hits;
  try {
    const response = await utils.requestOnTestDb({
      path: '/_design/medic/_nouveau/docs_by_replication_key',
      method: 'POST',
      body: opts,
      resolveWithFullResponse: true, // capture 500s instead of throwing
    });
    status = response.status;
    hits = response.body && response.body.hits && response.body.hits.length;
  } catch (err) {
    // network-level failure (socket hang up, etc.) rather than an HTTP status
    status = err.status || 'ERR';
    error = err.message;
  }
  const ms = Number(process.hrtime.bigint() - start) / 1e6;

  return { index, status, ms, hits, error };
};

describe('TEMP nouveau timeout probe', () => {
  before(async function () {
    this.timeout(300 * 1000);
    const reports = buildReports(SEED_REPORTS);
    console.log(`[probe] seeding ${reports.length} reports`);
    await utils.saveDocs(reports);
    KEYS = reports.map(r => r.patient_id);
  });

  after(async () => {
    await utils.revertDb([], true);
  });

  it(`fires ${TOTAL} requests (concurrency ${CONCURRENCY}) and reports timeouts`, async function () {
    // generous: TOTAL requests could each take up to ~30s if things go bad
    this.timeout(Math.ceil(TOTAL / CONCURRENCY) * 35 * 1000 + 60 * 1000);

    const results = [];
    let next = 0;

    const worker = async () => {
      while (next < TOTAL) {
        const i = next++;
        const r = await probeOnce(i);
        results.push(r);
        if (r.status !== 200 || r.ms >= SLOW_MS) {
          console.warn(
            `[probe] #${r.index} status=${r.status} ${r.ms.toFixed(0)}ms` +
            (r.error ? ` error=${r.error}` : '')
          );
        }
        if (results.length % 100 === 0) {
          console.log(`[probe] ${results.length}/${TOTAL} done`);
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const durations = results.map(r => r.ms).sort((a, b) => a - b);
    const failures = results.filter(r => r.status !== 200);
    const slow = results.filter(r => r.status === 200 && r.ms >= SLOW_MS);
    const pct = p => durations[Math.min(durations.length - 1, Math.floor(durations.length * p))];

    console.log('\n===== nouveau timeout probe summary =====');
    console.log(`requests:    ${results.length}`);
    console.log(`failures:    ${failures.length} (non-200)`);
    console.log(`near-timeout:${slow.length} (>=${SLOW_MS}ms, status 200)`);
    console.log(`min/median:  ${durations[0].toFixed(0)} / ${pct(0.5).toFixed(0)} ms`);
    const max = durations[durations.length - 1].toFixed(0);
    console.log(`p95/p99/max: ${pct(0.95).toFixed(0)} / ${pct(0.99).toFixed(0)} / ${max} ms`);
    if (failures.length) {
      console.log('--- failures ---');
      failures.forEach(f => console.log(`  #${f.index} status=${f.status} ${f.ms.toFixed(0)}ms ${f.error || ''}`));
    }
    console.log('=========================================\n');

    // The probe always passes — it's diagnostic. The summary above is the result.
    expect(results.length).to.equal(TOTAL);
  });
});
