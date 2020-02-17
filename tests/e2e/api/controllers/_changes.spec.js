const _ = require('lodash');
const utils = require('../../../utils');
const sentinelUtils = require('../../sentinel/utils');
const uuid = require('uuid');
const http = require('http');
const querystring = require('querystring');
const constants = require('../../../constants');
const auth = require('../../../auth')();
const semver = require('semver');
const chai = require('chai');

const DEFAULT_EXPECTED = [
  'service-worker-meta',
  'settings',
  'resources',
  'branding',
  'partners',
  '_design/medic-client'
];

const defaultDocRegex = /^(messages-|form:)/;
const isFormOrTranslation = id => defaultDocRegex.test(id);

const assertChangeIds = function (changes) {
  changes = changes.results;

  //  * filter out translation documents and other expected documents
  changes = changes.filter(change => {
    return !isFormOrTranslation(change.id) &&
           !DEFAULT_EXPECTED.includes(change.id);
  });
  const expectedIds = Array.prototype.slice.call(arguments, 1);
  const changeIds = _.uniq(getIds(changes));
  chai.expect(changeIds).to.have.members(expectedIds);
};

const getIds = docsOrChanges => docsOrChanges.map(elem => elem._id || elem.id);

const requestChanges = (username, params = {}) => {
  const options = {
    path: '/_changes',
    qs: params,
    auth: { username, password }
  };
  return utils.requestOnTestDb(options);
};

const password = 'passwordSUP3RS3CR37!';

const users = [
  {
    username: 'bob',
    password: password,
    place: {
      _id: 'fixture:bobville',
      type: 'health_center',
      name: 'Bobville',
      parent: 'PARENT_PLACE'
    },
    contact: {
      _id: 'fixture:user:bob',
      name: 'Bob'
    },
    roles: ['district-manager', 'kujua_user', 'data_entry', 'district_admin']
  },
  {
    username: 'clare',
    password: password,
    place: {
      _id: 'fixture:clareville',
      type: 'health_center',
      name: 'Clareville',
      parent: 'PARENT_PLACE'
    },
    contact: {
      _id: 'fixture:user:clare',
      name: 'Clare'
    },
    roles: ['district_admin']
  },
  {
    username: 'chw-boss',
    password: password,
    place: {
      _id: 'fixture:chw-bossville',
      type: 'health_center',
      name: 'CHW Bossville',
      parent: 'PARENT_PLACE'
    },
    contact: {
      _id: 'fixture:user:chw-boss',
      name: 'CHW Boss'
    },
    roles: ['district_admin']
  },
  {
    username: 'chw',
    password: password,
    place: {
      _id: 'fixture:chwville',
      type: 'clinic',
      name: 'Chwville',
      parent: 'fixture:chw-bossville'
    },
    contact: {
      _id: 'fixture:user:chw',
      name: 'CHW'
    },
    roles: ['district_admin', 'analytics']
  },
  {
    username: 'supervisor',
    password: password,
    place: 'PARENT_PLACE',
    contact: {
      _id: 'fixture:user:supervisor',
      name: 'Supervisor'
    },
    roles: ['district_admin']
  },
  {
    username: 'steve',
    password: password,
    place: {
      _id: 'fixture:steveville',
      type: 'health_center',
      name: 'Steveville',
      parent: 'PARENT_PLACE'
    },
    contact: {
      _id: 'fixture:user:steve',
      name: 'Steve'
    },
    roles: ['district-manager', 'kujua_user', 'data_entry', 'district_admin']
  },
  {
    username: 'manager',
    password: password,
    place: {
      _id: 'fixture:managerville',
      type: 'health_center',
      name: 'Managerville',
      parent: 'PARENT_PLACE'
    },
    contact: {
      _id: 'fixture:user:manager',
      name: 'Manager'
    },
    roles: ['national_admin']
  },
];

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hostpital'
};

const defaultSettings = {
  reiterate_changes: true,
  changes_limit: 100,
  debounce_interval: 200
};

const createSomeContacts = (nbr, parent) => {
  const docs = [];
  parent = typeof parent === 'string' ? { _id: parent } : parent;
  for (let i = 0; i < nbr; i++) {
    docs.push({
      _id: `random_contact_${parent._id}_${uuid()}`,
      type: `clinic`,
      parent: parent
    });
  }

  return docs;
};

const consumeChanges = (username, results, lastSeq) => {
  const opts = { since: lastSeq, feed: 'longpoll' };
  if (results && results.length) {
    opts.timeout = 2000;
  } else {
    opts.timeout = 10000;
  }

  return requestChanges(username, opts).then(changes => {
    if (!changes.results.length) {
      return { results: results, last_seq: changes.last_seq };
    }
    results = results.concat(changes.results);
    return consumeChanges(username, results, changes.last_seq);
  });
};

const batchedChanges = (username, limit, results = [], lastSeq = 0) => {
  const opts = { since: lastSeq, limit };

  return requestChanges(username, opts).then(changes => {
    if (!changes.results.length) {
      return { results: results, last_seq: changes.last_seq };
    }
    results = results.concat(changes.results);
    return batchedChanges(username, limit, results, changes.last_seq);
  });
};

const getChangesForIds = (username, docIds, retry = false, lastSeq = 0, limit = 100, results = []) => {
  return requestChanges(username, { since: lastSeq, limit }).then(changes => {
    changes.results.forEach(change => {
      if (docIds.includes(change.id)) {
        results.push(change);
      }
    });

    // simulate PouchDB 7.0.0 seq selection
    const last_seq = changes.results.length ? changes.results[changes.results.length - 1].seq : changes.last_seq;

    if (docIds.find(id => !results.find(change => change.id === id)) || (retry && changes.results.length)) {
      return getChangesForIds(username, docIds, retry, last_seq, limit, results);
    }

    return results;
  });
};

let currentSeq;
const getCurrentSeq = () => {
  return sentinelUtils.waitForSentinel()
    .then(() => utils.requestOnTestDb('/_changes?descending=true&limit=1'))
    .then(result => {
      currentSeq = result.last_seq;
    });
};

describe('changes handler', () => {

  const DOCS_TO_KEEP = [
    'PARENT_PLACE',
    /^messages-/,
    /^fixture/,
    /^org.couchdb.user/,
  ];

  beforeAll(done => {
    // Bootstrap users
    return utils
      .saveDoc(parentPlace)
      .then(() => utils.createUsers(users, true))
      .then(done);
  });

  afterAll(done =>
    // Clean up like normal
    utils
      .revertDb()
      // And also revert users we created in before
      .then(() => utils.deleteUsers(users, true))
      .then(done));

  beforeEach(done => getCurrentSeq().then(done));
  afterEach(done => utils.revertDb(DOCS_TO_KEEP).then(done));

  describe('requests', () => {
    it('should allow DB admins to POST to _changes', () => {
      return utils
        .requestOnTestDb({
          path: '/_changes?since=0&filter=_doc_ids&heartbeat=10000',
          method: 'POST',
          body: { doc_ids: ['org.couchdb.user:bob'] },
        })
        .then(result => {
          chai.expect(result.results).to.be.ok;
        });
    });

    it('should copy proxied response headers', () => {
      return utils
        .requestOnTestDb({
          path: '/_changes?limit=1',
          resolveWithFullResponse: true,
        })
        .then(response => {
          chai.expect(response.headers).to.be.ok;
          chai.expect(response.headers['content-type']).to.equal('application/json');
          chai.expect(response.headers.server).to.be.ok;
        });
    });

    it('should send heartbeats at specified intervals for all types of _changes requests', () => {
      const heartRateMonitor = options => {
        options = options || {};
        options.hostname = constants.API_HOST;
        options.port = constants.API_PORT;
        options.auth = options.auth || `${auth.username}:${auth.password}`;
        options.path = options.path || '/';
        options.query = Object.assign({ heartbeat: 2000, feed: 'longpoll' }, options.query || {});
        options.path += '?' + querystring.stringify(options.query || {});

        const heartbeats = [];
        let timer;

        return new Promise((resolve, reject) => {
          const req = http.request(options, res => {
            res.setEncoding('utf8');
            let body = '';
            res.on('data', chunk => {
              body += chunk;
              const oldTimer = timer;
              timer = new Date().getTime();
              heartbeats.push({ chunk, interval: timer - oldTimer });
            });
            res.on('end', () => {
              resolve({ body, heartbeats });
            });
          });

          req.on('error', e => {
            console.log('Request failed: ' + e.message);
            reject(e);
          });

          req.end();
          timer = new Date().getTime();

          if (options.timeout) {
            // have to manually abort this, sending a `heartbeat` disables the `timeout` mechanism in CouchDB
            setTimeout(() => req.abort(), options.timeout);
          }

        });
      };
      return utils
        .requestOnTestDb('/')
        .then(result => {
          const since = result.update_seq;

          return Promise.all([
            heartRateMonitor({ // admin longpoll _changes
              path: '/' + constants.DB_NAME + '/_changes',
              query: { since },
              timeout: 11000 // 5 heartbeats
            }),
            heartRateMonitor({ // online user longpoll _changes
              path: '/' + constants.DB_NAME + '/_changes',
              auth: `manager:${password}`,
              query: { since },
              timeout: 11000 // 5 heartbeats
            }),
            heartRateMonitor({ // offline user longpoll _changes
              path: '/' + constants.DB_NAME + '/_changes',
              auth: `bob:${password}`,
              // heartbeats are set to minimum 5 seconds in our changes controller!
              query: { since, timeout: 21000, heartbeat: 5000 } // 4 heartbeats
            }),
            heartRateMonitor({ // online meta longpoll _changes
              path: '/medic-user-manager-meta/_changes',
              query: { since },
              auth: `manager:${password}`,
              timeout: 11000 // 5 heartbeats
            }),
            heartRateMonitor({ // offline meta longpoll _changes
              path: '/medic-user-bob-meta/_changes',
              query: { since },
              auth: `bob:${password}`,
              timeout: 11000 // 5 heartbeats
            }),
          ]);
        })
        .then(results => {
          // admin _changes
          chai.expect(results[0].heartbeats.length).to.equal(6);
          results[0].heartbeats.forEach((heartbeat, idx) => {
            chai.expect(heartbeat.chunk).to.equal(idx ? '\n' : '{"results":[\n');
            // we can't expect heartbeats to happen at _exactly_ 2 seconds apart
            chai.expect(parseInt(heartbeat.interval / 1000)).to.be.below(3);
          });
          chai.expect(results[0].body).to.equal('{"results":[\n\n\n\n\n\n');

          // online user _changes
          chai.expect(results[1].heartbeats.length).to.equal(6);
          results[1].heartbeats.forEach((heartbeat, idx) => {
            chai.expect(heartbeat.chunk).to.equal(idx ? '\n' : '{"results":[\n');
            chai.expect(parseInt(heartbeat.interval / 1000)).to.be.below(3);
          });
          chai.expect(results[1].body).to.equal('{"results":[\n\n\n\n\n\n');

          // offline user _changes
          // `last_seq` doesn't necessarily match the `since` we requested
          chai.expect(results[2].body.startsWith('\n\n\n\n{"results":[],"last_seq":')).to.equal(true);
          results[2].heartbeats.forEach((heartbeat, idx) => {
            if (idx === 4) {
              chai.expect(heartbeat.chunk.startsWith('{"results":[],"last_seq":"')).to.equal(true);
            } else {
              chai.expect(heartbeat.chunk).to.equal('\n');
            }
            // heartbeats are set to minimum 5 seconds in our changes controller!
            chai.expect(parseInt(heartbeat.interval / 1000)).to.be.below(6);
          });

          // online user meta _changes
          chai.expect(results[3].heartbeats.length).to.equal(6);
          results[3].heartbeats.forEach((heartbeat, idx) => {
            chai.expect(heartbeat.chunk).to.equal(idx ? '\n' : '{"results":[\n');
            chai.expect(parseInt(heartbeat.interval / 1000)).to.be.below(3);
          });
          chai.expect(results[3].body).to.equal('{"results":[\n\n\n\n\n\n');

          // ofline user meta _changes
          chai.expect(results[4].heartbeats.length).to.equal(6);
          results[4].heartbeats.forEach((heartbeat, idx) => {
            chai.expect(heartbeat.chunk).to.equal(idx ? '\n' : '{"results":[\n');
            chai.expect(parseInt(heartbeat.interval / 1000)).to.be.below(3);
          });
          chai.expect(results[4].body).to.equal('{"results":[\n\n\n\n\n\n');
        });
    });
  });

  describe('Filtered replication', () => {
    const couchVersionForBatching = '2.3.0';

    let shouldBatchChangesRequests;
    let bobsIds;
    let stevesIds;

    beforeAll(done => {
      const options = {
        hostname: constants.COUCH_HOST,
        port: constants.COUCH_PORT,
        auth: auth.username+ ':' + auth.password,
        path: '/'
      };

      const req = http.request(options, res => {
        let body = '';
        res.on('data', data => body += data);
        res.on('end', () => {
          try {
            body = JSON.parse(body);
            shouldBatchChangesRequests = semver.lte(couchVersionForBatching, body.version);
            done();
          } catch (e) {
            done(e);
          }
        });
      });

      req.on('error', e => done(e));
      req.end();
    });

    beforeEach(done => {
      bobsIds = ['org.couchdb.user:bob', 'fixture:user:bob', 'fixture:bobville'];
      stevesIds = ['org.couchdb.user:steve', 'fixture:user:steve', 'fixture:steveville'];
      return getCurrentSeq().then(done);
    });

    it('should successfully fully replicate (with or without limit)', () => {
      const allowedDocs = createSomeContacts(12, 'fixture:bobville');
      const deniedDocs = createSomeContacts(10, 'irrelevant-place');

      return Promise
        .all([
          utils.saveDocs(allowedDocs),
          utils.saveDocs(deniedDocs)
        ])
        .then(() => batchedChanges('bob', 4))
        .then(changes => {
          assertChangeIds(changes, ...bobsIds, ...getIds(allowedDocs));
        });
    });

    it('depending on CouchDB version, should limit changes requests or specifically ignore limit', () => {
      const allowedDocs = createSomeContacts(12, 'fixture:bobville');
      const deniedDocs = createSomeContacts(10, 'irrelevant-place');
      bobsIds.push(...getIds(allowedDocs));

      return Promise
        .all([
          utils.saveDocs(allowedDocs),
          utils.saveDocs(deniedDocs)
        ])
        .then(() => requestChanges('bob', { limit: 4 }))
        .then(changes => {
          if (shouldBatchChangesRequests) {
            // requests should be limited
            const receivedIds = getIds(changes.results)
              .filter(id => !isFormOrTranslation(id) && !DEFAULT_EXPECTED.includes(id));
            chai.expect(bobsIds).to.include.members(receivedIds);
            // because we still process pending changes, it's not a given we will receive only 4 changes.
            chai.expect(bobsIds).to.not.have.members(receivedIds);
          } else {
            // requests should return full changes list
            assertChangeIds(changes, ...bobsIds);
          }
        });
    });

    it('filters allowed changes in longpolls', () => {
      const allowedDocs = createSomeContacts(3, 'fixture:bobville');
      const deniedDocs = createSomeContacts(3, 'irrelevant-place');

      return Promise.all([
        consumeChanges('bob', [], currentSeq),
        utils.saveDocs(allowedDocs),
        utils.saveDocs(deniedDocs)
      ])
        .then(([changes]) => {
          assertChangeIds(changes, ...getIds(allowedDocs));
        });
    });

    it('filters correctly for concurrent users on initial replication', () => {
      const allowedBob = createSomeContacts(3, 'fixture:bobville');
      const allowedSteve = createSomeContacts(3, 'fixture:steveville');

      return Promise
        .all([
          utils.saveDocs(allowedBob),
          utils.saveDocs(allowedSteve),
        ])
        .then(() => Promise.all([
          requestChanges('bob'),
          requestChanges('steve')
        ]))
        .then(([bobsChanges, stevesChanges]) => {
          assertChangeIds(bobsChanges, ...bobsIds, ...getIds(allowedBob));
          assertChangeIds(stevesChanges, ...stevesIds, ...getIds(allowedSteve));
        });
    });

    it('filters correctly for concurrent users on longpolls', () => {
      const allowedBob = createSomeContacts(3, 'fixture:bobville');
      const allowedSteve = createSomeContacts(3, 'fixture:steveville');

      return Promise.all([
        consumeChanges('bob', [], currentSeq),
        consumeChanges('steve', [], currentSeq),
        utils.saveDocs(allowedBob),
        utils.saveDocs(allowedSteve),
      ])
        .then(([ bobsChanges, stevesChanges ]) => {
          assertChangeIds(bobsChanges, ...getIds(allowedBob));
          assertChangeIds(stevesChanges, ...getIds(allowedSteve));
        });
    });

    it('returns newly added docs', () => {
      const newDocs = [
        {_id: 'new_allowed_contact', place_id: '12345', parent: {_id: 'fixture:bobville'}, type: 'clinic'},
        {_id: 'new_denied_contact', place_id: '88888', parent: {_id: 'fixture:steveville'}, type: 'clinic'},
        {
          _id: 'new_allowed_report',
          type: 'data_record',
          reported_date: 1,
          place_id: '12345',
          form: 'some-form',
          contact: {_id: 'fixture:bobville'}
        },
        {
          _id: 'new_denied_report',
          type: 'data_record',
          reported_date: 1,
          place_id: '88888',
          form: 'some-form',
          contact: {_id: 'fixture:steveville'}
        }
      ];
      const newIds = ['new_allowed_contact', 'new_allowed_report'];
      return Promise
        .all([
          consumeChanges('bob', [], currentSeq),
          utils.saveDocs(newDocs)
        ])
        .then(([changes]) => {
          if (changes.results.length >= 2) {
            return changes;
          }
          return consumeChanges('bob', [], currentSeq);
        })
        .then(changes => {
          chai.expect(_.uniq(getIds(changes.results))).to.have.members(newIds);
        });
    });

    it('restarts longpoll feeds when settings are changed', () => {
      const settingsUpdates = { changes_controller: _.defaults({ reiterate_changes: false }, defaultSettings) };
      return Promise
        .all([
          requestChanges('steve', { feed: 'longpoll', since: currentSeq }),
          requestChanges('bob', { feed: 'longpoll', since: currentSeq }),
          // we delay the settings update request to make sure it happens AFTER the longpoll feeds have been created
          utils.delayPromise(() => utils.updateSettings(settingsUpdates, true), 300)
        ])
        .then(([ stevesChanges, bobsChanges ]) => {
          chai.expect(stevesChanges.results.length).to.equal(1);
          chai.expect(bobsChanges.results.length).to.equal(1);
          chai.expect(bobsChanges.results[0].id).to.equal('settings');
          chai.expect(stevesChanges.results[0].id).to.equal('settings');
          chai.expect(stevesChanges.last_seq).not.to.equal(currentSeq);
          chai.expect(bobsChanges.last_seq).not.to.equal(currentSeq);
        });
    });

    it('returns newly added docs when in restart mode', () => {
      const newDocs = [
        {_id: 'new_allowed_contact_bis', place_id: '123456', parent: {_id: 'fixture:bobville'}, type: 'clinic'},
        {_id: 'new_denied_contact_bis', place_id: '888888', parent: {_id: 'fixture:steveville'}, type: 'clinic'},
        {
          _id: 'new_allowed_report_bis',
          type: 'data_record',
          reported_date: 1,
          place_id: '123456',
          form: 'some-form',
          contact: {_id: 'fixture:bobville'}
        },
        {
          _id: 'new_denied_report_bis',
          type: 'data_record',
          reported_date: 1,
          place_id: '888888',
          form: 'some-form',
          contact: {_id: 'fixture:steveville'}
        }
      ];
      const newIds = ['new_allowed_contact_bis', 'new_allowed_report_bis'];
      return utils
        .updateSettings({ changes_controller: _.defaults({ reiterate_changes: false }, defaultSettings) }, true)
        .then(() => getCurrentSeq())
        .then(() => {
          return Promise
            .all([
              consumeChanges('bob', [], currentSeq),
              utils.saveDocs(newDocs)
            ])
            .then(([changes]) => {
              if (changes.results.length >= 2) {
                return changes;
              }
              return consumeChanges('bob', [], currentSeq);
            })
            .then(changes => {
              assertChangeIds(changes, ...newIds);
            });
        });
    });

    it('returns correct results when only medic user-settings doc facility_id is updated', () => {
      const allowedBob = createSomeContacts(3, 'fixture:bobville');
      const allowedSteve = createSomeContacts(3, 'fixture:steveville');

      return utils
        .getDoc('org.couchdb.user:steve')
        .then(stevesUser => {
          return Promise.all([
            requestChanges('steve', { feed: 'longpoll', since: currentSeq }),
            utils.saveDocs(allowedBob),
            utils.saveDocs(allowedSteve),
            utils.saveDoc(Object.assign(stevesUser, { facility_id: 'fixture:bobville' })),
          ]);
        })
        .then(([ changes ]) => {
          assertChangeIds(changes, 'org.couchdb.user:steve', ...getIds(allowedSteve));
          return requestChanges('steve', { since: currentSeq });
        })
        .then(changes => {
          assertChangeIds(changes, 'org.couchdb.user:steve', ...getIds(allowedSteve));
        });
    });

    it('returns correct results when user is updated while changes request is active', () => {
      const allowedBob = createSomeContacts(3, 'fixture:bobville');
      const allowedSteve = createSomeContacts(3, 'fixture:steveville');

      const updateSteve = (user, medicUser) => {
        // we move Steve's _user to bobville
        return utils
          .request({
            path: `/_users/org.couchdb.user:steve?rev=${user._rev}`,
            method: 'PUT',
            body: Object.assign(user, { facility_id: 'fixture:bobville' })
          })
          .then(() => utils.saveDocs([
            // we "move" his medic user to a place that doesn't exist. He should still get bobville docs
            Object.assign(medicUser, { facility_id: 'fixture:somethingville', roles: ['_admin'] }),
            ...allowedSteve,
            ...allowedBob,
          ]));
      };

      return getCurrentSeq('steve')
        .then(() => Promise.all([
          utils.request({ path: '/_users/org.couchdb.user:steve' }),
          utils.getDoc('org.couchdb.user:steve')
        ]))
        .then(([ user, medicUser ]) => Promise.all([
          requestChanges('steve', { feed: 'longpoll', since: currentSeq }),
          utils.delayPromise(() => updateSteve(user, medicUser), 500),
        ]))
        .then(([ changes ]) => {
          const bobvilleIds = getIds(allowedBob);
          const stevevilleIds = getIds(allowedSteve);
          const changeIds = getIds(changes.results);

          // Sometimes the changes request ends before all our changes are processed and doesn't contain the
          // update to Steve's user :(
          if (changeIds.includes('org.couchdb.user:steve')) {
            // steve was moved to bobville, so we expect him to get `allowedSteveIds` + his own user
            chai.expect(changeIds).to.have.members(['org.couchdb.user:steve', ...bobvilleIds]);
            // we also expect him to *not* get any of the steveville changes
            stevevilleIds.forEach(id => chai.expect(changeIds).to.not.include(id));
          } else {
            // when we didn't receive Steve's update, we should only get steveVille docs
            chai.expect(stevevilleIds).to.include(changeIds);
          }
        })
        .then(() => utils.request({ path: '/_users/org.couchdb.user:steve' }))
        // revert steve, he didn't like it in bobville
        .then(user => utils.request({
          path: `/_users/org.couchdb.user:steve?rev=${user._rev}`,
          method: 'PUT',
          body: Object.assign(user, { facility_id: 'fixture:steveville' })
        }));
    });

    it('filters allowed deletes in longpolls', () => {
      const allowedDocs = createSomeContacts(3, 'fixture:bobville');
      const deniedDocs = createSomeContacts(3, 'irrelevant-place');

      return Promise
        .all([
          utils.saveDocs(allowedDocs),
          utils.saveDocs(deniedDocs),
        ])
        .then(([ allowedDocsResult, deniedDocsResult ]) => {
          allowedDocsResult.forEach((doc, idx) => allowedDocs[idx]._rev = doc.rev);
          deniedDocsResult.forEach((doc, idx) => deniedDocs[idx]._rev = doc.rev);
          return getCurrentSeq();
        })
        .then(() => Promise.all([
          consumeChanges('bob', [], currentSeq),
          utils.saveDocs(deniedDocs.map(doc => Object.assign(doc, { _deleted: true }))),
          utils.saveDocs(allowedDocs.map(doc => Object.assign(doc, { _deleted: true })))
        ]))
        .then(([ changes ]) => {
          assertChangeIds(changes, ...getIds(allowedDocs));
          changes.results.forEach(change => chai.expect(change.deleted).to.equal(true));
        });
    });

    it('filters deletions (tombstones)', () => {
      const allowedDocs = createSomeContacts(5, 'fixture:steveville');
      const deniedDocs = createSomeContacts(5, 'irrelevant-place');
      const allowedDocIds = getIds(allowedDocs);

      return Promise
        .all([
          utils.saveDocs(allowedDocs),
          utils.saveDocs(deniedDocs)
        ])
        .then(([ allowedDocsResult, deniedDocsResult ]) => {
          allowedDocsResult.forEach((doc, idx) => allowedDocs[idx]._rev = doc.rev);
          deniedDocsResult.forEach((doc, idx) => deniedDocs[idx]._rev = doc.rev);
          return requestChanges('steve');
        })
        .then(changes => {
          assertChangeIds(changes, ...stevesIds, ...allowedDocIds);
          return getCurrentSeq();
        })
        .then(() => {
          return Promise.all([
            utils.saveDocs(deniedDocs.map(doc => Object.assign(doc, { _deleted: true }))),
            utils.saveDocs(allowedDocs.map(doc => Object.assign(doc, { _deleted: true }))),
          ]);
        })
        .then(() => sentinelUtils.waitForSentinel())
        .then(() => requestChanges('steve'))
        .then(changes => {
          const changeIds = getIds(changes.results)
            .filter(id => !isFormOrTranslation(id) && !DEFAULT_EXPECTED.includes(id));
          // can't use assertChangeIds here because it ignores deletes
          chai.expect(_.uniq(changeIds)).to.have.members([...stevesIds, ...allowedDocIds]);
        })
        .then(() => consumeChanges('steve', [], currentSeq))
        .then(changes => {
          assertChangeIds(changes, ...allowedDocIds);
          changes.results.forEach(change => chai.expect(change.deleted).to.equal(true));
        });
    });

    it('filters deletions (tombstones) for concurrent users', () => {
      const allowedBob = createSomeContacts(3, 'fixture:bobville');
      const allowedSteve = createSomeContacts(3, 'fixture:steveville');

      let bobsSeq = 0;
      let stevesSeq = 0;

      return Promise
        .all([
          utils.saveDocs(allowedBob),
          utils.saveDocs(allowedSteve)
        ])
        .then(([ allowedBobResult, allowedSteveResult ]) => {
          allowedBobResult.forEach((doc, idx) => allowedBob[idx]._rev = doc.rev);
          allowedSteveResult.forEach((doc, idx) => allowedSteve[idx]._rev = doc.rev);
          return Promise.all([
            requestChanges('bob'),
            requestChanges('steve')
          ]);
        })
        .then(([ bobsChanges, stevesChanges ]) => {
          bobsSeq = bobsChanges.last_seq;
          stevesSeq = stevesChanges.last_seq;
          return Promise.all([
            utils.saveDocs(allowedBob.map(doc => Object.assign(doc, { _deleted: true }))),
            utils.saveDocs(allowedSteve.map(doc => Object.assign(doc, { _deleted: true }))),
          ]);
        })
        .then(() => Promise.all([
          consumeChanges('bob', [], bobsSeq),
          consumeChanges('steve', [], stevesSeq),
        ]))
        .then(([ bobsChanges, stevesChanges ]) => {
          assertChangeIds(bobsChanges, ...getIds(allowedBob));
          assertChangeIds(stevesChanges, ...getIds(allowedSteve));
        });
    });

    it('should forward changes requests when db name is not medic', () => {
      return utils
        .requestOnMedicDb({ path: '/_changes', auth: { username: 'bob', password } })
        .then(results => {
          return assertChangeIds(results, ...bobsIds);
        });
    });

    it('filters calls with irregular urls which match couchdb endpoint', () => {
      const options = {
        auth: { username: 'bob', password },
        method: 'GET'
      };

      return Promise
        .all([
          utils.requestOnTestDb(_.defaults({ path: '/_changes' }, options)),
          utils.requestOnTestDb(_.defaults({ path: '//_changes//' }, options)),
          utils.request(_.defaults({ path: `//${constants.DB_NAME}//_changes` }, options)),
          utils
            .requestOnTestDb(_.defaults({ path: '/_changes/dsad' }, options))
            .catch(err => err),
          utils
            .requestOnTestDb(_.defaults({ path: '//_changes//dsada' }, options))
            .catch(err => err),
          utils
            .request(_.defaults({ path: `//${constants.DB_NAME}//_changes//dsadada` }, options))
            .catch(err => err),
          utils.requestOnMedicDb(_.defaults({ path: '/_changes' }, options)),
          utils.requestOnMedicDb(_.defaults({ path: '//_changes//' }, options)),
          utils.request(_.defaults({ path: `//medic//_changes` }, options)),
          utils
            .requestOnMedicDb(_.defaults({ path: '/_changes/dsad' }, options))
            .catch(err => err),
          utils
            .requestOnMedicDb(_.defaults({ path: '//_changes//dsada' }, options))
            .catch(err => err),
          utils
            .request(_.defaults({ path: `//medic//_changes//dsadada` }, options))
            .catch(err => err),
        ])
        .then(results => {
          results.forEach(result => {
            if (result.results) {
              return assertChangeIds(result, ...bobsIds);
            }
            chai.expect(result.responseBody.error).to.equal('forbidden');
          });
        });
    });

    it('sends an error when couchdb returns an error', () => {
      return requestChanges('bob', { style: 'couchdb will love this', seq_interval: 'this as well' })
        .catch(err => {
          chai.expect(err).to.be.ok;
          chai.expect(err.statusCode).to.equal(500);
        });
    });

    it('should return the tombstone of a deleted doc', () => {
      const contact = createSomeContacts(1, 'fixture:bobville')[0];

      return utils.saveDoc(contact)
        .then(result => {
          contact._rev = result.rev;
          contact._deleted = true;

          return utils.saveDoc(contact);
        })
        .then(result => {
          contact._rev = result.rev;
          return getChangesForIds('bob', [contact._id], false, currentSeq);
        })
        .then(changes => {
          chai.expect(changes.length).to.equal(1);
          chai.expect(changes[0]).to.include({ id: contact._id, deleted: true });
          chai.expect(changes[0].changes[0].rev).to.equal(contact._rev);
        });
    });

    it('should not return tombstone of a deleted doc if doc is re-added', () => {
      const contact = createSomeContacts(1, 'fixture:bobville')[0];

      return utils.saveDoc(contact)
        .then(result => {
          contact._rev = result.rev;
          contact._deleted = true;

          return utils.saveDoc(contact);
        })
        .then(result => {
          contact._rev = result.rev;
          return getChangesForIds('bob', [contact._id], false, currentSeq);
        })
        .then(changes => {
          chai.expect(changes.length).to.equal(1);
          chai.expect(changes[0]).to.include({ id: contact._id, deleted: true });
          chai.expect(changes[0].changes[0].rev).to.equal(contact._rev);

          delete(contact._rev);
          delete(contact._deleted);
          return utils.saveDoc(contact);
        })
        .then(result => {
          contact._rev = result.rev;
          return sentinelUtils.waitForSentinel();
        })
        .then(() => getChangesForIds('bob', [contact._id], false, currentSeq))
        .then(changes => {
          chai.expect(changes.length).to.equal(1);
          chai.expect(changes[0]).to.include({ id: contact._id }).but.not.include({ deleted: true });
          chai.expect(changes[0].changes[0].rev).to.equal(contact._rev);
        });
    });

    it('normal feeds should replicate correctly when new changes are pushed', () => {
      const allowedDocs = createSomeContacts(25, 'fixture:bobville');
      const allowedDocs2 = createSomeContacts(25, 'fixture:bobville');
      const ids = [...getIds(allowedDocs), ...getIds(allowedDocs2)];

      // save docs in sequence
      const promiseChain = allowedDocs.reduce((promise, doc) => {
        return utils.delayPromise(() => promise.then(() => utils.saveDoc(doc)), 50);
      }, Promise.resolve());

      return utils
        .saveDocs(allowedDocs2)
        .then(() => Promise.all([
          getChangesForIds('bob', ids, true, currentSeq, 4),
          promiseChain
        ]))
        .then(([ changes ]) => {
          chai.expect(ids).to.have.members(_.uniq(getIds(changes)));
          chai.expect(changes.every(change => change.seq)).to.equal(true);
        });
    });
  });

  it('should filter the changes to relevant ones', () =>
    utils.saveDoc({ type:'clinic', parent:{ _id:'nowhere' } })
      .then(() => utils.saveDoc({ type:'clinic', _id:'very-relevant', parent:{ _id:'fixture:bobville' } }))
      .then(() => utils.saveDoc({ type:'clinic', parent:{ _id:'irrelevant-place' } }))
      .then(() => requestChanges('bob'))
      .then(changes =>
        assertChangeIds(changes,
          'org.couchdb.user:bob',
          'fixture:bobville',
          'fixture:user:bob',
          'very-relevant')));

  describe('reports with no associated contact', () => {
    describe('can_view_unallocated_data_records permission', () => {

      it('should be supplied if user has this perm and district_admins_access_unallocated_messages is enabled', () =>
        utils.updateSettings({district_admins_access_unallocated_messages: true}, true)
          .then(() => utils.saveDoc({ _id:'unallocated_report', type:'data_record' }))
          .then(() => requestChanges('bob'))
          .then(changes =>
            assertChangeIds(changes,
              'org.couchdb.user:bob',
              'fixture:bobville',
              'fixture:user:bob',
              'unallocated_report')));

      it('should not be supplied if user has perm but district_admins_access_unallocated_messages is disabled', () =>
        utils.saveDoc({ _id:'unallocated_report', type:'data_record' })
          .then(() => requestChanges('bob'))
          .then(changes  =>
            assertChangeIds(changes,
              'org.couchdb.user:bob',
              'fixture:user:bob',
              'fixture:bobville')));

      it('should NOT be supplied for a user without can_view_unallocated_data_records permission', () =>
        utils.saveDoc({ _id:'unallocated_report', type:'data_record' })
          .then(() => requestChanges('clare')) // She does not have the correct role
          .then(changes =>
            assertChangeIds(changes,
              'org.couchdb.user:clare',
              'fixture:user:clare',
              'fixture:clareville')));
    });
  });
  describe('replication depth', () => {

    it('should show contacts to a user only if they are within the configured depth', () =>
      utils.updateSettings({replication_depth: [{ role:'district_admin', depth:1 }]})
        .then(() => utils.saveDoc({ _id:'should-be-visible', type:'clinic', parent: { _id:'fixture:chwville' } }))
        .then(() => utils.saveDoc({
          _id:'should-be-hidden', reported_date: 1, type:'person',
          parent: { _id:'should-be-visible', parent:{ _id:'fixture:chwville' } }
        }))
        .then(() => requestChanges('chw'))
        .then(changes =>
          assertChangeIds(changes,
            'org.couchdb.user:chw',
            'fixture:user:chw',
            'fixture:chwville',
            'should-be-visible')));

    it('should correspond to the largest number for any role the user has', () =>
      utils.updateSettings({
        replication_depth: [
          { role:'district_admin', depth:1 },
          { role:'analytics', depth:2 },
        ]
      }, true)
        .then(() => utils.saveDoc({ _id:'should-be-visible', type:'clinic', parent: { _id:'fixture:chwville' } }))
        .then(() => utils.saveDoc({
          _id:'should-be-visible-too', reported_date: 1, type:'person',
          parent: { _id:'should-be-visible', parent:{ _id:'fixture:chwville' } }
        }))
        .then(() => requestChanges('chw'))
        .then(changes =>
          assertChangeIds(changes,
            'org.couchdb.user:chw',
            'fixture:user:chw',
            'fixture:chwville',
            'should-be-visible',
            'should-be-visible-too')));

    it('should have no effect if not configured', () =>
      utils.saveDoc({ _id:'should-be-visible', type:'clinic', parent: { _id:'fixture:chwville' } })
        .then(() => utils.saveDoc({
          _id:'should-also-be-visible', reported_date: 1, type:'person',
          parent: { _id:'should-be-visible', parent:{ _id:'fixture:chwville' } }
        }))
        .then(() => requestChanges('chw'))
        .then(changes =>
          assertChangeIds(changes,
            'org.couchdb.user:chw',
            'fixture:user:chw',
            'fixture:chwville',
            'should-be-visible',
            'should-also-be-visible')));

    describe('Needs signoff', () => {
      beforeEach(done => {
        const patient = {
          _id: 'clinic_patient',
          type: 'person',
          reported_date: 1,
          parent: { _id: 'fixture:chwville', parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}}
        };
        const healthCenterPatient = {
          _id: 'health_center_patient',
          type: 'person',
          reported_date: 1,
          parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}
        };
        utils.saveDocs([patient, healthCenterPatient]).then(done);
      });

      it('should do nothing when not truthy or not present', () => {
        const clinicReport = {
          _id: 'clinic_report',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'clinic_patient' },
          form: 'f',
          contact: {
            _id: 'fixture:user:chw',
            parent: { _id: 'fixture:chwville', parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}}
          }
        };
        const clinicReport2 = {
          _id: 'clinic_report_2',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'clinic_patient', needs_signoff: false },
          form: 'f',
          contact: {
            _id: 'fixture:user:chw',
            parent: { _id: 'fixture:chwville', parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}}
          }
        };
        const healthCenterReport = {
          _id: 'health_center_report',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'health_center_patient', needs_signoff: ''},
          form: 'f',
          contact: {
            _id: 'fixture:user:chw-boss',
            parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}
          }
        };
        const bobReport = {
          _id: 'bob_report',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'fixture:user:bob', needs_signoff: null },
          form: 'f',
          contact: {
            _id: 'fixture:user:bob',
            parent: { _id:'fixture:bobville', parent: { _id: parentPlace._id }}
          }
        };

        return utils
          .updateSettings({replication_depth: [{ role:'district_admin', depth: 1 }]})
          .then(() => utils.saveDocs([ clinicReport, clinicReport2, healthCenterReport, bobReport ]))
          .then(() => Promise.all([
            requestChanges('chw'), // chw > chwvillw > chw-bossville > parent_place
            requestChanges('chw-boss'), // chw-boss > chw-bossville > parent_place
            requestChanges('supervisor'), // supervisor > parent_place
            requestChanges('bob'), // bob > bobbille > parent_place
          ]))
          .then(([ chwChanges, chwBossChanges, supervisorChanges, bobChanges ]) => {
            assertChangeIds(chwChanges,
              'org.couchdb.user:chw',
              'fixture:user:chw',
              'fixture:chwville',
              'clinic_patient',
              'clinic_report',
              'clinic_report_2');

            assertChangeIds(chwBossChanges,
              'org.couchdb.user:chw-boss',
              'fixture:user:chw-boss',
              'fixture:chw-bossville',
              'fixture:chwville',
              'health_center_patient',
              'health_center_report');

            assertChangeIds(supervisorChanges,
              'org.couchdb.user:supervisor',
              'fixture:user:supervisor',
              'fixture:chw-bossville',
              'fixture:managerville',
              'fixture:clareville',
              'fixture:steveville',
              'fixture:bobville',
              'PARENT_PLACE');

            assertChangeIds(bobChanges,
              'org.couchdb.user:bob',
              'fixture:bobville',
              'fixture:user:bob',
              'bob_report');
          });
      });

      it('should replicate to all ancestors when present and truthy', () => {
        const clinicReport = {
          _id: 'clinic_report',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'clinic_patient', needs_signoff: true },
          form: 'f',
          contact: {
            _id: 'fixture:user:chw',
            parent: { _id: 'fixture:chwville', parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}}
          }
        };
        const clinicReport2 = {
          _id: 'clinic_report_2',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'clinic_patient', needs_signoff: 'something' },
          form: 'f',
          contact: {
            _id: 'fixture:user:chw',
            parent: { _id: 'fixture:chwville', parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}}
          }
        };
        const healthCenterReport = {
          _id: 'health_center_report',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'health_center_patient', needs_signoff: 'YES!'},
          form: 'f',
          contact: {
            _id: 'fixture:user:chw-boss',
            parent: { _id:'fixture:chw-bossville', parent: { _id: parentPlace._id }}
          }
        };
        const bobReport = {
          _id: 'bob_report',
          type: 'data_record',
          reported_date: 1,
          fields: { patient_id: 'fixture:user:bob', needs_signoff: {} },
          form: 'f',
          contact: {
            _id: 'fixture:user:bob',
            parent: { _id:'fixture:bobville', parent: { _id: parentPlace._id }}
          }
        };

        return utils
          .updateSettings({replication_depth: [{ role:'district_admin', depth: 1 }]})
          .then(() => utils.saveDocs([ clinicReport, clinicReport2, healthCenterReport, bobReport ]))
          .then(() => Promise.all([
            requestChanges('chw'), // chw > chwvillw > chw-bossville > parent_place
            requestChanges('chw-boss'), // chw-boss > chw-bossville > parent_place
            requestChanges('supervisor'), // supervisor > parent_place
            requestChanges('bob'), // bob > bobbille > parent_place
          ]))
          .then(([ chwChanges, chwBossChanges, supervisorChanges, bobChanges ]) => {
            assertChangeIds(chwChanges,
              'org.couchdb.user:chw',
              'fixture:user:chw',
              'fixture:chwville',
              'clinic_patient',
              'clinic_report',
              'clinic_report_2');

            assertChangeIds(chwBossChanges,
              'org.couchdb.user:chw-boss',
              'fixture:user:chw-boss',
              'fixture:chw-bossville',
              'fixture:chwville',
              'health_center_patient',
              'health_center_report',
              'clinic_report',
              'clinic_report_2');
            assertChangeIds(supervisorChanges,
              'org.couchdb.user:supervisor',
              'fixture:user:supervisor',
              'fixture:chw-bossville',
              'fixture:managerville',
              'fixture:clareville',
              'fixture:steveville',
              'fixture:bobville',
              'PARENT_PLACE',
              'health_center_report',
              'clinic_report',
              'clinic_report_2',
              'bob_report');

            assertChangeIds(bobChanges,
              'org.couchdb.user:bob',
              'fixture:bobville',
              'fixture:user:bob',
              'bob_report');
          });
      });
    });
  });

  it('should not return reports about your place by someone above you in the hierarchy', () =>
    utils
      .saveDoc({
        type:'data_record', _id:'chw-report', place_id:'fixture:chwville',
        contact:{ _id:'fixture:user:chw' }, form:'some-form'
      })
      .then(() => utils.saveDoc({
        type:'data_record', _id:'chw-boss-report', place_id:'fixture:chwville',
        contact:{ _id:'fixture:user:chw-boss' }, form:'some-form'
      }))
      .then(() => requestChanges('chw'))
      .then(changes =>
        assertChangeIds(changes,
          'org.couchdb.user:chw',
          'fixture:chwville',
          'fixture:user:chw',
          'chw-report')));

  it('should update the feed when the doc is updated', () => {
    let seq_number;

    return utils.saveDoc({ _id:'visible', type:'clinic', parent: { _id:'fixture:chwville' } })
      .then(() => requestChanges('chw'))
      .then(changes => {
        seq_number = changes.last_seq;

        return utils.getDoc('visible');
      })
      .then(doc => {
        doc.updated = true;

        return utils.saveDoc(doc);
      })
      .then(() => requestChanges('chw', { since: seq_number }))
      .then(changes => assertChangeIds(changes, 'visible'));
  });
});
