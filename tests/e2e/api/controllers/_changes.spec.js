const _ = require('underscore'),
      utils = require('../../../utils'),
      uuid = require('uuid'),
      http = require('http'),
      querystring = require('querystring'),
      constants = require('../../../constants'),
      auth = require('../../../auth')(),
      semver = require('semver');

const DEFAULT_EXPECTED = [
  'appcache',
  'settings',
  'resources',
  '_design/medic-client'
];

function assertChangeIds(changes) {
  changes = changes.results;

  // * filter out deleted entries - we never delete in our production code, but
  // some docs are deleted in the test setup/teardown
  //  * also filter out translation documents and other expected documents
  changes = _.reject(changes, function(change) {
    return change.deleted ||
           change.id.startsWith('messages-') ||
           DEFAULT_EXPECTED.indexOf(change.id) !== -1;
  });

  var expectedIds = Array.prototype.slice.call(arguments, 1);
  expect(_.unique(_.pluck(changes, 'id')).sort()).toEqual(expectedIds.sort());
}

function requestChanges(username, params = {}) {
  const queryParams = querystring.stringify(params);
  const options = {
    path: `/_changes${queryParams ? `?${queryParams}`: ''}`,
    auth: `${username}:${password}`
  };
  return utils.requestOnTestDb(options);
}

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
      type: 'district_hospital',
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

const getChangesForIds = (username, docIds, lastSeq = 0, limit = 100, results = []) => {
  return requestChanges(username, { since: lastSeq, limit }).then(changes => {
    changes.results.forEach(change => {
      if (docIds.includes(change.id)) {
        results.push(change);
      }
    });

    // simulate PouchDB seq selection
    const last_seq = changes.results.length ? changes.results[changes.results.length - 1].seq : changes.last_seq;

    if (docIds.find(id => !results.find(change => change.id === id)) || changes.results.length) {
      return getChangesForIds(username, docIds, last_seq, limit, results);
    }

    return results;
  });
};

let currentSeq;
const getCurrentSeq = () => {
  return utils
    .requestOnTestDb('/_changes?descending=true&limit=1')
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
    let promises = utils.saveDoc(parentPlace);

    users.forEach(user => {
      promises = promises.then(() => utils.request({
        path: '/api/v1/users',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: user
      }));
    });

    return promises.then(done);
  });

  afterAll(done =>
    // Clean up like normal
    utils
      .revertDb()
      // And also revert users we created in before
      .then(() => utils.deleteUsers(users.map(user => user.username)))
      .then(() => Promise.all(users.map(user =>
        utils.request({
          path: `/medic-user-${user.username}-meta`,
          method: 'DELETE'
        })
      )))
      .then(done));

  afterEach(done => utils.revertDb(DOCS_TO_KEEP).then(done));

  describe('requests', () => {
    beforeAll(()=> Promise.all(users.map(user =>
      utils.request({
        path: `/medic-user-${user.username}-meta`,
        method: 'PUT'
      }))));

    it('should allow DB admins to POST to _changes', () => {
      return utils
        .requestOnTestDb({
          path: '/_changes?since=0&filter=_doc_ids&heartbeat=10000',
          method: 'POST',
          body: JSON.stringify({ doc_ids: ['org.couchdb.user:bob'] }),
          headers: { 'Content-Type': 'application/json' }
        })
        .then(result => {
          expect(result.results).toBeTruthy();
        });
    });

    it('should copy proxied response headers', () => {
      const options = {
        hostname: constants.API_HOST,
        port: constants.API_PORT,
        auth: auth.user + ':' + auth.pass,
        path: `/${constants.DB_NAME}/_changes?limit=1`
      };

      return new Promise((resolve, reject) => {
          const req = http.request(options, res => {
            res.on('data', () => {});
            res.on('end', () => resolve(res.headers));
          });

          req.on('error', e => reject(e));
          req.end();
        })
        .then(headers => {
          expect(headers).toBeTruthy();
          expect(headers['content-type']).toEqual('application/json');
          expect(headers.server).toBeTruthy();
        });
    });

    it('should send heartbeats at specified intervals for all types of _changes requests', () => {
      const heartRateMonitor = options => {
        options = options || {};
        options.hostname = constants.API_HOST;
        options.port = constants.API_PORT;
        options.auth = options.auth || auth.user + ':' + auth.pass;
        options.path = options.path || '/';
        options.query = _.extend({ heartbeat: 2000, feed: 'longpoll' }, options.query || {});
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

          if (options.body) {
            if (typeof options.body === 'string') {
              req.write(options.body);
            } else {
              req.write(JSON.stringify(options.body));
            }
          }

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
              query: { since, timeout: 21000, heartbeat: 5000 } // 4 heartbeats
            }),
            heartRateMonitor({ // online meta longpoll _changes
              path: '/medic-user-manager-meta/_changes',
              query: { since },
              timeout: 11000 // 5 heartbeats
            }),
            heartRateMonitor({ // offline meta longpoll _changes
              path: '/medic-user-bob-meta/_changes',
              query: { since },
              timeout: 11000 // 5 heartbeats
            }),
          ]);
        })
        .then(results => {
          // admin _changes
          expect(results[0].heartbeats.length).toEqual(6);
          results[0].heartbeats.forEach((heartbeat, idx) => {
            if (idx === 0) {
              expect(heartbeat.chunk).toEqual('{"results":[\n');
            } else {
              expect(heartbeat.chunk).toEqual('\n');
            }
            expect(parseInt(heartbeat.interval / 1000)).toBeLessThan(3);
          });
          expect(results[0].body).toEqual('{"results":[\n\n\n\n\n\n');

          // online user _changes
          expect(results[1].heartbeats.length).toEqual(6);
          results[1].heartbeats.forEach((heartbeat, idx) => {
            if (idx === 0) {
              expect(heartbeat.chunk).toEqual('{"results":[\n');
            } else {
              expect(heartbeat.chunk).toEqual('\n');
            }
            expect(parseInt(heartbeat.interval / 1000)).toBeLessThan(3);
          });
          expect(results[1].body).toEqual('{"results":[\n\n\n\n\n\n');

          // offline user _changes
          // `last_seq` doesn't necessarily match the `since` we requested
          expect(results[2].body.startsWith('\n\n\n\n{"results":[],"last_seq":')).toEqual(true);
          results[2].heartbeats.forEach((heartbeat, idx) => {
            if (idx === 4) {
              expect(heartbeat.chunk.startsWith('{"results":[],"last_seq":"')).toEqual(true);
            } else {
              expect(heartbeat.chunk).toEqual('\n');
            }
            expect(parseInt(heartbeat.interval / 1000)).toBeLessThan(6);
          });

          // online user meta _changes
          expect(results[0].heartbeats.length).toEqual(6);
          results[0].heartbeats.forEach((heartbeat, idx) => {
            if (idx === 0) {
              expect(heartbeat.chunk).toEqual('{"results":[\n');
            } else {
              expect(heartbeat.chunk).toEqual('\n');
            }
            expect(parseInt(heartbeat.interval / 1000)).toBeLessThan(3);
          });
          expect(results[0].body).toEqual('{"results":[\n\n\n\n\n\n');

          // ofline user meta _changes
          expect(results[1].heartbeats.length).toEqual(6);
          results[1].heartbeats.forEach((heartbeat, idx) => {
            if (idx === 0) {
              expect(heartbeat.chunk).toEqual('{"results":[\n');
            } else {
              expect(heartbeat.chunk).toEqual('\n');
            }
            expect(parseInt(heartbeat.interval / 1000)).toBeLessThan(3);
          });
          expect(results[1].body).toEqual('{"results":[\n\n\n\n\n\n');
        });
    });
  });

  describe('Filtered replication', () => {
    const bobsIds = [...DEFAULT_EXPECTED],
          stevesIds = [...DEFAULT_EXPECTED],
          couchVersionForBatching = '2.3.0';

    let shouldBatchChangesRequests;

    beforeAll(done => {
      const options = {
        hostname: constants.COUCH_HOST,
        port: constants.COUCH_PORT,
        auth: auth.user + ':' + auth.pass,
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

    beforeEach(done => getCurrentSeq().then(done));

    it('should successfully fully replicate (with or without limit)', () => {
      const allowedDocs = createSomeContacts(12, 'fixture:bobville');
      bobsIds.push(..._.pluck(allowedDocs, '_id'));

      const deniedDocs = createSomeContacts(10, 'irrelevant-place');
      return Promise.all([
        utils.saveDocs(allowedDocs),
        utils.saveDocs(deniedDocs)
      ])
        .then(() => batchedChanges('bob', 4))
        .then(changes => {
          assertChangeIds(changes,
            'org.couchdb.user:bob',
            'fixture:user:bob',
            'fixture:bobville',
            ..._.without(bobsIds, ...DEFAULT_EXPECTED));
        });
    });

    it('depending on CouchDB version, should limit changes requests or specifically ignore limit', () => {
      const allowedDocs = createSomeContacts(12, 'fixture:bobville');
      bobsIds.push(..._.pluck(allowedDocs, '_id'));
      const deniedDocs = createSomeContacts(10, 'irrelevant-place'),
            expectedIds = [ 'org.couchdb.user:bob', 'fixture:user:bob', 'fixture:bobville'].concat(bobsIds);

      return Promise
        .all([
          utils.saveDocs(allowedDocs),
          utils.saveDocs(deniedDocs)
        ])
        .then(() => requestChanges('bob', { limit: 4 }))
        .then(changes => {
          if (shouldBatchChangesRequests) {
            // requests should be limited
            expect(changes.results.every(change => expectedIds.indexOf(change.id) !== -1 || change.id.startsWith('messages-'))).toBe(true);
            // because we still process pending changes, it's not a given we will receive only 4 changes.
            expect(expectedIds.every(id => changes.results.find(change => change.id === id))).toBe(false);
          } else {
            // requests should return full changes list
            assertChangeIds(changes,
              'org.couchdb.user:bob',
              'fixture:user:bob',
              'fixture:bobville',
              ..._.without(bobsIds, ...DEFAULT_EXPECTED));
          }
        });
    });

    it('normal feeds should replicate correctly when new changes are pushed', () => {
      const allowedDocs = createSomeContacts(25, 'fixture:bobville'),
            allowedDocs2 = createSomeContacts(25, 'fixture:bobville');

      const ids = _.pluck(allowedDocs, '_id');
      ids.push(..._.pluck(allowedDocs2, '_id'));

      const promise = allowedDocs.reduce((promise, doc) => {
        return promise.then(() => utils.saveDoc(doc));
      }, Promise.resolve());

      return utils
        .saveDocs(allowedDocs2)
        .then(() => Promise.all([
          promise,
          getChangesForIds('bob', ids, currentSeq, 4),
        ]))
        .then(([ p, changes ]) => {
          expect(ids.every(id => changes.find(change => change.id === id))).toBe(true);
          expect(changes.some(change => !change.seq)).toBe(false);
        });
    });

    it('filters allowed changes in longpolls', () => {
      const allowedDocs = createSomeContacts(3, 'fixture:bobville');
      const deniedDocs = createSomeContacts(3, 'irrelevant-place');
      bobsIds.push(..._.pluck(allowedDocs, '_id'));

      return Promise.all([
          consumeChanges('bob', [], currentSeq),
          utils.saveDocs(allowedDocs),
          utils.saveDocs(deniedDocs)
        ])
        .then(([changes]) => {
          expect(changes.results.every(change => bobsIds.indexOf(change.id) !== -1)).toBe(true);
        });
    });

    it('filters correctly for concurrent users on initial replication', () => {
      const allowedBob = createSomeContacts(3, 'fixture:bobville');
      const allowedSteve = createSomeContacts(3, 'fixture:steveville');
      bobsIds.push(..._.pluck(allowedBob, '_id'));
      stevesIds.push(..._.pluck(allowedSteve, '_id'));

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
          assertChangeIds(bobsChanges,
            'org.couchdb.user:bob',
            'fixture:user:bob',
            'fixture:bobville',
            ...allowedBob.map(doc => doc._id));
          assertChangeIds(stevesChanges,
            'org.couchdb.user:steve',
            'fixture:user:steve',
            'fixture:steveville',
            ...allowedSteve.map(doc => doc._id));
        });
    });

    it('filters correctly for concurrent users on longpolls', () => {
      const allowedBob = createSomeContacts(3, 'fixture:bobville');
      const allowedSteve = createSomeContacts(3, 'fixture:steveville');
      bobsIds.push(..._.pluck(allowedBob, '_id'));
      stevesIds.push(..._.pluck(allowedSteve, '_id'));

      return Promise.all([
          consumeChanges('bob', [], currentSeq),
          consumeChanges('steve', [], currentSeq),
          utils.saveDocs(allowedBob),
          utils.saveDocs(allowedSteve),
        ])
        .then(([ bobsChanges, stevesChanges ]) => {
          expect(bobsChanges.results.every(change => _.pluck(allowedBob, '_id').indexOf(change.id) !== -1)).toBe(true);
          expect(stevesChanges.results.every(change => _.pluck(allowedSteve, '_id').indexOf(change.id) !== -1)).toBe(true);
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
      bobsIds.push(...newIds);
      newIds.push(...DEFAULT_EXPECTED);
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
          expect(changes.results.length).toBeGreaterThanOrEqual(2);
          expect(changes.results.every(change => newIds.indexOf(change.id) !== -1)).toBe(true);
        });
    });

    it('restarts longpoll feeds when settings are changed', () => {
      return Promise
        .all([
          requestChanges('steve', { feed: 'longpoll', since: currentSeq }),
          requestChanges('bob', { feed: 'longpoll', since: currentSeq }),
          new Promise(resolve => {
            setTimeout(() => {
              resolve(utils.updateSettings({ changes_controller: _.defaults({ reiterate_changes: false }, defaultSettings) }, true));},
              300);
            })
        ])
        .then(([ stevesChanges, bobsChanges ]) => {
          expect(stevesChanges.results.length).toBeGreaterThanOrEqual(1);
          expect(bobsChanges.results.length).toBeGreaterThanOrEqual(1);
          expect(stevesChanges.results.find(change => change.id === 'settings')).toBeTruthy();
          expect(bobsChanges.results.find(change => change.id === 'settings')).toBeTruthy();
          expect(stevesChanges.last_seq !== currentSeq).toBe(true);
          expect(bobsChanges.last_seq !== currentSeq).toBe(true);
          expect(bobsChanges.results.every(change => bobsIds.indexOf(change.id) !== -1)).toBe(true);
          expect(stevesChanges.results.every(change => stevesIds.indexOf(change.id) !== -1)).toBe(true);
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
      bobsIds.push(...newIds);
      newIds.push(...DEFAULT_EXPECTED);
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
              expect(changes.results.length).toBeGreaterThanOrEqual(2);
              expect(changes.results.every(change => newIds.indexOf(change.id) !== -1)).toBe(true);
            });
        });
    });

    it('returns correct results when only medic user-settings doc facility_id is updated', () => {
      const allowedBob = createSomeContacts(3, 'fixture:bobville');
      const allowedSteve = createSomeContacts(3, 'fixture:steveville');
      bobsIds.push(..._.pluck(allowedBob, '_id'));
      stevesIds.push(..._.pluck(allowedSteve, '_id'));

      return utils
        .getDoc('org.couchdb.user:steve')
        .then(stevesUser => {
          return Promise.all([
            requestChanges('steve', { feed: 'longpoll', since: currentSeq }),
            utils.saveDocs(allowedBob),
            utils.saveDocs(allowedSteve),
            utils.saveDoc(_.extend(stevesUser, { facility_id: 'fixture:bobville' })),
          ]);
        })
        .then(([ changes ]) => {
          expect(changes.results.every(change => stevesIds.indexOf(change.id) !== -1 ||
                                                 change.id === 'org.couchdb.user:steve')
          ).toBe(true);
          return requestChanges('steve', { since: currentSeq });
        })
        .then(changes => {
          expect(changes.results.every(change => stevesIds.indexOf(change.id) !== -1 ||
                                                 change.id === 'org.couchdb.user:steve')
          ).toBe(true);
        });
    });

    it('returns correct results when user is updated while changes request is active', () => {
      const allowedBob = createSomeContacts(3, 'fixture:bobville');
      const allowedSteve = createSomeContacts(3, 'fixture:steveville');
      bobsIds.push(..._.pluck(allowedBob, '_id'));
      stevesIds.push(..._.pluck(allowedSteve, '_id'));

      return utils
        .updateSettings({ changes_controller: _.defaults({ reiterate_changes: true }, defaultSettings) }, true)
        .then(() => getCurrentSeq('steve'))
        .then(() => {
          return Promise
            .all([
              utils.request({ path: '/_users/org.couchdb.user:steve' }),
              utils.getDoc('org.couchdb.user:steve')
            ])
            .then(([ user, medicUser ]) => {
              return Promise.all([
                requestChanges('steve', { feed: 'longpoll', since: currentSeq }),
                new Promise(resolve => {
                  setTimeout(() => {
                    utils
                      .request({
                        path: `/_users/org.couchdb.user:steve?rev=${user._rev}`,
                        method: 'PUT',
                        json: true,
                        body: _.extend(user, { facility_id: 'fixture:bobville' })
                      })
                      .then(() => Promise.all([
                        utils.saveDoc(_.extend(medicUser, { facility_id: 'fixture:somethingville', roles: ['_admin'] })),
                        utils.saveDocs(allowedBob),
                        utils.saveDocs(allowedSteve),
                      ]))
                      .then(resolve);
                  }, 1000);
                })
              ]);
            })
            .then(([ changes ]) => {
              if (changes.results.find(change => change.id === 'org.couchdb.user:steve')) {
                expect(changes.results.every(change => bobsIds.indexOf(change.id) !== -1 ||
                                                       change.id === 'org.couchdb.user:steve' ||
                                                       change.id === 'settings')
                ).toBe(true);
              }
            })
            .then(() => utils.request({ path: '/_users/org.couchdb.user:steve' }))
            .then(user => utils.request({
              path: `/_users/org.couchdb.user:steve?rev=${user._rev}`,
              method: 'PUT',
              json: true,
              body: _.extend(user, { facility_id: 'fixture:steveville' })
            }));
        });
    });

    it('filters allowed deletes in longpolls', () => {
      const allowedDocs = createSomeContacts(3, 'fixture:bobville');
      const deniedDocs = createSomeContacts(3, 'irrelevant-place');
      bobsIds.push(..._.pluck(allowedDocs, '_id'));

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
          utils.saveDocs(deniedDocs.map(doc => _.extend(doc, { _deleted: true }))),
          utils.saveDocs(allowedDocs.map(doc => _.extend(doc, { _deleted: true })))
        ]))
        .then(([ changes ]) => {
          expect(changes.results.every(change => bobsIds.indexOf(change.id) !== -1)).toBe(true);
          expect(changes.results.some(change => change.deleted)).toBe(true);
        });
    });

    it('filters deletions (tombstones)', () => {
      const allowedDocs = createSomeContacts(5, 'fixture:steveville');
      const deniedDocs = createSomeContacts(5, 'irrelevant-place');
      stevesIds.push(..._.pluck(allowedDocs, '_id'));
      const allowedDocIds = allowedDocs.map(doc => doc._id);

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
          assertChangeIds(changes,
            'org.couchdb.user:steve',
            'fixture:steveville',
            'fixture:user:steve',
            ...allowedDocIds);
          return getCurrentSeq();
        })
        .then(() => {
          return Promise.all([
            utils.saveDocs(deniedDocs.map(doc => _.extend(doc, { _deleted: true }))),
            utils.saveDocs(allowedDocs.map(doc => _.extend(doc, { _deleted: true }))),
          ]);
        })
        .then(() => requestChanges('steve'))
        .then(changes => {
          assertChangeIds(changes,
            'org.couchdb.user:steve',
            'fixture:steveville',
            'fixture:user:steve');
          return Promise.resolve();
        })
        .then(() => consumeChanges('steve', [], currentSeq))
        .then(changes => {
          expect(changes.results.every(change => stevesIds.indexOf(change.id) !== -1)).toBe(true);
          expect(changes.results.every(change => change.deleted || DEFAULT_EXPECTED.indexOf(change.id) !== -1)).toBe(true);
        });
    });

    it('filters deletions (tombstones) for concurrent users', () => {
      const allowedBob = createSomeContacts(3, 'fixture:bobville');
      const allowedSteve = createSomeContacts(3, 'fixture:steveville');
      bobsIds.push(..._.pluck(allowedBob, '_id'));
      stevesIds.push(..._.pluck(allowedSteve, '_id'));
      let bobsSeq = 0,
          stevesSeq = 0;
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
           utils.saveDocs(allowedBob.map(doc => _.extend(doc, { _deleted: true }))),
           utils.saveDocs(allowedSteve.map(doc => _.extend(doc, { _deleted: true }))),
         ]);
       })
       .then(() => Promise.all([
         consumeChanges('bob', [], bobsSeq),
         consumeChanges('steve', [], stevesSeq),
       ]))
       .then(([ bobsChanges, stevesChanges ]) => {
         expect(bobsChanges.results.every(change => bobsIds.indexOf(change.id) !== -1)).toBe(true);
         expect(stevesChanges.results.every(change => stevesIds.indexOf(change.id) !== -1)).toBe(true);
       });
    });

    it('filters calls with irregular urls which match couchdb endpoint', () => {
      const options = {
        auth: `bob:${password}`,
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
            .catch(err => err)
        ])
        .then(results => {
          results.forEach(result => {
            if (result.results) {
              return assertChangeIds(result,
                'org.couchdb.user:bob',
                'fixture:bobville',
                'fixture:user:bob');
            }

            expect(result.responseBody.error).toEqual('forbidden');
          });
        });
    });

    it('sends an error when couchdb returns an error', () => {
      return requestChanges('bob', { style: 'couchdb will love this', seq_interval: 'this as well' })
        .catch(err => {
          expect(err).toBeTruthy();
          expect(err.message.includes('Error processing your changes')).toEqual(true);
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

      it('should be supplied if user has this permission and district_admins_access_unallocated_messages is enabled', () =>
        utils.updateSettings({district_admins_access_unallocated_messages: true}, true)
          .then(() => utils.saveDoc({ _id:'unallocated_report', type:'data_record' }))
          .then(() => requestChanges('bob'))
          .then(changes =>
            assertChangeIds(changes,
                'org.couchdb.user:bob',
                'fixture:bobville',
                'fixture:user:bob',
                'unallocated_report')));

      it('should not be supplied if user has this permission but district_admins_access_unallocated_messages is disabled', () =>
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
      utils.updateSettings({replication_depth: [{ role:'district_admin', depth:1 }]}, true)
        .then(() => utils.saveDoc({ _id:'should-be-visible', type:'clinic', parent: { _id:'fixture:chwville' } }))
        .then(() => utils.saveDoc({ _id:'should-be-hidden', reported_date: 1, type:'person', parent: { _id:'should-be-visible', parent:{ _id:'fixture:chwville' } } }))
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
        .then(() => utils.saveDoc({ _id:'should-be-visible-too', reported_date: 1, type:'person', parent: { _id:'should-be-visible', parent:{ _id:'fixture:chwville' } } }))
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
        .then(() => utils.saveDoc({ _id:'should-also-be-visible', reported_date: 1, type:'person', parent: { _id:'should-be-visible', parent:{ _id:'fixture:chwville' } } }))
        .then(() => requestChanges('chw'))
        .then(changes =>
          assertChangeIds(changes,
              'org.couchdb.user:chw',
              'fixture:user:chw',
              'fixture:chwville',
              'should-be-visible',
              'should-also-be-visible')));
  });

  it('should not return reports about your place by someone above you in the hierarchy', () =>
    utils.saveDoc({ type:'data_record', _id:'chw-report', place_id:'fixture:chwville', contact:{ _id:'fixture:user:chw' }, form:'some-form' })
      .then(() => utils.saveDoc({ type:'data_record', _id:'chw-boss-report', place_id:'fixture:chwville', contact:{ _id:'fixture:user:chw-boss' }, form:'some-form' }))
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
