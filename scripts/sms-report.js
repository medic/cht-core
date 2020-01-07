#!/usr/bin/env node

if(process.argv[2] === '-h' || process.argv[2] === '--help') {
  console.log(`Get a quick report of all SMS in your database.

Usage:
    ${process.argv[1]} [medic db URL]

Example:
    ${process.argv[1]} http://admin:pass@localhost:5984/medic
`);
  process.exit(0);
}

const couchUrl = process.argv[2] || process.env.COUCH_URL || 'http://admin:pass@localhost:5984/medic';

const PouchDB = require('pouchdb');

function log(...args) {
  args.unshift('LOG');
  console.log.apply(console, args);
}

function sanitiseUrl(url) {
  return url.substring(0, url.indexOf('://') + 3) +
      url.substring(url.indexOf('@') + 1);
}

function link(docId) {
  return `${sanitiseUrl(couchUrl)}/${docId}`;
}

function snip(s, w) {
  return s.length <= w ? s : s.substring(0, w-1) + '…';
}

function rightPad(s, w) {
  if(!s) {
    s = '';
  } else {
    s = s.toString();
  }
  while(s.length < w) {
    s += ' ';
  }
  return s;
}

function leftPad(s, w) {
  if(!s) {
    s = '';
  } else {
    s = s.toString();
  }
  while(s.length < w) {
    s = ' ' + s;
  }
  return s;
}

function printTableRow(...columns) {
  let i; let 
    row = '';
  for(i=0; i<columns.length; i+=2) {
    if(i) {
      row += ' | ';
    }
    const colWidth = columns[i+1];
    let val = columns[i];
    val = !colWidth ? val : colWidth>0 ?
      rightPad(val, colWidth):
      leftPad(val, -colWidth);
    row += colWidth ? snip(val, Math.abs(colWidth)) : val;
  }
  console.log(row);
}

log(`Starting for ${sanitiseUrl(couchUrl)}…`);

const db = PouchDB(couchUrl);

console.log('        state | to               |  len | message                          | doc URL');

db.query('medic/messages_by_state')
  .then((res) => {
    res.rows.map((row) => {
      const state = row.key[0];
      const m = row.value.content;
      printTableRow(
        state, -13,
        row.value.to, 16,
        m ? m.length : 0, -4,
        m, 32,
        link(row.id), 0);
    });
  })
  .then(() => log('Finished.'));
