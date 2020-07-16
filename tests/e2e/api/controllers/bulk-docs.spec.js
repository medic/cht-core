const chai = require('chai');
const chaiExclude = require('chai-exclude');
chai.use(chaiExclude);
const _ = require('lodash');
const utils = require('../../../utils');
const sUtils = require('../../sentinel/utils');
const constants = require('../../../constants');

const password = 'passwordSUP3RS3CR37!';

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hospital',
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
    },
    contact: {
      _id: 'fixture:user:offline',
      name: 'OfflineUser',
    },
    roles: ['district_admin'],
  },
  {
    username: 'online',
    password: password,
    place: {
      _id: 'fixture:online',
      type: 'health_center',
      name: 'Online place',
      parent: 'PARENT_PLACE',
    },
    contact: {
      _id: 'fixture:user:online',
      name: 'OnlineUser',
    },
    roles: ['national_admin'],
  },
  {
    username: 'supervisor',
    password: password,
    place: 'PARENT_PLACE',
    contact: {
      _id: 'fixture:user:supervisor',
      name: 'Supervisor',
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

describe('bulk-docs handler', () => {
  beforeAll(() => {
    return utils
      .saveDoc(parentPlace)
      .then(() => utils.createUsers(users));
  });

  afterAll(done =>
    utils
      .revertDb()
      .then(() => utils.deleteUsers(users))
      .then(done));

  afterEach(done => utils.revertDb(DOCS_TO_KEEP, true).then(done));
  beforeEach(() => {
    offlineRequestOptions = {
      path: '/_bulk_docs',
      auth: { username: 'offline', password },
      method: 'POST',
    };

    onlineRequestOptions = {
      path: '/_bulk_docs',
      auth: { username: 'online', password },
      method: 'POST',
    };
  });

  it('does not filter doc writes for online users', () => {
    const docs = [
      {
        _id: 'NEW_PARENT_PLACE',
        type: 'district_hospital',
        name: 'New Hospital',
      },
      {
        _id: 'NEW_CONTACT',
        parent: { _id: 'NEW_PARENT_PLACE' },
        type: 'person',
        name: 'New Contact',
        reported_date: 1,
      },
      { _id: 'ICanBeAnything' },
    ];

    onlineRequestOptions.body = { docs };

    return utils
      .requestOnTestDb(onlineRequestOptions)
      .then(results => {
        chai.expect(results.length).to.equal(3);
        results.forEach((result, idx) => {
          chai.expect(result).excluding('rev').to.deep.equal({ ok: true, id: docs[idx]._id });
        });

        return Promise.all(results.map(row => utils.getDoc(row.id)));
      })
      .then(results => {
        results.forEach((result, idx) => {
          chai.expect(result).excluding('_rev').to.deep.equal(docs[idx]);
        });
      });
  });

  it('filters offline users requests', () => {
    const existentDocs = [
      {
        _id: 'allowed_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'Allowed Contact 1',
      },
      {
        _id: 'allowed_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'Allowed Contact 2',
      },
      {
        _id: 'denied_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'Denied Contact 1',
      },
      {
        _id: 'denied_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'Denied Contact 2',
      },
    ];

    const docs = [
      {
        _id: 'new_allowed_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'New Allowed Contact',
      },
      {
        _id: 'new_denied_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'New Denied Contact',
      },
      // disallowed update on disallowed doc
      {
        _id: 'denied_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'Denied Contact 1 updated',
      },
      // allowed update on disallowed doc
      {
        _id: 'denied_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'Denied Contact 2 updated',
      },
      // disallowed update on allowed doc
      {
        _id: 'allowed_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'Allowed Contact 1 updated',
      },
      // allowed update on allowed doc
      {
        _id: 'allowed_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'Allowed Contact 2 updated',
      },
      // no _id field disallowed doc
      {
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'New Denied Contact With no ID',
      },
      // no _id field allowed doc
      {
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'New Allowed Contact With no ID',
      },
    ];

    return utils
      .saveDocs(existentDocs)
      .then(result => {
        let ids = result.map(r => r.id);
        let existentDocsInfodocs;

        result.forEach(
          row => (docs.find(doc => doc._id === row.id)._rev = row.rev)
        );

        return sUtils.waitForSentinel(ids)
          .then(() => sUtils.getInfoDocs(ids))
          .then(result => {
            existentDocsInfodocs = result;
            offlineRequestOptions.body = { docs };
            return utils.requestOnTestDb(offlineRequestOptions);
          }).then(result => {
            chai.expect(result.length).to.equal(8);
            chai.expect(result[0]).to.deep.include({
              ok: true,
              id: 'new_allowed_contact_1',
            });
            chai.expect(result[5]).to.deep.include({
              ok: true,
              id: 'allowed_contact_2',
            });
            chai.expect(result[7]).to.include({ ok: true });
            chai.expect(result[1]).to.deep.equal({
              id: 'new_denied_contact_1',
              error: 'forbidden',
            });
            chai.expect(result[2]).to.deep.equal({
              id: 'denied_contact_1',
              error: 'forbidden',
            });
            chai.expect(result[3]).to.deep.equal({
              id: 'denied_contact_2',
              error: 'forbidden',
            });
            chai.expect(result[4]).to.deep.equal({
              id: 'allowed_contact_1',
              error: 'forbidden',
            });
            chai.expect(result[6]).to.deep.equal({ error: 'forbidden' });

            ids = result.map(r => r.id).filter(id => id);

            return Promise.all(
              result.map(row => utils.getDoc(row.id).catch(err => err)),
            );
          }).then(result => {
            chai.expect(result.length).to.equal(8);
            chai.expect(result[0]).excluding('_rev').to.deep.equal(docs[0]);
            chai.expect(result[1]).to.deep.nested.include({ 'responseBody.error': 'not_found' });
            chai.expect(result[2]).excluding('_rev').to.deep.equal(existentDocs[2]);
            chai.expect(result[3]).excluding('_rev').to.deep.equal(existentDocs[3]);
            chai.expect(result[4]).excluding('_rev').to.deep.equal(existentDocs[0]);

            chai.expect(result[5]).excluding('_rev').to.deep.equal(docs[5]);
            chai.expect(result[6]).to.deep.nested.include({ 'responseBody.error': 'not_found' });
            chai.expect(result[7]).excluding( ['_rev', '_id']).to.deep.equal(docs[7]);

            return sUtils.waitForSentinel(ids).then(() => sUtils.getInfoDocs(ids));
          }).then(result => {
            chai.expect(result.length).to.equal(7);
            // Successful new write
            chai.expect(result[0]).to.include({ _id: 'new_allowed_contact_1-info' });

            // Unsuccessful new write
            chai.expect(result[1]).to.be.undefined;

            // Unsuccessful writes to existing
            chai.expect(result[2]).to.deep.include({
              _id: existentDocsInfodocs[2]._id,
              latest_replication_date: existentDocsInfodocs[2].latest_replication_date
            });
            chai.expect(result[3]).to.deep.include({
              _id: existentDocsInfodocs[3]._id,
              latest_replication_date: existentDocsInfodocs[3].latest_replication_date
            });
            chai.expect(result[4]).to.deep.include({
              _id: existentDocsInfodocs[0]._id,
              latest_replication_date: existentDocsInfodocs[0].latest_replication_date
            });

            // Successful write to existing
            chai.expect(result[5]).to.include({ _id: existentDocsInfodocs[1]._id });
            chai.expect(result[5]).to.not.include({
              latest_replication_date: existentDocsInfodocs[1].latest_replication_date,
            });

            // Successful completely new write
            chai.expect(result[6]).to.be.ok;
          });
      });
  });

  it('filters offline tasks and targets', () => {
    const supervisorRequestOptions = {
      path: '/_bulk_docs',
      auth: { username: 'supervisor', password },
      method: 'POST',
    };

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

    offlineRequestOptions.body = { docs };

    return utils
      .requestOnTestDb(offlineRequestOptions)
      .then(result => {
        chai.expect(result.length).to.equal(4);
        chai.expect(result[0]).to.include({ id: 'allowed_task', ok: true });
        chai.expect(result[2]).to.include({ id: 'allowed_target', ok: true });
        chai.expect(result[1]).to.include({ id: 'denied_task', error: 'forbidden' });
        chai.expect(result[3]).to.include({ id: 'denied_target', error: 'forbidden' });

        docs[0]._rev = result[0].rev;
        docs[2]._rev = result[2].rev;

        supervisorRequestOptions.body = { docs };
        return utils.requestOnTestDb(supervisorRequestOptions);
      })
      .then(result => {
        chai.expect(result.length).to.equal(4);
        // supervisors can't see any task, but can see the targets
        chai.expect(result[0]).to.include({ id: 'allowed_task', error: 'forbidden' });
        chai.expect(result[1]).to.include({ id: 'denied_task', error: 'forbidden' });
        chai.expect(result[2]).to.include({ id: 'allowed_target', ok: true });
        chai.expect(result[3]).to.include({ id: 'denied_target', ok: true });
      });
  });

  it('reiterates over docs', () => {
    const docs = [
      {
        _id: 'allowed_1',
        type: 'data_record',
        reported_date: 1,
        place_id: 'a',
        form: 'some-form',
        contact: { _id: 'b' },
      },
      {
        _id: 'denied_1',
        type: 'data_record',
        reported_date: 1,
        place_id: 'c',
        form: 'some-form',
        contact: { _id: 'b' },
      },
      {
        _id: 'allowed_2',
        type: 'data_record',
        reported_date: 1,
        form: 'some-form',
        contact: { _id: 'allowed_4' },
      },
      {
        _id: 'denied_2',
        type: 'data_record',
        reported_date: 1,
        form: 'some-form',
        contact: { _id: 'denied_4' },
      },
      {
        _id: 'allowed_3',
        type: 'clinic',
        place_id: 'a',
        parent: { _id: 'fixture:offline' },
      },
      {
        _id: 'allowed_4',
        type: 'clinic',
        place_id: 'b',
        parent: { _id: 'fixture:offline' },
      },
      {
        _id: 'denied_3',
        type: 'clinic',
        place_id: 'c',
        parent: { _id: 'fixture:online' },
      },
      {
        _id: 'denied_4',
        type: 'clinic',
        place_id: 'd',
        parent: { _id: 'fixture:online' },
      },
    ];
    offlineRequestOptions.body = { docs };

    return utils.requestOnTestDb(offlineRequestOptions).then(result => {
      chai.expect(result.length).to.equal(8);
      chai.expect(result[0]).to.include({
        ok: true,
        id: 'allowed_1',
      });
      chai.expect(result[2]).to.include({
        ok: true,
        id: 'allowed_2',
      });
      chai.expect(result[4]).to.include({
        ok: true,
        id: 'allowed_3',
      });
      chai.expect(result[5]).to.include({
        ok: true,
        id: 'allowed_4',
      });

      chai.expect(result[1]).to.deep.equal({ id: 'denied_1', error: 'forbidden' });
      chai.expect(result[3]).to.deep.equal({ id: 'denied_2', error: 'forbidden' });
      chai.expect(result[6]).to.deep.equal({ id: 'denied_3', error: 'forbidden' });
      chai.expect(result[7]).to.deep.equal({ id: 'denied_4', error: 'forbidden' });
    });
  });

  it('filters offline users requests when db name is not medic', () => {
    const existentDocs = [
      {
        _id: 'allowed_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'Allowed Contact 1',
      },
      {
        _id: 'allowed_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'Allowed Contact 2',
      },
      {
        _id: 'denied_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'Denied Contact 1',
      },
      {
        _id: 'denied_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'Denied Contact 2',
      },
    ];

    const docs = [
      {
        _id: 'new_allowed_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'New Allowed Contact',
      },
      {
        _id: 'new_denied_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'New Denied Contact',
      },
      // disallowed update on disallowed doc
      {
        _id: 'denied_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'Denied Contact 1 updated',
      },
      // allowed update on disallowed doc
      {
        _id: 'denied_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'Denied Contact 2 updated',
      },
      // disallowed update on allowed doc
      {
        _id: 'allowed_contact_1',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'Allowed Contact 1 updated',
      },
      // allowed update on allowed doc
      {
        _id: 'allowed_contact_2',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'Allowed Contact 2 updated',
      },
      // no _id field disallowed doc
      {
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'New Denied Contact With no ID',
      },
      // no _id field allowed doc
      {
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'New Allowed Contact With no ID',
      },
    ];

    return utils
      .saveDocs(existentDocs)
      .then(result => {
        result.forEach(
          row => (docs.find(doc => doc._id === row.id)._rev = row.rev)
        );
        offlineRequestOptions.body = { docs };
        return utils.requestOnMedicDb(offlineRequestOptions);
      })
      .then(result => {
        chai.expect(result.length).to.equal(8);
        chai.expect(result[0]).to.include({ ok: true, id: 'new_allowed_contact_2' });
        chai.expect(result[5]).to.include({ ok: true, id: 'allowed_contact_2' });
        chai.expect(result[7]).to.include({ ok: true });

        chai.expect(result[1]).to.deep.equal({ id: 'new_denied_contact_2', error: 'forbidden' });
        chai.expect(result[2]).to.deep.equal({ id: 'denied_contact_1', error: 'forbidden' });
        chai.expect(result[3]).to.deep.equal({ id: 'denied_contact_2', error: 'forbidden' });
        chai.expect(result[4]).to.deep.equal({ id: 'allowed_contact_1', error: 'forbidden' });
        chai.expect(result[6]).to.deep.equal({ error: 'forbidden' });

        return Promise.all(result.map(row => utils.getDoc(row.id).catch(err => err)));
      })
      .then(results => {
        chai.expect(results.length).to.equal(8);

        chai.expect(results[0]).excluding('_rev').to.deep.equal(docs[0]);
        chai.expect(results[1]).to.deep.nested.include({ 'responseBody.error': 'not_found' });
        chai.expect(results[2]).excluding('_rev').to.deep.equal(existentDocs[2]);
        chai.expect(results[3]).excluding('_rev').to.deep.equal(existentDocs[3]);
        chai.expect(results[4]).excluding('_rev').to.deep.equal(existentDocs[0]);
        chai.expect(results[5]).excluding('_rev').to.deep.equal(docs[5]);
        chai.expect(results[6]).to.deep.nested.include({ 'responseBody.error': 'not_found' });
        chai.expect(results[7]).excluding(['_rev', '_id']).to.deep.equal(docs[7]);
      });
  });

  it('restricts calls with irregular urls which match couchdb endpoint', () => {
    const doc = {
      _id: 'denied_report',
      contact: { _id: 'fixture:online' },
      type: 'data_record',
      form: 'a',
    };
    offlineRequestOptions.body = { docs: [doc] };

    return Promise.all([
      utils.requestOnTestDb(_.defaults({ path: '/_bulk_docs' }, offlineRequestOptions)).catch(err => err),
      utils.requestOnTestDb(_.defaults({ path: '///_bulk_docs//' }, offlineRequestOptions)).catch(err => err),
      utils
        .request(_.defaults({ path: `//${constants.DB_NAME}//_bulk_docs` }, offlineRequestOptions))
        .catch(err => err),
      utils.requestOnTestDb(_.defaults({ path: '/_bulk_docs/something' }, offlineRequestOptions)).catch(err => err),
      utils.requestOnTestDb(_.defaults({ path: '///_bulk_docs//something' }, offlineRequestOptions)).catch(err => err),
      utils
        .request(_.defaults({ path: `//${constants.DB_NAME}//_bulk_docs/something` }, offlineRequestOptions))
        .catch(err => err),
      utils.requestOnMedicDb(_.defaults({ path: '/_bulk_docs' }, offlineRequestOptions)).catch(err => err),
      utils.requestOnMedicDb(_.defaults({ path: '///_bulk_docs//' }, offlineRequestOptions)).catch(err => err),
      utils
        .request(_.defaults({ path: `//medic//_bulk_docs` }, offlineRequestOptions))
        .catch(err => err),
      utils.requestOnMedicDb(_.defaults({ path: '/_bulk_docs/something' }, offlineRequestOptions)).catch(err => err),
      utils.requestOnMedicDb(_.defaults({ path: '///_bulk_docs//something' }, offlineRequestOptions)).catch(err => err),
      utils
        .request(_.defaults({ path: `//medic//_bulk_docs/something` }, offlineRequestOptions))
        .catch(err => err),
    ]).then(results => {
      results.forEach(result => {
        if (Array.isArray(result)) {
          chai.expect(result.length).to.equal(1);
          chai.expect(result[0]).to.include({ id: 'denied_report', error: 'forbidden' });
        } else {
          // CouchDB interprets this as an attachment POST request
          chai.expect(result).to.deep.nested.include({ 'responseBody.error': 'method_not_allowed' });
        }
      });
    });
  });

  it('works with `new_edits`', () => {
    const docs = [
      {
        _id: 'allowed1',
        _rev: '1-test',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'allowed-1',
      },
      {
        _id: 'denied1',
        _rev: '1-test',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'denied-1',
      },
      {
        _id: 'allowed2',
        _rev: '1-test',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'allowed-1',
      },
      {
        _id: 'denied2',
        _rev: '1-test',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'denied-1',
      },
    ];

    offlineRequestOptions.body = {
      docs: docs,
      new_edits: false,
    };
    return utils
      .requestOnTestDb(offlineRequestOptions)
      .then(result => {
        chai.expect(result).to.deep.equal([
          { id: 'denied1', error: 'forbidden' },
          { id: 'denied2', error: 'forbidden' },
        ]);
        return Promise.all([
          utils.getDoc('allowed1'),
          utils.getDoc('denied1').catch(err => err),
          utils.getDoc('allowed2'),
          utils.getDoc('denied2').catch(err => err),
        ]);
      })
      .then(results => {
        chai.expect(results[0]).to.deep.equal(docs[0]);
        chai.expect(results[1]).to.include({ statusCode: 404 });
        chai.expect(results[2]).to.deep.equal(docs[2]);
        chai.expect(results[3]).to.include({ statusCode: 404 });
      });
  });

  it('should work with replication_depth', () => {
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

    const newDocs = [
      {
        _id: 'allowed_new_clinic',
        type: 'clinic',
        parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } },
      },
      {
        _id: 'denied_new_person',
        type: 'person',
        parent: { _id: 'allowed_new_clinic', parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } } },
      },
      {
        _id: 'allowed_report_about_new_clinic',
        type: 'data_record',
        form: 'form',
        fields: { place_id: 'allowed_new_clinic' },
        contact: { _id: 'nevermind' },
      },
      {
        _id: 'denied_report_about_new_person',
        type: 'data_record',
        form: 'form',
        fields: { patient_id: 'denied_new_person' },
        contact: { _id: 'nevermind' },
      },
      {
        _id: 'allowed_report_about_new_person',
        type: 'data_record',
        form: 'form',
        fields: { patient_id: 'denied_new_person', needs_signoff: true },
        contact: {
          _id: 'new_person',
          parent: { _id: 'allowed_new_clinic', parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } } }
        },
      },
      {
        _id: 'new_allowed_task',
        type: 'task',
        user: 'org.couchdb.user:offline',
      },
      {
        _id: 'new_denied_task',
        type: 'task',
        user: 'org.couchdb.user:other',
      },
      {
        _id: 'new_allowed_target',
        type: 'target',
        owner: 'fixture:user:offline',
      },
      {
        _id: 'new_denied_target',
        type: 'target',
        owner: 'existing_person',
      },
    ];

    const settings = { replication_depth: [{ role: 'district_admin', depth: 1 }] };
    return utils
      .updateSettings(settings)
      .then(() => utils.saveDocs(existentDocs))
      .then(result => result.forEach((item, idx) => existentDocs[idx]._rev = item.rev))
      .then(() => {
        offlineRequestOptions.body = { docs: [...newDocs, ...existentDocs], new_edits: true };
        return utils.requestOnMedicDb(offlineRequestOptions);
      })
      .then(results => {
        chai.expect(results).excludingEvery('rev').to.deep.equal([
          { id: 'allowed_new_clinic', ok: true },
          { id: 'denied_new_person', error: 'forbidden' },
          { id: 'allowed_report_about_new_clinic', ok: true },
          { id: 'denied_report_about_new_person', error: 'forbidden' },
          { id: 'allowed_report_about_new_person', ok: true },
          { id: 'new_allowed_task', ok: true },
          { id: 'new_denied_task', error: 'forbidden' },
          { id: 'new_allowed_target', ok: true },
          { id: 'new_denied_target', error: 'forbidden' },
          { id: 'existing_clinic', ok: true },
          { id: 'report_about_existing_clinic', ok: true },
          { id: 'existing_person', error: 'forbidden' },
          { id: 'denied_report_about_existing_person', error: 'forbidden' },
          { id: 'allowed_report_about_existing_person', ok: true },
          { id: 'allowed_task', ok: true },
          { id: 'denied_task', error: 'forbidden' },
          { id: 'allowed_target', ok: true },
          { id: 'denied_target', error: 'forbidden' },
        ]);
      });
  });
});
