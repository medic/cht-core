#!/usr/bin/env node

const PouchDB = require('pouchdb');

const couchUrl = process.argv[2] || process.env.COUCH_URL || 'http://admin:pass@localhost:5984/medic';

const db = PouchDB(couchUrl);

function rep(title, data) {
  console.log(title + ':');
  console.log(JSON.stringify(data, null, 3));
}

function sumPerState(messages) {
  const sums = {};
  messages.forEach((m) => sums[m.state] = 1 + (sums[m.state] || 0));
  return sums;
}

function asSeconds(ms) { return Math.round(ms / 100) / 10 + 's'; }

function timeInStateStats(messages) {
  const timeStats = {};

  messages.forEach((value) => {
    const h = value.state_history,
          t = Date.parse(h[h.length-1].timestamp) -
              (h.length === 1 ? value._record_reported_date : Date.parse(h[h.length-2].timestamp));

    if(!timeStats[value.state]) timeStats[value.state] =
        { count:0, mean:0, min:Number.MAX_SAFE_INTEGER, max:0 };

    const s = timeStats[value.state];

    s.min = Math.min(t, s.min);
    s.max = Math.max(t, s.max);

    s.mean += s.count++ ? (t - s.mean) / s.count : t;
  });

  Object.keys(timeStats).forEach((state) => {
    const s = timeStats[state];
    s.min = asSeconds(s.min);
    s.max = asSeconds(s.max);
    s.mean = asSeconds(s.mean);
  });

  return timeStats;
}

function withTempState(v) {
  // These states are terminal
  return v.state !== 'failed' &&
         v.state !== 'delivered' &&
         v.state !== 'scheduled';
}

db.query('medic/tasks_messages')
  .then((res) => res.rows.map((it) => it.value))
  .then((messages) => {
    console.log('===================================');
    rep('TOTALS', sumPerState(messages));
    console.log('-----------------------------------');
    rep('Time spent in each state', timeInStateStats(messages.filter(withTempState)));
    console.log('===================================');
  })
  .catch(console.log);
