const _ = require('underscore'),
      utils = require('../../../utils');

function assertChangeIds(changes) {
  const DEFAULT_EXPECTED = [
    'appcache',
    'settings',
    'resources',
    '_design/medic-client'
  ];

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
  expect(_.pluck(changes, 'id').sort()).toEqual(expectedIds.sort());
}

function requestChanges(username, params = {}) {
  const queryParams = _.map(params, (value, key) => `${key}=${value}`).join('&');
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
    roles: []
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
    roles: []
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
    roles: []
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
      _id: `random_contact_${parent._id}_${i}`,
      type: `clinic`,
      parent: parent
    });
  }

  return docs;
};

const consumeChanges = (username, results, lastSeq) => {
  const opts = { since: lastSeq, feed: 'longpoll' };
  if (results.length) {
    opts.timeout = 2000;
  }

  return requestChanges(username, opts).then(changes => {
    if (!changes.results.length) {
      return results;
    }
    results = results.concat(changes.results);
    return consumeChanges(username, results, changes.last_seq);
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
    utils.revertDb()
    // And also revert users we created in before
    .then(() => {
      const userDocs = users.map(({username}) => `org.couchdb.user:${username}`);

      return utils.request('/_users/_all_docs')
        .then(({rows}) => {
          const deleteMe = rows
            .filter(({id}) => userDocs.includes(id))
            .map(row => ({
              _id: row.id,
              _rev: row.value.rev,
              _deleted: true
            }));

            return utils.request({
              path: '/_users/_bulk_docs',
              method: 'POST',
              body: JSON.stringify({ docs: deleteMe }),
              headers: { 'content-type': 'application/json' }
            });
        });
      })
    .then(done));

  afterEach(done => utils.revertDb(DOCS_TO_KEEP).then(done));

  describe('Filtered replication', () => {
    it('returns a full list of allowed changes, regardless of the requested limit', () => {
      const allowedDocs = createSomeContacts(12, 'fixture:bobville');
      const deniedDocs = createSomeContacts(10, 'irrelevant-place');
      return utils
        .updateSettings( { changes_doc_ids_optimization_threshold: 5 }, true)
        .then(() => Promise.all([
          utils.saveDocs(allowedDocs),
          utils.saveDocs(deniedDocs)
        ]))
        .then(() => requestChanges('bob', { limit: 7 }))
        .then(changes => {
          assertChangeIds(changes,
            'org.couchdb.user:bob',
            'fixture:user:bob',
            'fixture:bobville',
            ...allowedDocs.map(doc => doc._id));
        });
    });

    it('filters deletions (tombstones)', () => {
      const allowedDocs = createSomeContacts(5, 'fixture:bobville');
      const deniedDocs = createSomeContacts(5, 'irrelevant-place');
      const allowedDocIds = allowedDocs.map(doc => doc._id);
      let seq = 0;

      return Promise
        .all([
          utils.saveDocs(allowedDocs),
          utils.saveDocs(deniedDocs)
        ])
        .then(([ allowedDocsResult, deniedDocsResult ]) => {
          allowedDocsResult.forEach((doc, idx) => allowedDocs[idx]._rev = doc.rev);
          deniedDocsResult.forEach((doc, idx) => deniedDocs[idx]._rev = doc.rev);
          return requestChanges('bob');
        })
        .then(changes => {
          seq = changes.last_seq;
          assertChangeIds(changes,
            'org.couchdb.user:bob',
            'fixture:bobville',
            'fixture:user:bob',
            ...allowedDocIds);
          return Promise.resolve();
        })
        .then(() => Promise.all([
          utils.saveDocs(deniedDocs.map(doc => _.extend(doc, { _deleted: true }))),
          utils.saveDocs(allowedDocs.map(doc => _.extend(doc, { _deleted: true }))),
        ]))
        .then(() => requestChanges('bob'))
        .then(changes => {
          assertChangeIds(changes,
            'org.couchdb.user:bob',
            'fixture:bobville',
            'fixture:user:bob');
          return Promise.resolve();
        })
        .then(() => consumeChanges('bob', [], seq))
        .then(tombstoneResults => {
          expect(tombstoneResults.filter(change => change.deleted).length).toBe(5);
          expect(tombstoneResults.every(change => allowedDocIds.indexOf(change.id) !== -1)).toBe(true);
        });
    });

    it('filters allowed changes in longpolls', () => {
      const allowedDocs = createSomeContacts(3, 'fixture:bobville');
      const deniedDocs = createSomeContacts(3, 'irrelevant-place');
      const allowedDocIds = allowedDocs.map(doc => doc._id);

      return requestChanges('bob')
        .then(changes => Promise.all([
          consumeChanges('bob', [], changes.last_seq),
          utils.saveDocs(allowedDocs),
          utils.saveDocs(deniedDocs)
        ]))
        .then(([changes]) => {
          expect(changes.every(change => allowedDocIds.indexOf(change.id) !== -1)).toBe(true);
        });
    });

    it('filters allowed deletes in longpolls', () => {
      const allowedDocs = createSomeContacts(3, 'fixture:bobville');
      const deniedDocs = createSomeContacts(3, 'irrelevant-place');
      const allowedDocIds = allowedDocs.map(doc => doc._id);

      return Promise
        .all([
          utils.saveDocs(allowedDocs),
          utils.saveDocs(deniedDocs),
        ])
        .then(([ allowedDocsResult, deniedDocsResult ]) => {
          allowedDocsResult.forEach((doc, idx) => allowedDocs[idx]._rev = doc.rev);
          deniedDocsResult.forEach((doc, idx) => deniedDocs[idx]._rev = doc.rev);
          return requestChanges('bob');
        })
        .then(changes => Promise.all([
          requestChanges('bob', { since: changes.last_seq, feed: 'longpoll' }),
          utils.saveDocs(deniedDocs.map(doc => _.extend(doc, { _deleted: true }))),
          utils.saveDocs(allowedDocs.map(doc => _.extend(doc, { _deleted: true })))
        ]))
        .then(([ changes ]) => {
          expect(changes.results.every(change => allowedDocIds.indexOf(change.id) !== -1)).toBe(true);
          expect(changes.results.every(change => change.deleted)).toBe(true);
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

      return Promise
        .all([
          requestChanges('bob'),
          requestChanges('steve')
        ])
        .then(([ bobsChanges, stevesChanges ]) => Promise.all([
          consumeChanges('bob', [], bobsChanges.last_seq),
          consumeChanges('steve', [], stevesChanges.last_seq),
          utils.saveDocs(allowedBob),
          utils.saveDocs(allowedSteve),
        ]))
        .then(([ bobsChanges, stevesChanges ]) => {
          expect(bobsChanges.every(change => _.pluck(allowedBob, '_id').indexOf(change.id) !== -1)).toBe(true);
          expect(stevesChanges.every(change => _.pluck(allowedSteve, '_id').indexOf(change.id) !== -1)).toBe(true);
        });
    });

    it('filters deletions (tombstones) for concurrent users', () => {
      const allowedBob = createSomeContacts(3, 'fixture:bobville');
      const allowedSteve = createSomeContacts(3, 'fixture:steveville');
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
        .then(([ bobsTombstones, stevesTombstones ]) => {
          expect(bobsTombstones.every(change => _.pluck(allowedBob, '_id').indexOf(change.id) !== -1)).toBe(true);
          expect(stevesTombstones.every(change => _.pluck(allowedSteve, '_id').indexOf(change.id) !== -1)).toBe(true);
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
            { role:'district-manager', depth:2 },
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
