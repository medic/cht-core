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

function requestChanges(username, last_seq=0, feed='normal') {
  const options = {
    path: `/_changes?since=${last_seq}&feed=${feed}`,
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
];

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hostpital'
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
        utils.updateSettings({district_admins_access_unallocated_messages: true})
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
      .then(() => requestChanges('chw', seq_number))
      .then(changes => assertChangeIds(changes, 'visible'));
  });
});
