const _ = require('lodash');
const utils = require('../../../utils');
const sentinelUtils = require('../../sentinel/utils');
const uuid = require('uuid').v4;
const http = require('http');
const querystring = require('querystring');
const constants = require('../../../constants');
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
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:bobville',
    },
    contact: {
      _id: 'fixture:user:bob',
      name: 'Bob',
      patient_id: 'shortcode:user:bob',
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
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:clareville',
    },
    contact: {
      _id: 'fixture:user:clare',
      name: 'Clare',
      patient_id: 'shortcode:clare',
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
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:chw-bossville',
    },
    contact: {
      _id: 'fixture:user:chw-boss',
      name: 'CHW Boss',
      patient_id: 'shortcode:user:chw-boss',
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
      parent: 'fixture:chw-bossville',
      place_id: 'shortcode:chwville',
    },
    contact: {
      _id: 'fixture:user:chw',
      name: 'CHW',
      patient_id: 'shortcode:user:chw',
    },
    roles: ['district_admin', 'analytics']
  },
  {
    username: 'supervisor',
    password: password,
    place: 'PARENT_PLACE',
    contact: {
      _id: 'fixture:user:supervisor',
      name: 'Supervisor',
      patient_id: 'shortcode:user:supervisor',
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
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:steveville',
    },
    contact: {
      _id: 'fixture:user:steve',
      name: 'Steve',
      patient_id: 'shortcode:user:steve',
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
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:managerville',
    },
    contact: {
      _id: 'fixture:user:manager',
      name: 'Manager',
      patient_id: 'shortcode:user:manager',
    },
    roles: ['national_admin']
  },
];

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hostpital'
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
  const opts = { since: lastSeq };

  return requestChanges(username, opts).then(changes => {
    return getChangesSince(changes.last_seq).then(pending => {
      if (!pending.results.length && !changes.results.length) {
        return { results: results, last_seq: changes.last_seq };
      }
      results = results.concat(changes.results);
      return consumeChanges(username, results, changes.last_seq);
    });
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
    const lastSeq = changes.results.length ? changes.results[changes.results.length - 1].seq : changes.last_seq;

    if (docIds.find(id => !results.find(change => change.id === id)) || (retry && changes.results.length)) {
      return getChangesForIds(username, docIds, retry, lastSeq, limit, results);
    }

    return results;
  });
};

let currentSeq;
const getCurrentSeq = () => getLastSeq().then(lastSeq => currentSeq = lastSeq);
const getLastSeq = () => {
  return sentinelUtils.waitForSentinel()
    .then(() => utils.requestOnTestDb('/_changes?descending=true&limit=1'))
    .then(result => result.last_seq);
};
const getChangesSince = (since) => sentinelUtils
  .waitForSentinel()
  .then(() => utils.requestOnTestDb(`/_changes?since=${since}`));

describe('changes handler', () => {

  const DOCS_TO_KEEP = [
    'PARENT_PLACE',
    /^messages-/,
    /^fixture/,
    /^org.couchdb.user/,
  ];

  before(() => {
    // Bootstrap users
    return utils
      .saveDoc(parentPlace)
      .then(() => utils.createUsers(users, true));
  });

  after( async () => {
    // Clean up like normal
    await utils.revertDb([], true);// And also revert users we created in before
    await utils.deleteUsers(users, true);
  });


  beforeEach(() => getCurrentSeq());
  afterEach(() => utils.revertDb(DOCS_TO_KEEP, true));

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

    xit('should send heartbeats at specified intervals for all types of _changes requests', () => {
      const heartRateMonitor = options => {
        options = options || {};
        options.hostname = constants.API_HOST;
        options.auth = options.auth || `${constants.USERNAME}:${constants.PASSWORD}`;
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
            res.on('close', () => {
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
            setTimeout(() => req.destroy(), options.timeout);
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
            heartRateMonitor({ // online meta longpoll _changes
              path: '/medic-user-manager-meta/_changes',
              query: { since },
              auth: `manager:${password}`,
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

          // online user meta _changes
          chai.expect(results[2].heartbeats.length).to.equal(6);
          results[2].heartbeats.forEach((heartbeat, idx) => {
            chai.expect(heartbeat.chunk).to.equal(idx ? '\n' : '{"results":[\n');
            chai.expect(parseInt(heartbeat.interval / 1000)).to.be.below(3);
          });
          chai.expect(results[2].body).to.equal('{"results":[\n\n\n\n\n\n');
        });
    });
  });

  describe('Filtered replication', () => {

    let bobsIds;
    let stevesIds;

    beforeEach(async () => {
      bobsIds = ['org.couchdb.user:bob', 'fixture:user:bob', 'fixture:bobville'];
      stevesIds = ['org.couchdb.user:steve', 'fixture:user:steve', 'fixture:steveville'];
      await getCurrentSeq();
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
          // requests should return full changes list
          assertChangeIds(changes, ...bobsIds);
        });
    });

    it('filters allowed changes', () => {
      const allowedDocs = createSomeContacts(3, 'fixture:bobville');
      const deniedDocs = createSomeContacts(3, 'irrelevant-place');

      return Promise
        .all([
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

    it('filters correctly for concurrent users', () => {
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
            chai.expect(stevevilleIds).to.include.members(changeIds);
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

    it('filters allowed deletes', () => {
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
      const allowedDocs = createSomeContacts(100, 'fixture:bobville');
      const allowedDocs2 = createSomeContacts(100, 'fixture:bobville');
      const allowedDocs3 = createSomeContacts(100, 'fixture:bobville');
      const ids = [...getIds(allowedDocs), ...getIds(allowedDocs2), ...getIds(allowedDocs3)];

      // save docs in sequence
      const promiseChain = allowedDocs.reduce((promise, doc) => {
        return utils.delayPromise(() => promise.then(() => utils.saveDoc(doc)), 20);
      }, Promise.resolve());

      return utils
        .saveDocs(allowedDocs2)
        .then(() => Promise.all([
          getChangesForIds('bob', ids, true, currentSeq, 4),
          promiseChain,
          utils.delayPromise(() => utils.saveDocs(allowedDocs3), 200),
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
      utils.updateSettings({replication_depth: [{ role:'district_admin', depth:1 }]}, true)
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

    describe('report replication depth', () => {
      it('should show reports to a user only if they are within the configured depth', () => {
        const contacts = [
          {
            // depth = 2
            _id: 'chwville_patient',
            type: 'person',
            parent: { _id: 'fixture:chwville', parent: { _id: 'fixture:chw-bossville' } },
            name: 'patient',
          }
        ];
        const reports = [
          {
            // depth = 0, submitted by someone they can see
            _id: 'valid_report_1',
            form: 'form',
            contact: { _id: 'fixture:user:chw' },
            fields: {
              place_id: 'fixture:chw-bossville',
            },
            type: 'data_record',
          },
          {
            // depth = 2, submitted by the user himself
            _id: 'valid_report_2',
            form: 'form',
            contact: { _id: 'fixture:user:chw-boss' },
            fields: {
              patient_id: 'chwville_patient',
            },
            type: 'data_record',
          },
          {
            // depth = 1, submitted by someone they can't see
            _id: 'valid_report_3',
            form: 'form',
            contact: { _id: 'some_contact' },
            fields: {
              place_id: 'fixture:chwville',
            },
            type: 'data_record',
          },
          {
            // depth = 2, submitted by someone they can see
            _id: 'invalid_report_1',
            form: 'form',
            contact: { _id: 'fixture:user:chw' },
            fields: {
              patient_id: 'fixture:user:chw',
            },
            type: 'data_record'
          },
        ];

        return utils
          .updateSettings({ replication_depth: [{ role: 'district_admin', depth: 2, report_depth: 1 }] }, true)
          .then(() => utils.saveDocs(contacts))
          .then(() => utils.saveDocs(reports))
          .then(() => requestChanges('chw-boss'))
          .then(changes => {
            assertChangeIds(changes,
              'org.couchdb.user:chw-boss',
              'fixture:user:chw-boss',
              'fixture:user:chw',
              'fixture:chw-bossville',
              'chwville_patient',
              'fixture:chwville',
              'valid_report_1',
              'valid_report_2',
              'valid_report_3',
            );
          });
      });

      it('should replicate targets correctly', () => {
        const docs = [
          {
            // depth = 2, but not a report
            _id: 'target~chw',
            type: 'target',
            owner: 'fixture:user:chw'
          },
          {
            // depth = 2, submitted by someone they can see
            _id: 'invalid_report_1',
            form: 'form',
            contact: { _id: 'fixture:user:chw' },
            fields: {
              patient_id: 'fixture:user:chw',
            },
            type: 'data_record'
          },
          {
            // depth = 2, submitted by someone they can see
            _id: 'task~chw',
            type: 'task',
            user: 'org.couchdb.user:chw'
          },
        ];

        return utils
          .updateSettings({ replication_depth: [{ role: 'district_admin', depth: 2, report_depth: 1 }] }, true)
          .then(() => utils.saveDocs(docs))
          .then(() => requestChanges('chw-boss'))
          .then(changes => {
            assertChangeIds(changes,
              'org.couchdb.user:chw-boss',
              'fixture:user:chw-boss',
              'fixture:user:chw',
              'fixture:chw-bossville',
              'fixture:chwville',
              'target~chw',
            );
          });
      });

      it('users should replicate tasks and targets correctly', () => {
        const docs = [
          {
            // depth = 1
            _id: 'some_contact',
            type: 'person',
            parent: { _id: 'fixture:chwville' },
            name: 'other_contact'
          },
          {
            // depth = 0, submitted by someone they can see (not sensitive)
            _id: 'valid_report_1',
            type: 'data_record',
            form: 'form',
            contact: { _id: 'some_contact' },
            fields: { place_id: 'fixture:chwville' }
          },
          {
            // depth = 1,
            _id: 'target~chw',
            type: 'target',
            owner: 'fixture:user:chw',
          },
          {
            // depth = 1
            _id: 'task~chw',
            type: 'task',
            user: 'org.couchdb.user:chw',
          },
          {
            // depth = 1, submitted by the user themselves
            _id: 'valid_report_2',
            type: 'data_record',
            form: 'form',
            contact: { _id: 'fixture:user:chw' },
            fields: { patient_id: 'some_contact' }
          },
          {
            // depth = 1, submitted by someone the user can see
            _id: 'invalid_report_1',
            type: 'data_record',
            form: 'form',
            contact: { _id: 'some_contact' },
            fields: { patient_id: 'some_contact' }
          },
        ];

        return utils
          .updateSettings({ replication_depth: [{ role: 'district_admin', depth: 1, report_depth: 0 }] }, true)
          .then(() => utils.saveDocs(docs))
          .then(() => requestChanges('chw'))
          .then(changes => {
            assertChangeIds(changes,
              'org.couchdb.user:chw',
              'fixture:user:chw',
              'fixture:chwville',
              'target~chw',
              'task~chw',
              'valid_report_1',
              'valid_report_2',
              'some_contact',
            );
          });
      });
    });

    describe('Needs signoff', () => {
      beforeEach(() => {
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
        return utils.saveDocs([patient, healthCenterPatient]);
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
          .updateSettings({replication_depth: [{ role:'district_admin', depth: 1 }]}, true)
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
          .updateSettings({replication_depth: [{ role:'district_admin', depth: 1 }]}, true)
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

      it('should work with report replication depth', () => {
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
          .updateSettings({replication_depth: [{ role:'district_admin', depth: 1, report_depth: 0 }]}, true)
          .then(() => utils.saveDocs([ clinicReport, clinicReport2, healthCenterReport, bobReport ]))
          .then(() => Promise.all([
            requestChanges('chw'), // chw > chwvillw > chw-bossville > parent_place
            requestChanges('chw-boss'), // chw-boss > chw-bossville > parent_place
            requestChanges('supervisor'), // supervisor > parent_place
            requestChanges('bob'), // bob > bobville > parent_place
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

  it('should not return sensitive reports about your place by someone above you in the hierarchy', () => {
    const docs = [
      {
        // report about home place submitted by logged in user
        _id: 'chw-report-1',
        type: 'data_record',
        place_id: 'fixture:chwville',
        contact: { _id: 'fixture:user:chw' },
        form: 'form',
      },
      {
        // private report about place submitted by logged in user
        _id: 'chw-report-2',
        type: 'data_record',
        place_id: 'fixture:chwville',
        contact: { _id: 'fixture:user:chw' },
        form: 'form',
        fields: { private: true },
      },
      {
        // private report about place submitted by logged in user
        _id: 'chw-report-3',
        type: 'data_record',
        contact: { _id: 'fixture:user:chw' },
        form: 'form',
        fields: { private: true, place_id: 'shortcode:chwville', },
      },
      {
        // private report about self submitted by logged in user
        _id: 'chw-report-4',
        type: 'data_record',
        patient_id: 'shortcode:user:chw',
        contact: { _id: 'fixture:user:chw' },
        form: 'form',
        fields: { private: true },
      },
      {
        // private report about self submitted by logged in user
        _id: 'chw-report-5',
        type: 'data_record',
        contact: { _id: 'fixture:user:chw' },
        form: 'form',
        fields: { private: true, patient_id: 'shortcode:user:chw', },
      },
      {
        // report about place submitted by someone else
        _id: 'chw-report-6',
        type: 'data_record',
        place_id: 'fixture:chwville',
        contact: { _id: 'someone_else' },
        form: 'form',
      },
      {
        // report about place submitted by someone else
        _id: 'chw-report-7',
        type: 'data_record',
        contact: { _id: 'someone_else' },
        fields: { place_id: 'shortcode:chwville' },
        form: 'form',
      },
      {
        // private report about place submitted by someone else
        _id: 'chw-report-8',
        type: 'data_record',
        place_id: 'fixture:chwville',
        contact: { _id: 'someone_else' },
        form: 'form',
        fields: { private: true },
      },
      {
        // private report about place submitted by someone else
        _id: 'chw-report-9',
        type: 'data_record',
        contact: { _id: 'someone_else' },
        form: 'form',
        fields: { private: true, place_id: 'shortcode:chwville', },
      },
      {
        // private report about self submitted by someone else
        _id: 'chw-report-10',
        type: 'data_record',
        contact: { _id: 'someone_else' },
        form: 'form',
        fields: { private: true, patient_id: 'shortcode:user:chw', },
      },
      {
        // private report about self submitted by someone else
        _id: 'chw-report-11',
        type: 'data_record',
        contact: { _id: 'someone_else' },
        form: 'form',
        fields: { private: true, patient_uuid: 'fixture:user:chw', },
      },
    ];
    return utils
      .saveDocs(docs)
      .then(() => requestChanges('chw'))
      .then(changes => {
        assertChangeIds(changes,
          'org.couchdb.user:chw',
          'fixture:chwville',
          'fixture:user:chw',
          'chw-report-1',
          'chw-report-2',
          'chw-report-3',
          'chw-report-4',
          'chw-report-5',
          'chw-report-6',
          'chw-report-7',
        );
      });
  });

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
