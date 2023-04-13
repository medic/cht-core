const chai = require('chai');
const _ = require('lodash');
const utils = require('@utils');
const constants = require('@constants');
const chaiExclude = require('chai-exclude');
chai.use(chaiExclude);

const password = 'passwordSUP3RS3CR37!';

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hospital'
};

const users = [
  {
    username: 'offline',
    password: password,
    place: {
      _id: 'fixture:offline',
      type: 'health_center',
      name: 'Offline place',
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:offline',
    },
    contact: {
      _id: 'fixture:user:offline',
      name: 'OfflineUser',
      patient_id: 'shortcode:user:offline',
    },
    roles: ['district_admin']
  },
  {
    username: 'online',
    password: password,
    place: {
      _id: 'fixture:online',
      type: 'health_center',
      name: 'Online place',
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:online',
    },
    contact: {
      _id: 'fixture:user:online',
      name: 'OnlineUser',
      patient_id: 'shortcode:user:online',
    },
    roles: ['national_admin']
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
    roles: ['district_admin'],
  },
];

let offlineRequestOptions;
let onlineRequestOptions;

const DOCS_TO_KEEP = [
  'PARENT_PLACE',
  /^messages-/,
  /^fixture/,
  /^org.couchdb.user/,
];

describe('bulk-get handler', () => {
  before(() => {
    return utils
      .saveDoc(parentPlace)
      .then(() => utils.createUsers(users));
  });

  after(() =>
    utils
      .revertDb([], true)
      .then(() => utils.deleteUsers(users))
  );

  afterEach(() => utils.revertDb(DOCS_TO_KEEP, true));
  beforeEach(() => {
    offlineRequestOptions = {
      path: '/_bulk_get',
      auth: { username: 'offline', password },
      method: 'POST',
    };

    onlineRequestOptions = {
      path: '/_bulk_get',
      auth: { username: 'online', password },
      method: 'POST',
    };
  });

  it('does not filter online users', () => {
    const docs = [
      { _id: 'ICanBeAnything'},
      { _id: 'NEW_PLACE', parent: {}, type: 'district_hospital', name: 'NEW PLACE' }
    ];

    return utils
      .saveDocs(docs)
      .then(results => {
        onlineRequestOptions.body = {
          docs: [
            { id: 'ICanBeAnything', rev: results[0].rev },
            { id: 'NEW_PLACE' },
            { id: 'PARENT_PLACE' },
            { id: 'org.couchdb.user:offline' }
          ]
        };

        return utils.requestOnTestDb(onlineRequestOptions);
      })
      .then(result => {
        chai.expect(result.results.length).to.equal(4);

        chai.expect(result.results[0]).excludingEvery('_rev').to.deep.include({
          id: 'ICanBeAnything',
          docs: [{ ok: docs[0] }]
        });

        chai.expect(result.results[1]).excludingEvery('_rev').to.deep.include({
          id: 'NEW_PLACE',
          docs: [{ ok: docs[1] }]
        });

        chai.expect(result.results[2]).to.deep.nested.include({
          id: 'PARENT_PLACE',
          'docs[0].ok._id': 'PARENT_PLACE'
        });

        chai.expect(result.results[3]).to.deep.nested.include({
          id: 'org.couchdb.user:offline',
          'docs[0].ok._id': 'org.couchdb.user:offline'
        });
      });
  });

  it('filters offline users results', () => {
    const docs = [
      { _id: 'allowed_contact_1', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 1' },
      { _id: 'allowed_contact_2', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 2' },
      { _id: 'denied_contact_1', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'Denied Contact 1' },
      { _id: 'denied_contact_2', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'Denied Contact 2' },
    ];

    return utils
      .saveDocs(docs)
      .then(results => {
        results.forEach((row, idx) => docs[idx]._rev = row.rev);

        offlineRequestOptions.body = {
          docs: [
            { id: 'allowed_contact_1' },
            { id: 'allowed_contact_2', rev: docs[1].rev },
            { id: 'allowed_contact_2', rev: 'somerev' },
            { id: 'denied_contact_1' },
            { id: 'denied_contact_2', rev: docs[2].rev },
            { id: 'denied_contact_2', rev: 'somerev' },
          ]
        };

        return utils.requestOnTestDb(offlineRequestOptions);
      })
      .then(result => {
        chai.expect(result.results).to.deep.equal([
          {
            id: 'allowed_contact_1',
            docs: [{ ok: docs[0] }]
          },
          {
            id: 'allowed_contact_2',
            docs: [{ ok: docs[1] }]
          }
        ]);
      });
  });

  it('fitlers offline users tasks and targets', () => {
    const docs = [
      {
        _id: 'allowed_task',
        type: 'task',
        user: 'org.couchdb.user:offline',
        owner: 'fixture:user:offline',
      },
      {
        _id: 'denied_task',
        type: 'task',
        user: 'org.couchdb.user:online',
        owner: 'fixture:user:offline',
      },
      {
        _id: 'allowed_target',
        type: 'target',
        user: 'org.couchdb.user:offline',
        owner: 'fixture:user:offline',
      },
      {
        _id: 'denied_target',
        type: 'target',
        user: 'org.couchdb.user:offline',
        owner: 'fixture:user:online',
      },
    ];
    const requestRevs = [];

    return utils
      .saveDocs(docs)
      .then(results => {
        results.forEach(result => requestRevs.push({ id: result.id, rev: result.rev }));
        offlineRequestOptions.body = { docs: requestRevs };
        return utils.requestOnTestDb(offlineRequestOptions);
      })
      .then(result => {
        chai.expect(result.results).excludingEvery('_rev').to.deep.equal([
          {
            id: 'allowed_task',
            docs: [{ ok: docs[0] }],
          },
          {
            id: 'allowed_target',
            docs: [{ ok: docs[2] }],
          }
        ]);

        const supervisorRequestOptions = {
          path: '/_bulk_get',
          auth: { username: 'supervisor', password },
          method: 'POST',
          body: offlineRequestOptions.body
        };
        return utils.requestOnTestDb(supervisorRequestOptions);
      })
      .then(result => {
        chai.expect(result.results).excludingEvery('_rev').to.deep.equal([
          {
            id: 'allowed_target',
            docs: [{ ok: docs[2] }],
          },
          {
            id: 'denied_target',
            docs: [{ ok: docs[3] }],
          }
        ]);
      });
  });

  it('filters offline users based on requested rev', () => {
    const docs = [
      { _id: 'a1', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 1' },
      { _id: 'a2', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 2' },
      { _id: 'd1', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'Denied Contact 1' },
      { _id: 'd2', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'Denied Contact 2' },
    ];

    const revs = {};

    return utils
      .saveDocs(docs)
      .then(results => {
        results.forEach((result, idx) => {
          revs[result.id] = [ result.rev ];
          docs[idx]._rev = result.rev;
        });

        docs[1].parent = { _id: 'fixture:online' };
        docs[1].name = 'Previously allowed Contact 2';

        docs[3].parent = { _id: 'fixture:offline' };
        docs[3].name = 'Previously denied Contact 2';

        return utils.saveDocs(docs);
      })
      .then(results => {
        results.forEach(result => revs[result.id].push(result.rev));

        offlineRequestOptions.body = {
          docs: [
            { id: 'a1', rev: revs.a1[0] }, // allowed
            { id: 'a1', rev: revs.a1[1] }, // allowed
            { id: 'a2', rev: revs.a2[0] }, // allowed
            { id: 'a2', rev: revs.a2[1] }, // denied
            { id: 'd1', rev: revs.d1[0] }, // denied
            { id: 'd1', rev: revs.d1[1] }, // denied
            { id: 'd2', rev: revs.d2[0] }, // denied
            { id: 'd2', rev: revs.d2[1] } // allowed
          ]
        };
        offlineRequestOptions.path = '/_bulk_get?latest=true';

        return utils.requestOnTestDb(offlineRequestOptions);
      })
      .then(result => {
        chai.expect(result.results).to.deep.equal([
          {
            id: 'a1',
            docs: [{
              ok: {
                _id: 'a1',
                type: 'clinic',
                parent: { _id: 'fixture:offline' },
                name: 'Allowed Contact 1',
                _rev: revs.a1[0]
              }}],
          },
          {
            id: 'a1',
            docs: [{
              ok: {
                _id: 'a1',
                type: 'clinic',
                parent: { _id: 'fixture:offline' },
                name: 'Allowed Contact 1',
                _rev: revs.a1[1]
              }}],
          },
          {
            id: 'a2',
            docs: [{
              ok: {
                _id: 'a2',
                type: 'clinic',
                parent: { _id: 'fixture:offline' },
                name: 'Allowed Contact 2',
                _rev: revs.a2[0]
              }}],
          },
          {
            id: 'd2',
            docs: [{
              ok: {
                _id: 'd2',
                type: 'clinic',
                parent: { _id: 'fixture:offline' },
                name: 'Previously denied Contact 2',
                _rev: revs.d2[1]
              }}],
          },
        ]);
      });
  });

  it('uses correct request parameters', () => {
    const docs = [
      { _id: 'a1', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 1' },
      { _id: 'a2', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 2' }
    ];

    offlineRequestOptions.body = { docs: [{ id: 'a1' }, { id: 'a2' }] };

    return utils
      .saveDocs(docs)
      .then(result => utils.requestOnTestDb({
        path: `/a1/att1?rev=${result[0].rev}`,
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: 'a1 attachment content',
      }))
      .then(() => utils.requestOnTestDb(offlineRequestOptions))
      .then(result => {
        chai.expect(result.results.length).to.equal(2);

        chai.expect(result.results[0]).to.include({ id: 'a1' });
        chai.expect(result.results[0].docs[0].ok).to.deep.nested.include({ '_attachments.att1.stub': true });
        chai.expect(result.results[0].docs[0].ok._revisions).to.equal(undefined);

        chai.expect(result.results[1]).to.include({ id: 'a2' });
        chai.expect(result.results[1].docs[0].ok._attachments).to.equal(undefined);
        chai.expect(result.results[1].docs[0].ok._revisions).to.equal(undefined);

        offlineRequestOptions.path = '/_bulk_get?revs=true&attachments=true';
        return utils.requestOnTestDb(offlineRequestOptions);
      })
      .then(result => {
        chai.expect(result.results.length).to.equal(2);

        chai.expect(result.results[0]).to.include({ id: 'a1' });
        chai.expect(result.results[0].docs[0].ok).to.have.deep.nested.property('_attachments.att1.data');
        chai.expect(result.results[0].docs[0].ok._revisions.ids.length).to.equal(5);

        chai.expect(result.results[1]).to.include({ id: 'a2' });
        chai.expect(result.results[1].docs[0].ok._attachments).to.equal(undefined);
        chai.expect(result.results[1].docs[0].ok._revisions.ids.length).to.equal(4);

        offlineRequestOptions.path = '/_bulk_get?revs=false';
        return utils.requestOnTestDb(offlineRequestOptions);
      })
      .then(result => {
        chai.expect(result.results.length).to.equal(2);
        chai.expect(result.results[0]).to.include({ id: 'a1' });
        chai.expect(result.results[0].docs[0].ok).to.deep.nested.include({ '_attachments.att1.stub': true });
        chai.expect(result.results[0].docs[0].ok._revisions).to.equal(undefined);

        chai.expect(result.results[1]).to.include({ id: 'a2' });
        chai.expect(result.results[1].docs[0].ok._attachments).to.equal(undefined);
        chai.expect(result.results[1].docs[0].ok._revisions).to.equal(undefined);
      });
  });

  it('returns bodies of couchDB delete stubs', () => {
    const docs = [
      { _id: 'a1', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 1' },
      { _id: 'a2', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 2' },
      { _id: 'a3', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'Denied Contact 2' }
    ];

    return utils
      .saveDocs(docs)
      .then(result => Promise.all(
        docs.map((doc, key) => utils.requestOnTestDb({ method: 'DELETE', path: `/${doc._id}?rev=${result[key].rev}` }))
      ))
      .then(results => {
        results.forEach((result, key) => docs[key]._rev = result.rev);
        offlineRequestOptions.body = {
          docs: [
            { id: 'a1', rev: results[0].rev },
            { id: 'a2', rev: results[1].rev },
            { id: 'a3', rev: results[2].rev }
          ]
        };
        return utils.requestOnTestDb(offlineRequestOptions);
      })
      .then(result => {
        chai.expect(result.results).to.deep.equal([
          {
            id: 'a1',
            docs: [{ ok: { _id: 'a1', _rev: docs[0]._rev, _deleted: true }}],
          },
          {
            id: 'a2',
            docs: [{ ok: { _id: 'a2', _rev: docs[1]._rev, _deleted: true }}],
          },
          {
            id: 'a3',
            docs: [{ ok: { _id: 'a3', _rev: docs[2]._rev, _deleted: true }}],
          }
        ]);
      });
  });

  it('filters offline users results when db name is not medic', () => {
    const docs = [
      { _id: 'allowed_contact_1', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 1' },
      { _id: 'allowed_contact_2', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'Allowed Contact 2' },
      { _id: 'denied_contact_1', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'Denied Contact 1' },
      { _id: 'denied_contact_2', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'Denied Contact 2' },
    ];

    return utils
      .saveDocs(docs)
      .then(results => {
        results.forEach((row, idx) => docs[idx]._rev = row.rev);

        offlineRequestOptions.body = {
          docs: [
            { id: 'allowed_contact_1' },
            { id: 'allowed_contact_2', rev: docs[1].rev },
            { id: 'allowed_contact_2', rev: 'somerev' },
            { id: 'denied_contact_1' },
            { id: 'denied_contact_2', rev: docs[2].rev },
            { id: 'denied_contact_2', rev: 'somerev' },
          ]
        };

        return utils.requestOnMedicDb(offlineRequestOptions);
      })
      .then(result => {
        chai.expect(result.results).to.deep.equal([
          {
            id: 'allowed_contact_1',
            docs: [{ ok: docs[0] }],
          },
          {
            id: 'allowed_contact_2',
            docs: [{ ok: docs[1] }],
          },
        ]);
      });
  });

  it('restricts calls with irregular urls which match couchdb endpoint', () => {
    const doc = { _id: 'denied_report', contact: { _id: 'fixture:online'}, type: 'data_record', form: 'a' };
    offlineRequestOptions.body = { docs: [{ _id: 'denied_report' }] };

    return utils
      .saveDoc(doc)
      .then(() => Promise.all([
        utils.requestOnTestDb(_.defaults({ path: '/_bulk_get' }, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({ path: '///_bulk_get//' }, offlineRequestOptions)),
        utils.request(_.defaults({ path: `//${constants.DB_NAME}//_bulk_get` }, offlineRequestOptions)),
        utils
          .requestOnTestDb(_.defaults({ path: '/_bulk_get/something' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnTestDb(_.defaults({ path: '///_bulk_get//something' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(_.defaults({ path: `//${constants.DB_NAME}//_bulk_get/something` }, offlineRequestOptions))
          .catch(err => err),
        utils.requestOnMedicDb(_.defaults({ path: '/_bulk_get' }, offlineRequestOptions)),
        utils.requestOnMedicDb(_.defaults({ path: '///_bulk_get//' }, offlineRequestOptions)),
        utils.request(_.defaults({ path: `//medic//_bulk_get` }, offlineRequestOptions)),
        utils
          .requestOnMedicDb(_.defaults({ path: '/_bulk_get/something' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .requestOnMedicDb(_.defaults({ path: '///_bulk_get//something' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(_.defaults({ path: `//medic//_bulk_get/something` }, offlineRequestOptions))
          .catch(err => err)
      ]))
      .then(results => {
        results.forEach(result => {
          if (result.results) {
            chai.expect(result.results.length).to.equal(0);
          } else {
            chai.expect(result.responseBody).to.equal('Server error');
          }
        });
      });
  });

  it('should work with replication depth', () => {
    const existentDocs = [
      {
        _id: 'existing_clinic',
        type: 'clinic',
        parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } },
      },
      {
        _id: 'report_about_existing_clinic',
        type: 'data_record',
        form: 'form',
        fields: { place_id: 'existing_clinic' },
        contact: { _id: 'nevermind' },
      },
      {
        _id: 'existing_person',
        type: 'person',
        parent: { _id: 'existing_clinic', parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } } }
      },
      {
        _id: 'denied_report_about_existing_person',
        type: 'data_record',
        form: 'form',
        fields: { patient_id: 'existing_person' },
        contact: { _id: 'nevermind' },
      },
      {
        _id: 'allowed_report_about_existing_person',
        type: 'data_record',
        form: 'form',
        fields: { patient_id: 'existing_person', needs_signoff: true },
        contact: {
          _id: 'existing_person',
          parent: { _id: 'existing_clinic', parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } } },
        },
      },
      {
        _id: 'allowed_task',
        type: 'task',
        user: 'org.couchdb.user:offline',
      },
      {
        _id: 'denied_task',
        type: 'task',
        user: 'org.couchdb.user:other',
      },
      {
        _id: 'allowed_target',
        type: 'target',
        owner: 'fixture:user:offline',
      },
      {
        _id: 'denied_target',
        type: 'target',
        owner: 'existing_person',
      },
    ];

    const settings = { replication_depth: [{ role: 'district_admin', depth: 1 }] };
    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs(existentDocs))
      .then(result => result.forEach((item, idx) => existentDocs[idx]._rev = item.rev))
      .then(() => {
        const docs = existentDocs.map(doc => ({ id: doc._id, rev: doc._rev }));
        offlineRequestOptions.body = { docs };
        return utils.requestOnMedicDb(offlineRequestOptions);
      })
      .then(result => {
        const allowedIds = [
          'existing_clinic',
          'report_about_existing_clinic',
          'allowed_report_about_existing_person',
          'allowed_task',
          'allowed_target',
        ];
        const expected = existentDocs
          .filter(doc => allowedIds.includes(doc._id))
          .map(doc => ({
            id: doc._id,
            docs: [{ ok: doc }]
          }));
        chai.expect(result.results).to.deep.equal(expected);
      });
  });

  it('should work with replication depth', () => {
    const existentDocs = [
      {
        _id: 'existing_clinic',
        type: 'clinic',
        parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } },
      },
      {
        _id: 'report_about_existing_clinic',
        type: 'data_record',
        form: 'form',
        fields: { place_id: 'existing_clinic' },
        contact: { _id: 'nevermind' },
      },
      {
        _id: 'existing_person',
        type: 'person',
        parent: { _id: 'existing_clinic', parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } } }
      },
      {
        _id: 'denied_report_about_existing_person',
        type: 'data_record',
        form: 'form',
        fields: { patient_id: 'existing_person' },
        contact: { _id: 'nevermind' },
      },
      {
        _id: 'allowed_report_about_existing_person',
        type: 'data_record',
        form: 'form',
        fields: { patient_id: 'existing_person', needs_signoff: true },
        contact: {
          _id: 'existing_person',
          parent: { _id: 'existing_clinic', parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } } },
        },
      },
      {
        _id: 'allowed_task',
        type: 'task',
        user: 'org.couchdb.user:offline',
      },
      {
        _id: 'denied_task',
        type: 'task',
        user: 'org.couchdb.user:other',
      },
      {
        _id: 'allowed_target',
        type: 'target',
        owner: 'fixture:user:offline',
      },
      {
        _id: 'denied_target',
        type: 'target',
        owner: 'existing_person',
      },
    ];

    const settings = { replication_depth: [{ role: 'district_admin', depth: 1 }] };
    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs(existentDocs))
      .then(result => result.forEach((item, idx) => existentDocs[idx]._rev = item.rev))
      .then(() => {
        const docs = existentDocs.map(doc => ({ id: doc._id, rev: doc._rev }));
        offlineRequestOptions.body = { docs };
        return utils.requestOnMedicDb(offlineRequestOptions);
      })
      .then(result => {
        const allowedIds = [
          'existing_clinic',
          'report_about_existing_clinic',
          'allowed_report_about_existing_person',
          'allowed_task',
          'allowed_target',
        ];
        const expected = existentDocs
          .filter(doc => allowedIds.includes(doc._id))
          .map(doc => ({
            id: doc._id,
            docs: [{ ok: doc }]
          }));
        chai.expect(result.results).to.deep.equal(expected);
      });
  });

  it('should work with report replication depth', () => {
    const existentDocs = [
      {
        _id: 'existing_clinic',
        type: 'clinic',
        parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } },
      },
      {
        _id: 'report_about_existing_clinic',
        type: 'data_record',
        form: 'form',
        fields: { place_id: 'existing_clinic' },
        contact: { _id: 'nevermind' },
      },
      {
        _id: 'existing_person',
        type: 'person',
        parent: { _id: 'existing_clinic', parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } } }
      },
      {
        _id: 'denied_report_about_existing_person',
        type: 'data_record',
        form: 'form',
        fields: { patient_id: 'existing_person' },
        contact: { _id: 'nevermind' },
      },
      {
        _id: 'allowed_report_about_existing_person1',
        type: 'data_record',
        fields: { patient_id: 'existing_person' },
        form: 'form',
        contact: {
          _id: 'fixture:user:offline',
          parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } },
        },
      },
      {
        _id: 'allowed_report_about_existing_person2',
        type: 'data_record',
        fields: { patient_id: 'existing_person', needs_signoff: true },
        form: 'form',
        contact: {
          _id: 'existing_person',
          parent: { _id: 'existing_clinic', parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } } },
        },
      },
      {
        _id: 'allowed_target',
        type: 'target',
        owner: 'existing_person',
      },
      {
        _id: 'denied_target',
        type: 'target',
        owner: 'whoever',
      },
    ];

    const settings = { replication_depth: [{ role: 'district_admin', depth: 2, report_depth: 1 }] };
    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs(existentDocs))
      .then(result => result.forEach((item, idx) => existentDocs[idx]._rev = item.rev))
      .then(() => {
        const docs = existentDocs.map(doc => ({ id: doc._id, rev: doc._rev }));
        offlineRequestOptions.body = { docs };
        return utils.requestOnMedicDb(offlineRequestOptions);
      })
      .then(result => {
        const allowedIds = [
          'existing_clinic',
          'report_about_existing_clinic',
          'existing_person',
          'allowed_report_about_existing_person1',
          'allowed_report_about_existing_person2',
          'allowed_target',
        ];

        const expected = existentDocs
          .filter(doc => allowedIds.includes(doc._id))
          .map(doc => ({
            id: doc._id,
            docs: [{ ok: doc }]
          }));
        chai.expect(result.results).to.deep.equal(expected);
      });
  });

  it('should not return sensitive documents', () => {
    const docs = [
      {
        _id: 'insensitive_report_1',
        type: 'data_record',
        form: 'a',
        contact: { _id: 'fixture:offline'},
        patient_id: 'fixture:offline'
      },
      {
        _id: 'insensitive_report_2',
        type: 'data_record',
        form: 'a',
        contact: { _id: 'fixture:offline'},
        patient_id: 'fixture:offline',
        fields: { private: true },
      },
      {
        _id: 'insensitive_report_3',
        type: 'data_record',
        form: 'a',
        contact: { _id: 'fixture:online'},
        patient_id: 'fixture:offline',
        fields: { private: false },
      },
      {
        _id: 'insensitive_report_4',
        type: 'data_record',
        form: 'a',
        contact: { _id: 'fixture:online'},
        fields: { private: false, patient_id: 'shortcode:user:offline', },
      },
      {
        _id: 'sensitive_report_1',
        type: 'data_record',
        form: 'a',
        contact: { _id: 'fixture:online'},
        patient_id: 'fixture:user:offline',
        fields: { private: true },
      },
      {
        _id: 'sensitive_report_2',
        type: 'data_record',
        form: 'a',
        contact: { _id: 'fixture:online'},
        patient_id: 'shortcode:user:offline',
        fields: { private: true },
      },
      {
        _id: 'sensitive_report_3',
        type: 'data_record',
        form: 'a',
        contact: { _id: 'fixture:online'},
        fields: { private: true, place_id: 'shortcode:offline', },
      },
      {
        _id: 'sensitive_report_4',
        type: 'data_record',
        form: 'a',
        contact: { _id: 'fixture:online'},
        fields: { private: true, patient_id: 'shortcode:user:offline', },
      },
      {
        _id: 'sensitive_report_5',
        type: 'data_record',
        form: 'a',
        contact: { _id: 'fixture:online'},
        fields: { private: true, patient_uuid: 'fixture:user:offline', },
      },
    ];

    return utils
      .saveDocs(docs)
      .then(result => {
        result.forEach((r, idx) => docs[idx]._rev = r.rev);
        offlineRequestOptions.body = { docs: docs.map(doc => ({ id: doc._id, rev: doc._rev })) };
      })
      .then(() => utils.requestOnMedicDb(offlineRequestOptions))
      .then(result => {
        chai.expect(result.results).to.deep.equal([
          {
            id: 'insensitive_report_1',
            docs: [{ ok: docs[0] }],
          },
          {
            id: 'insensitive_report_2',
            docs: [{ ok: docs[1] }],
          },
          {
            id: 'insensitive_report_3',
            docs: [{ ok: docs[2] }],
          },
          {
            id: 'insensitive_report_4',
            docs: [{ ok: docs[3] }],
          },
        ]);
      });
  });
});
