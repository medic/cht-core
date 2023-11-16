const _ = require('lodash');
const chai = require('chai');
const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const constants = require('@constants');
const uuid = require('uuid').v4;

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
      place_id: 'shortcode:offline',
    },
    contact: {
      _id: 'fixture:user:offline',
      name: 'OfflineUser',
      patient_id: 'shortcode:user:offline',
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
      place_id: 'shortcode:online',
    },
    contact: {
      _id: 'fixture:user:online',
      name: 'OnlineUser',
      patient_id: 'shortcode:user:online',
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

const clinics = [
  {
    _id: 'fixture:offline:clinic',
    name: 'offline clinic',
    type: 'clinic',
    parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } },
    reported_date: 1
  },
  {
    _id: 'fixture:online:clinic',
    name: 'online clinic',
    type: 'clinic',
    parent: { _id: 'fixture:online', parent: { _id: 'PARENT_PLACE' } },
    reported_date: 1
  },
];

const patients = [
  {
    _id: 'fixture:offline:patient',
    name: 'offline patient',
    patient_id: '123456',
    type: 'person',
    parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } },
    reported_date: 1
  },
  {
    _id: 'fixture:offline:clinic:patient',
    name: 'offline patient',
    patient_id: 'c123456',
    type: 'person',
    parent: { _id: 'fixture:offline:clinic', parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } } },
    reported_date: 1
  },
  {
    _id: 'fixture:online:patient',
    name: 'online patient',
    patient_id: '654321',
    type: 'person',
    parent: { _id: 'fixture:online', parent: { _id: 'PARENT_PLACE' } },
    reported_date: 1
  },
  {
    _id: 'fixture:online:clinic:patient',
    name: 'online patient',
    patient_id: 'c654321',
    type: 'person',
    parent: { _id: 'fixture:online:clinic', parent: { _id: 'fixture:online', parent: { _id: 'PARENT_PLACE' } } },
    reported_date: 1
  },
];

const setReportContact = (report, username) => {
  if (!username) {
    return;
  }
  if (typeof username === 'string') {
    const user = users.find(u => u.username === username);
    report.contact = {_id: user.contact._id, parent: {_id: user.place._id, parent: {_id: 'PARENT_PLACE'}}};
  } else {
    report.contact = username;
  }
  return report;
};

const setReportPatient = (report, patientUuid, fields, temporaryPatients) => {
  const patientsToSearch = temporaryPatients || patients;
  const patient = patientsToSearch.find(p => p._id === patientUuid);
  if (!patient) {
    return;
  }
  report.fields = {
    patient_id: fields.includes('patient_id') && patient.patient_id,
    patient_uuid: fields.includes('patient_uuid') && patient._id,
  };
  return report;
};

const reportForPatient = (patientUuid, username, fields = [], needs_signoff = false, temporaryPatients = false) => {
  const report = { _id: uuid(), type: 'data_record', form: 'some-form', content_type: 'xml', fields: {} };

  setReportContact(report, username);
  setReportPatient(report, patientUuid, fields, temporaryPatients);
  report.fields.needs_signoff = needs_signoff;

  return report;
};

describe('db-doc handler', () => {
  before(async () => {
    await utils.saveDoc(parentPlace);
    await utils.createUsers(users);
    await utils.saveDocs([...clinics, ...patients]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers(users);
  });

  afterEach(() => utils.revertDb(DOCS_TO_KEEP, true));

  beforeEach(() => {
    offlineRequestOptions = { auth: { username: 'offline', password }, };
    onlineRequestOptions = { auth: { username: 'online', password }, };
  });

  describe('does not restrict online users', () => {
    it('GET', () => {
      Object.assign(onlineRequestOptions, {
        method: 'GET',
        path: '/fixture:user:offline',
      });

      return utils.requestOnTestDb(onlineRequestOptions).then(result => {
        chai.expect(result).to.deep.include({
          _id: 'fixture:user:offline',
          name: 'OfflineUser',
          type: 'person',
          parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } },
        });
      });
    });

    it('POST', () => {
      Object.assign(onlineRequestOptions, {
        path: '/',
        method: 'POST',
        body: {
          _id: 'db_doc_post',
          type: 'district_hospital',
          name: 'NEW PLACE',
        },
      });

      return utils
        .requestOnTestDb(onlineRequestOptions)
        .then(result => {
          chai.expect(result).to.include({
            id: 'db_doc_post',
            ok: true,
          });
          return utils.getDoc('db_doc_post');
        })
        .then(result => {
          chai.expect(result).to.include({
            _id: 'db_doc_post',
            type: 'district_hospital',
            name: 'NEW PLACE',
          });
        });
    });

    it('PUT', () => {
      return utils
        .saveDoc({ _id: 'db_doc_put', type: 'clinic', name: 'my clinic' })
        .then(result => {
          Object.assign(onlineRequestOptions, {
            method: 'PUT',
            path: '/db_doc_put',
            body: {
              _id: 'db_doc_put',
              type: 'clinic',
              name: 'my updated clinic',
              _rev: result.rev,
            },
          });

          return utils.requestOnTestDb(onlineRequestOptions);
        })
        .then(result => {
          chai.expect(result).to.include({ id: 'db_doc_put', ok: true });
          return utils.getDoc('db_doc_put');
        })
        .then(result => {
          chai.expect(result).to.include({
            _id: 'db_doc_put',
            type: 'clinic',
            name: 'my updated clinic',
          });
        });
    });

    it('DELETE', () => {
      return utils
        .saveDoc({ _id: 'db_doc_delete', type: 'clinic', name: 'my clinic' })
        .then(result => {
          Object.assign(onlineRequestOptions, {
            method: 'DELETE',
            path: `/db_doc_delete?rev=${result.rev}`,
          });

          return utils.requestOnTestDb(onlineRequestOptions);
        })
        .then(result => {
          chai.expect(result).to.include({
            id: 'db_doc_delete',
            ok: true,
          });
          return utils.getDoc('db_doc_delete');
        })
        .catch(err => {
          chai.expect(err.responseBody.error).to.equal('not_found');
        });
    });

    it('GET attachment', () => {
      return utils
        .saveDoc({ _id: 'with_attachments' })
        .then(result => utils.requestOnTestDb({
          path: `/with_attachments/att_name?rev=${result.rev}`,
          method: 'PUT',
          body: 'my attachment content',
          headers: { 'Content-Type': 'text/plain' },
          json: false
        }))
        .then(() => {
          onlineRequestOptions.path = '/with_attachments/att_name';
          onlineRequestOptions.json = false;
          return utils.requestOnTestDb(onlineRequestOptions);
        })
        .then(result => {
          chai.expect(result).to.equal('my attachment content');
        });
    });

    it('PUT attachment', () => {
      return utils
        .saveDoc({ _id: 'with_attachments' })
        .then(result => {
          Object.assign(onlineRequestOptions, {
            path: `/with_attachments/new_attachment?rev=${result.rev}`,
            method: 'PUT',
            headers: { 'Content-Type': 'text/plain' },
            body: 'my new attachment content',
            json: false,
          });

          return utils.requestOnTestDb(onlineRequestOptions);
        })
        .then(result => utils.requestOnTestDb(`/with_attachments/new_attachment?rev=${result.rev}`))
        .then(result => {
          chai.expect(result).to.equal('my new attachment content');
        });
    });
  });

  describe('restricts offline users', () => {
    it('GET', () => {
      offlineRequestOptions.method = 'GET';

      return Promise.all([
        utils.requestOnTestDb(_.defaults({ path: '/fixture:user:offline' }, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({ path: '/fixture:offline:clinic' }, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({ path: '/fixture:offline:patient' }, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({ path: '/fixture:offline:clinic:patient' }, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({ path: '/fixture:user:online' }, offlineRequestOptions)).catch(err => err),
        utils.requestOnTestDb(_.defaults({ path: '/fixture:online:clinic' }, offlineRequestOptions)).catch(err => err),
        utils.requestOnTestDb(_.defaults({ path: '/fixture:online:patient' }, offlineRequestOptions)).catch(err => err),
        utils.requestOnTestDb(_.defaults({ path: '/fixture:online:clinic:patient' }, offlineRequestOptions))
          .catch(err => err),
      ]).then(results => {
        chai.expect(results[0]).to.deep.include({
          _id: 'fixture:user:offline',
          name: 'OfflineUser',
          type: 'person',
          parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } },
        });
        chai.expect(results[1]).to.deep.include(clinics.find(clinic => clinic._id === 'fixture:offline:clinic'));
        chai.expect(results[2]).to.deep.include(patients.find(patient => patient._id === 'fixture:offline:patient'));
        chai.expect(results[3])
          .to.deep.include(patients.find(patient => patient._id === 'fixture:offline:clinic:patient'));

        chai.expect(results[4]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
        chai.expect(results[5]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
        chai.expect(results[6]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
        chai.expect(results[7]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
      });
    });

    it('GET many types of reports', () => {
      const reportScenarios = [
        { doc: reportForPatient('fixture:offline:patient', null, []), allowed: false },
        { doc: reportForPatient('fixture:offline:patient', null, ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', null, ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', null, ['patient_id', 'patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'offline', []), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'offline', ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'offline', ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'offline', ['patient_id', 'patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'online', []), allowed: false },
        { doc: reportForPatient('fixture:offline:patient', 'online', ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'online', ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'online', ['patient_id', 'patient_uuid']), allowed: true },

        { doc: reportForPatient('fixture:offline:clinic:patient', null, []), allowed: false },
        { doc: reportForPatient('fixture:offline:clinic:patient', null, ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', null, ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', null, ['patient_id', 'patient_uuid']),
          allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', []), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', ['patient_id', 'patient_uuid']),
          allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'online', []), allowed: false },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'online', ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'online', ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'online', ['patient_id', 'patient_uuid']),
          allowed: true },

        { doc: reportForPatient('fixture:online:patient', null, []), allowed: false },
        { doc: reportForPatient('fixture:online:patient', null, ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', null, ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', null, ['patient_id', 'patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'offline', []), allowed: true },
        { doc: reportForPatient('fixture:online:patient', 'offline', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'offline', ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'offline', ['patient_id', 'patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'online', []), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'online', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'online', ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'online', ['patient_id', 'patient_uuid']), allowed: false },

        { doc: reportForPatient('fixture:online:clinic:patient', null, []), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', null, ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', null, ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', null, ['patient_id', 'patient_uuid']),
          allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'offline', []), allowed: true },
        { doc: reportForPatient('fixture:online:clinic:patient', 'offline', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'offline', ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'offline', ['patient_id', 'patient_uuid']),
          allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', []), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', ['patient_id', 'patient_uuid']),
          allowed: false },
      ];
      const docs = reportScenarios.map(scenario => scenario.doc);
      return utils
        .saveDocs(docs)
        .then(() => Promise.all(reportScenarios.map(scenario => utils.requestOnTestDb(
          _.defaults({ path: `/${scenario.doc._id}` }, offlineRequestOptions)
        ).catch(err => err))))
        .then(results => {
          results.forEach((result, idx) => {
            if (reportScenarios[idx].allowed) {
              chai.expect(result).to.deep.include(reportScenarios[idx].doc);
            } else {
              chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
            }
          });
        });
    });

    it('GET many types of reports and replication depth and needs_signoff', () => {
      const reportScenarios = [
        { doc: reportForPatient('fixture:offline:patient', null, ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'offline', ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', null, ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:offline:clinic:patient', null, ['patient_uuid'], true), allowed: false },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', ['patient_id'], true), allowed: true },

        { doc: reportForPatient('fixture:online:patient', null, ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'online', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', null, ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', null, ['patient_uuid'], true), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', ['patient_id'], true), allowed: false },
      ];
      const docs = reportScenarios.map(scenario => scenario.doc);
      return utils
        .updateSettings({replication_depth: [{ role: 'district_admin', depth: 1 }]}, true)
        .then(() => utils.saveDocs(docs))
        .then(() => Promise.all(reportScenarios.map(scenario => utils.requestOnTestDb(
          _.defaults({ path: `/${scenario.doc._id}` }, offlineRequestOptions)
        ).catch(err => err))))
        .then(results => {
          results.forEach((result, idx) => {
            if (reportScenarios[idx].allowed) {
              chai.expect(result).to.deep.include(reportScenarios[idx].doc);
            } else {
              chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
            }
          });
        });
    });

    it('GET many types of reports with report replication depth and needs_signoff', () => {
      const reportScenarios = [
        { doc: reportForPatient('fixture:offline:patient', null, ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'offline', ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', null, ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', null, ['patient_uuid'], true), allowed: false },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', ['patient_id'], true), allowed: true },

        { doc: reportForPatient('fixture:online:patient', null, ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'online', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', null, ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', null, ['patient_uuid'], true), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', ['patient_id'], true), allowed: false },
      ];

      const docs = reportScenarios.map(scenario => scenario.doc);
      return utils
        .updateSettings({replication_depth: [{ role: 'district_admin', depth: 2, report_depth: 1 }]}, true)
        .then(() => utils.saveDocs(docs))
        .then(() => Promise.all(
          reportScenarios.map(scenario => utils
            .requestOnTestDb(_.defaults({ path: `/${scenario.doc._id}` }, offlineRequestOptions))
            .catch(err => err))
        ))
        .then(results => {
          results.forEach((result, idx) => {
            if (reportScenarios[idx].allowed) {
              chai.expect(result).to.deep.include(reportScenarios[idx].doc);
            } else {
              chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
            }
          });
        });
    });

    describe('GET with deletes', () => {
      const patientsToDelete = [
        {
          _id: 'temp:offline:clinic:patient_to_delete_with_shortcode',
          name: 'offline patient',
          patient_id: 'del123456',
          type: 'person',
          parent: {
            _id: 'fixture:offline:clinic',
            parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } }
          },
          reported_date: 1
        },
        {
          _id: 'temp:offline:clinic:patient_to_delete_no_shortcode',
          name: 'offline patient',
          type: 'person',
          parent: {
            _id: 'fixture:offline:clinic',
            parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } }
          },
          reported_date: 1
        },
        {
          _id: 'temp:online:clinic:patient_to_delete_with_shortcode',
          name: 'offline patient',
          patient_id: 'del654321',
          type: 'person',
          parent: {
            _id: 'fixture:online:clinic',
            parent: { _id: 'fixture:online', parent: { _id: 'PARENT_PLACE' } }
          },
          reported_date: 1
        },
        {
          _id: 'temp:online:clinic:patient_to_delete_no_shortcode',
          name: 'online patient',
          type: 'person',
          parent: {
            _id: 'fixture:online:clinic',
            parent: { _id: 'fixture:online', parent: { _id: 'PARENT_PLACE' } }
          },
          reported_date: 1
        },
      ];

      const submittersToDelete = [
        {
          _id: 'temp:offline:clinic:contact',
          name: 'offline submitter',
          type: 'person',
          parent: {
            _id: 'fixture:offline:clinic',
            parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } }
          },
          reported_date: 1
        },
        {
          _id: 'temp:online:clinic:contact',
          name: 'online submitter',
          type: 'person',
          parent: { _id: 'fixture:online:clinic', parent: { _id: 'fixture:online', parent: { _id: 'PARENT_PLACE' } } },
          reported_date: 1
        },
      ];
      const patientsToDeleteIds = patientsToDelete.map(doc => doc._id);
      const submittersToDeleteIds = submittersToDelete.map(doc => doc._id);

      before(() => sentinelUtils.waitForSentinel());

      beforeEach(() => {
        patientsToDelete.forEach(doc => delete doc._rev);
      });

      it('reports about deleted patients and deleted patients', () => {

        const patientWithShortcode = 'temp:offline:clinic:patient_to_delete_with_shortcode';
        const patientWithoutShortcode = 'temp:offline:clinic:patient_to_delete_no_shortcode';
        const onlinePatientWithShortcode = 'temp:online:clinic:patient_to_delete_with_shortcode';
        const onlinePatientWithoutShortcode = 'temp:online:clinic:patient_to_delete_no_shortcode';

        const generateReport = (patientUuid, username, fields) => {
          return reportForPatient(patientUuid, username, fields, false, patientsToDelete);
        };

        const reportScenarios = [
          { doc: generateReport(patientWithShortcode, null, ['patient_id']), allowed: false },
          { doc: generateReport(patientWithShortcode, null, ['patient_uuid']), allowed: false },
          { doc: generateReport(patientWithShortcode, null, ['patient_uuid', 'patient_id']), allowed: false },
          { doc: generateReport(patientWithoutShortcode, null, ['patient_uuid']), allowed: false },
          { doc: generateReport(patientWithShortcode, submittersToDelete[0], ['patient_id']), allowed: false },
          { doc: generateReport(patientWithShortcode, submittersToDelete[0], ['patient_uuid']), allowed: false },
          {
            doc: generateReport(patientWithShortcode, submittersToDelete[0], ['patient_uuid', 'patient_id']),
            allowed: false
          },
          { doc: generateReport(patientWithoutShortcode, submittersToDelete[0], ['patient_uuid']), allowed: false },
          { doc: generateReport(patientWithShortcode, submittersToDelete[1], ['patient_id']), allowed: false },
          { doc: generateReport(patientWithShortcode, submittersToDelete[1], ['patient_uuid']), allowed: false },
          {
            doc: generateReport(patientWithShortcode, submittersToDelete[1], ['patient_uuid', 'patient_id']),
            allowed: false
          },
          { doc: generateReport(patientWithoutShortcode, submittersToDelete[1], ['patient_uuid']), allowed: false },

          { doc: generateReport(onlinePatientWithShortcode, null, ['patient_id']), allowed: false },
          { doc: generateReport(onlinePatientWithShortcode, null, ['patient_uuid']), allowed: false },
          {
            doc: generateReport(onlinePatientWithShortcode, null, ['patient_uuid', 'patient_id']),
            allowed: false
          },

          { doc: generateReport(onlinePatientWithoutShortcode, null, ['patient_uuid']), allowed: false },
          { doc: generateReport(onlinePatientWithShortcode, submittersToDelete[0], ['patient_id']), allowed: false },
          { doc: generateReport(onlinePatientWithShortcode, submittersToDelete[0], ['patient_uuid']), allowed: false },
          {
            doc: generateReport(onlinePatientWithShortcode, submittersToDelete[0], ['patient_uuid', 'patient_id']),
            allowed: false
          },

          {
            doc: generateReport(onlinePatientWithoutShortcode, submittersToDelete[0], ['patient_uuid']),
            allowed: false
          },

          { doc: generateReport(onlinePatientWithShortcode, submittersToDelete[1], ['patient_id']), allowed: false },
          { doc: generateReport(onlinePatientWithShortcode, submittersToDelete[1], ['patient_uuid']), allowed: false },
          {
            doc: generateReport(onlinePatientWithShortcode, submittersToDelete[1], ['patient_uuid', 'patient_id']),
            allowed: false
          },

          {
            doc: generateReport(onlinePatientWithoutShortcode, submittersToDelete[1], ['patient_uuid']),
            allowed: false
          },
        ];

        const docs = reportScenarios.map(scenario => scenario.doc);
        return utils
          .saveDocs([...patientsToDelete, ...docs, ...submittersToDelete])
          .then(() => utils.deleteDocs(patientsToDeleteIds)) // delete subjects
          .then(results => results.forEach((result, idx) => patientsToDelete[idx]._rev = result.rev))
          .then(() => sentinelUtils.waitForSentinel(patientsToDeleteIds))
          .then(() => Promise.all(patientsToDelete.map(patient => utils.requestOnTestDb(
            _.defaults({ path: `/${patient._id}?rev=${patient._rev}` }, offlineRequestOptions)
          ).catch(err => err))))
          .then(results => {
            // can read deleted patients
            results.forEach((result, idx) => {
              if (patientsToDelete[idx]._id.startsWith('temp:offline')) {
                chai.expect(result).to.deep.include(patientsToDelete[idx]);
              } else {
                chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
              }
            });
          })
          .then(() => Promise.all(reportScenarios.map(scenario => utils.requestOnTestDb(
            _.defaults({ path: `/${scenario.doc._id}` }, offlineRequestOptions)
          ).catch(err => err))))
          .then(results => {
            // can read reports about deleted patients
            results.forEach((result, idx) => {
              if (reportScenarios[idx].allowed) {
                chai.expect(result).to.deep.include(reportScenarios[idx].doc, idx);
              } else {
                chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'}, idx);
              }
            });
          })
          .then(() => utils.deleteDocs(submittersToDeleteIds)) // delete submitters
          .then(() => sentinelUtils.waitForSentinel(submittersToDeleteIds))
          .then(() => Promise.all(reportScenarios.map(scenario => utils.requestOnTestDb(
            _.defaults({ path: `/${scenario.doc._id}` }, offlineRequestOptions)
          ).catch(err => err))))
          .then(results => {
            // can read reports about deleted patients and submitted by deleted contacts
            results.forEach((result, idx) => {
              if (reportScenarios[idx].allowed) {
                chai.expect(result).to.deep.include(reportScenarios[idx].doc, idx);
              } else {
                chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'}, idx);
              }
            });
          })
          .then(() => utils.deleteDocs(docs.map(doc => doc._id))) // delete reports
          .then(results => results.forEach((result, idx) => docs[idx]._rev = result.rev))
          .then(() => sentinelUtils.waitForSentinel(docs.map(doc => doc._id)))
          .then(() => Promise.all(reportScenarios.map(scenario => utils.requestOnTestDb(
            _.defaults({ path: `/${scenario.doc._id}?rev=${scenario.doc._rev}` }, offlineRequestOptions)
          ).catch(err => err))))
          .then(results => {
            // can read deleted reports about deleted patients submitted by deleted contacts
            results.forEach((result, idx) => {
              if (reportScenarios[idx].allowed) {
                chai.expect(result).to.deep.include(reportScenarios[idx].doc);
                chai.expect(result._deleted).to.equal(true);
              } else {
                chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
              }
            });
          });
      });

      it('reports about deleted patients and deleted patients with needs_signoff', () => {
        const offlineWithShortcode = 'temp:offline:clinic:patient_to_delete_with_shortcode';
        const offlineWithoutShortcode = 'temp:offline:clinic:patient_to_delete_no_shortcode';
        const onlineWithShortcode = 'temp:online:clinic:patient_to_delete_with_shortcode';
        const onlineWithoutShortcode = 'temp:online:clinic:patient_to_delete_no_shortcode';

        const generateReport = (patientUuid, username, fields) => {
          return reportForPatient(patientUuid, username, fields, true, patientsToDelete);
        };

        const reportScenarios = [
          { doc: generateReport(offlineWithShortcode, null, ['patient_id']), allowed: false },
          { doc: generateReport(offlineWithShortcode, null, ['patient_uuid']), allowed: false },
          { doc: generateReport(offlineWithShortcode, null, ['patient_uuid', 'patient_id']), allowed: false },

          { doc: generateReport(offlineWithoutShortcode, null, ['patient_uuid']), allowed: false },

          { doc: generateReport(offlineWithShortcode, submittersToDelete[0], ['patient_id']), allowed: true },
          { doc: generateReport(offlineWithShortcode, submittersToDelete[0], ['patient_uuid']), allowed: true },
          {
            doc: generateReport(offlineWithShortcode, submittersToDelete[0], ['patient_uuid', 'patient_id']),
            allowed: true
          },

          { doc: generateReport(offlineWithoutShortcode, submittersToDelete[0], ['patient_uuid']), allowed: true },

          { doc: generateReport(offlineWithShortcode, submittersToDelete[1], ['patient_id']), allowed: false },
          { doc: generateReport(offlineWithShortcode, submittersToDelete[1], ['patient_uuid']), allowed: false },
          {
            doc: generateReport(offlineWithShortcode, submittersToDelete[1], ['patient_uuid', 'patient_id']),
            allowed: false
          },

          { doc: generateReport(offlineWithoutShortcode, submittersToDelete[1], ['patient_uuid']), allowed: false },

          { doc: generateReport(onlineWithShortcode, null, ['patient_id']), allowed: false },
          { doc: generateReport(onlineWithShortcode, null, ['patient_uuid']), allowed: false },
          { doc: generateReport(onlineWithShortcode, null, ['patient_uuid', 'patient_id']), allowed: false },

          { doc: generateReport(onlineWithoutShortcode, null, ['patient_uuid']), allowed: false },

          { doc: generateReport(onlineWithShortcode, submittersToDelete[0], ['patient_id']), allowed: true },
          { doc: generateReport(onlineWithShortcode, submittersToDelete[0], ['patient_uuid']), allowed: true },
          {
            doc: generateReport(onlineWithShortcode, submittersToDelete[0], ['patient_uuid', 'patient_id']),
            allowed: true
          },

          { doc: generateReport(onlineWithoutShortcode, submittersToDelete[0], ['patient_uuid']), allowed: true },

          { doc: generateReport(onlineWithShortcode, submittersToDelete[1], ['patient_id']), allowed: false },
          { doc: generateReport(onlineWithShortcode, submittersToDelete[1], ['patient_uuid']), allowed: false },
          {
            doc: generateReport(onlineWithShortcode, submittersToDelete[1], ['patient_uuid', 'patient_id']),
            allowed: false
          },

          { doc: generateReport(onlineWithoutShortcode, submittersToDelete[1], ['patient_uuid']), allowed: false },
        ];

        const docs = reportScenarios.map(scenario => scenario.doc);
        return utils
          .updateSettings({replication_depth: [{ role: 'district_admin', depth: 1 }]}, true)
          .then(() => utils.saveDocs([...patientsToDelete, ...docs, ...submittersToDelete]))
          .then(() => Promise.all(patientsToDelete.map(patient => utils.requestOnTestDb(
            _.defaults({ path: `/${patient._id}` }, offlineRequestOptions)
          ).catch(err => err))))
          .then(results => {
            // cannot read patients
            results.forEach(result => {
              chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
            });
          })
          .then(() => Promise.all(reportScenarios.map(scenario => utils.requestOnTestDb(
            _.defaults({ path: `/${scenario.doc._id}` }, offlineRequestOptions)
          ).catch(err => err))))
          .then(results => {
            // can read reports about deleted patients
            results.forEach((result, idx) => {
              if (reportScenarios[idx].allowed) {
                chai.expect(result).to.deep.include(reportScenarios[idx].doc);
              } else {
                console.log(idx, result);
                chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
              }
            });
          })
          .then(() => utils.deleteDocs(patientsToDeleteIds)) // delete subjects
          .then(results => results.forEach((result, idx) => patientsToDelete[idx]._rev = result.rev))
          .then(() => sentinelUtils.waitForSentinel(patientsToDeleteIds))
          .then(() => Promise.all(patientsToDelete.map(patient => utils.requestOnTestDb(
            _.defaults({ path: `/${patient._id}?rev=${patient._rev}` }, offlineRequestOptions)
          ).catch(err => err))))
          .then(results => {
            // cannot read deleted patients
            results.forEach(result => {
              chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
            });
          })
          .then(() => Promise.all(reportScenarios.map(scenario => utils.requestOnTestDb(
            _.defaults({ path: `/${scenario.doc._id}` }, offlineRequestOptions)
          ).catch(err => err))))
          .then(results => {
            // can read reports about deleted patients
            results.forEach((result, idx) => {
              if (reportScenarios[idx].allowed) {
                chai.expect(result).to.deep.include(reportScenarios[idx].doc);
              } else {
                chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'}, idx);
              }
            });
          })
          .then(() => utils.deleteDocs(submittersToDeleteIds)) // delete submitters
          .then(() => sentinelUtils.waitForSentinel(submittersToDeleteIds))
          .then(() => Promise.all(reportScenarios.map(scenario => utils.requestOnTestDb(
            _.defaults({ path: `/${scenario.doc._id}` }, offlineRequestOptions)
          ).catch(err => err))))
          .then(results => {
            // can read reports about deleted patients and submitted by deleted contacts
            results.forEach((result, idx) => {
              if (reportScenarios[idx].allowed) {
                chai.expect(result).to.deep.include(reportScenarios[idx].doc);
              } else {
                chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
              }
            });
          })
          .then(() => utils.deleteDocs(docs.map(doc => doc._id))) // delete reports
          .then(results => results.forEach((result, idx) => docs[idx]._rev = result.rev))
          .then(() => sentinelUtils.waitForSentinel(docs.map(doc => doc._id)))
          .then(() => Promise.all(reportScenarios.map(scenario => utils.requestOnTestDb(
            _.defaults({ path: `/${scenario.doc._id}?rev=${scenario.doc._rev}` }, offlineRequestOptions)
          ).catch(err => err))))
          .then(results => {
            // can read deleted reports about deleted patients submitted by deleted contacts
            results.forEach((result, idx) => {
              if (reportScenarios[idx].allowed) {
                chai.expect(result).to.deep.include(reportScenarios[idx].doc);
                chai.expect(result._deleted).to.equal(true);
              } else {
                chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
              }
            });
          });
      });
    });

    it('GET with open_revs', () => {
      offlineRequestOptions.method = 'GET';

      const docs = [
        {
          _id: 'a1_revs',
          type: 'clinic',
          parent: { _id: 'fixture:offline' },
          name: 'Allowed Contact 1',
        },
        {
          _id: 'd1_revs',
          type: 'clinic',
          parent: { _id: 'fixture:online' },
          name: 'Denied Contact 1',
        },
        {
          _id: 'd2_revs',
          type: 'clinic',
          parent: { _id: 'fixture:online' },
          name: 'Denied Contact 2',
        },
      ];

      return utils
        .saveDocsRevs(docs)
        .then(() => utils.saveDocsRevs(docs))
        .then(() => {
          docs[0].parent = { _id: 'fixture:online' };
          docs[1].parent = { _id: 'fixture:offline' };

          return utils.saveDocsRevs(docs);
        })
        .then(() => {
          const deletes = [];

          deletes.push({
            _id: docs[0]._id,
            _rev: docs[0]._rev,
            _deleted: true,
          });
          deletes.push({
            _id: docs[1]._id,
            _rev: docs[1]._rev,
            _deleted: true,
          });

          return utils.saveDocs(deletes);
        })
        .then(results => {
          results.forEach((result, key) => (docs[key]._rev = result.rev));
          return Promise.all(docs.map(doc => utils.requestOnTestDb(`/${doc._id}?rev=${doc._rev}&revs=true`)));
        })
        .then(results => Promise.all(
          _.flattenDeep(
            results.map(result => {
              const open_revs = result._revisions.ids.map((rev, key) => `${result._revisions.start - key}-${rev}`);
              const path = `/${result._id}?rev=${result._rev}&open_revs=${JSON.stringify(open_revs)}`;
              const pathAll = `/${result._id}?rev=${result._rev}&open_revs=all`;
              return [
                utils.requestOnTestDb(_.defaults({ path: path }, offlineRequestOptions)),
                utils.requestOnTestDb(_.defaults({ path: pathAll }, offlineRequestOptions)),
              ];
            })
          )
        ))
        .then(results => {
          chai.expect(results[0].length).to.equal(2);
          chai.expect(results[0][0].ok._rev.startsWith('1')).to.equal(true);
          chai.expect(results[0][1].ok._rev.startsWith('2')).to.equal(true);
          chai.expect(
            results[0].every(result => result.ok._id === 'a1_revs' && result.ok.parent._id === 'fixture:offline')
          ).to.equal(true);

          chai.expect(results[1].length).to.equal(0);

          chai.expect(results[2].length).to.equal(1);
          chai.expect(results[2][0].ok._rev.startsWith('3')).to.equal(true);
          chai.expect(results[2][0].ok).to.deep.include({ _id: 'd1_revs', parent: { _id: 'fixture:offline' } });
          chai.expect(results[3].length).to.equal(0);
          chai.expect(results[4].length).to.equal(0);
          chai.expect(results[5].length).to.equal(0);
        });
    });

    it('GET with various params', () => {
      const revs = {
        allowed_attach: [],
        denied_attach: [],
      };

      return utils
        .saveDocs([
          {
            _id: 'allowed_attach',
            type: 'clinic',
            parent: { _id: 'fixture:offline' },
            name: 'allowed attach',
          },
          {
            _id: 'denied_attach',
            type: 'clinic',
            parent: { _id: 'fixture:online' },
            name: 'denied attach',
          },
        ])
        .then(results => {
          return Promise.all(
            results.map(result => {
              revs[result.id].push(result.rev);
              return utils.requestOnTestDb({
                path: `/${result.id}/att_name?rev=${result.rev}`,
                method: 'PUT',
                body: 'my attachment content',
                headers: { 'Content-Type': 'text/plain' },
                json: false,
              });
            })
          );
        })
        .then(results => {
          results.forEach(result => revs[result.id].push(result.rev));
          return Promise.all([
            utils.requestOnTestDb(Object.assign(
              { path: `/allowed_attach?rev=${revs.allowed_attach[0]}&attachments=true&revs=true` },
              offlineRequestOptions
            )),
            utils.requestOnTestDb(Object.assign(
              { path: `/allowed_attach?rev=${revs.allowed_attach[1]}&attachments=true&revs=false` },
              offlineRequestOptions
            )),
            utils.requestOnTestDb(Object.assign(
              { path: `/allowed_attach?attachments=false&revs=true&revs_info=true` },
              offlineRequestOptions
            )),
            utils.requestOnTestDb(Object.assign(
              { path: `/denied_attach?rev=${revs.denied_attach[0]}&attachments=true&revs=true` },
              offlineRequestOptions
            )).catch(err => err),
            utils.requestOnTestDb(Object.assign(
              { path: `/denied_attach?rev=${revs.denied_attach[1]}&attachments=true&revs=false` },
              offlineRequestOptions
            )).catch(err => err),
            utils.requestOnTestDb(Object.assign(
              { path: `/denied_attach?attachments=true&revs=true&revs_info=true` },
              offlineRequestOptions
            )).catch(err => err),
          ]);
        })
        .then(results => {
          chai.expect(results[0]._attachments).to.be.undefined;
          chai.expect(results[0]._revisions).to.be.ok;
          chai.expect(`${results[0]._revisions.start}-${results[0]._revisions.ids[0]}`)
            .to.equal(revs.allowed_attach[0]);

          chai.expect(results[1]._attachments).to.be.ok;
          chai.expect(results[1]._attachments.att_name).to.be.ok;
          chai.expect(results[1]._attachments.att_name.data).to.be.ok;
          chai.expect(results[1]._revisions).to.be.undefined;
          chai.expect(results[1]._revs_info).to.be.undefined;

          chai.expect(results[2]._attachments).to.be.ok;
          chai.expect(results[2]._attachments.att_name).to.be.ok;
          chai.expect(results[2]._attachments.att_name.data).to.be.undefined;
          chai.expect(results[2]._attachments.att_name.stub).to.deep.equal(true);
          chai.expect(results[2]._revisions).to.be.ok;
          chai.expect(`${results[2]._revisions.start}-${results[2]._revisions.ids[0]}`)
            .to.deep.equal(revs.allowed_attach[1]);
          chai.expect(results[2]._revs_info).to.be.ok;
          chai.expect(results[2]._revs_info.length).to.deep.equal(results[2]._revisions.ids.length);
          chai.expect(results[2]._revs_info[0]).to.deep.equal({ rev: revs.allowed_attach[1], status: 'available' });

          chai.expect(results[3].statusCode).to.deep.equal(403);
          chai.expect(results[4].statusCode).to.deep.equal(403);
          chai.expect(results[5].statusCode).to.deep.equal(403);
        });
    });

    it('GET tasks and targets', () => {
      const supervisorRequestOptions = { auth: { username: 'supervisor', password }, };
      const allowedTask = {
        _id: 'task1',
        type: 'task',
        user: 'org.couchdb.user:offline',
        owner: 'fixture:offline:clinic',
        requester: 'fixture:offline:clinic',
        emission: {},
      };
      const deniedTask = {
        _id: 'task2',
        type: 'task',
        user: 'any_other_user',
        owner: 'fixture:offline:clinic',
        requester: 'fixture:offline:clinic',
        emission: {},
      };

      const allowedTarget = {
        _id: 'target1',
        type: 'target',
        user: 'org.couchdb.user:offline',
        owner: 'fixture:offline:clinic',
        targets: [],
      };

      const deniedTarget = {
        _id: 'target2',
        type: 'target',
        user: 'org.couchdb.user:offline',
        owner: 'fixture:online:clinic',
        targets: [],
      };

      return utils
        .updateSettings({ replication_depth: [{ role: 'district_admin', depth: 2 }]}, true)
        .then(() => utils.saveDocs([ allowedTask, deniedTask, allowedTarget, deniedTarget ]))
        .then(() => Promise.all([
          utils.requestOnTestDb(_.defaults({ path: '/task1' }, offlineRequestOptions)),
          utils.requestOnTestDb(_.defaults({ path: '/task2' }, offlineRequestOptions)).catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/target1' }, offlineRequestOptions)),
          utils.requestOnTestDb(_.defaults({ path: '/target2' }, offlineRequestOptions)).catch(err => err),
        ]))
        .then(results => {
          chai.expect(results[0]).to.deep.include(allowedTask);
          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[2]).to.deep.include(allowedTarget);
          chai.expect(results[3]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
        })
        .then(() => Promise.all([
          utils.requestOnTestDb(_.defaults({ path: '/fixture:user:offline' }, supervisorRequestOptions)),
          utils
            .requestOnTestDb(_.defaults({ path: '/org.couchdb.user:offline' }, supervisorRequestOptions))
            .catch(err => err),
          utils
            .requestOnTestDb(_.defaults({ path: '/fixture:offline:clinic:patient' }, supervisorRequestOptions))
            .catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/task1' }, supervisorRequestOptions)).catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/task2' }, supervisorRequestOptions)).catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/target1' }, supervisorRequestOptions)),
          utils.requestOnTestDb(_.defaults({ path: '/target2' }, supervisorRequestOptions)),
        ]))
        .then(results => {
          // supervisor can see the user's contact
          chai.expect(results[0]._id).to.equal('fixture:user:offline');
          // supervisor can't see the user's user-settings document
          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          // supervisor has replication depth of 2
          chai.expect(results[2]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});

          // supervisor can't see the any user's tasks
          chai.expect(results[3]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[4]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});

          // supervisor can see both targets
          chai.expect(results[5]).to.deep.include(allowedTarget);
          chai.expect(results[6]).to.deep.include(deniedTarget);
        });
    });

    it('GET unallocated records', () => {
      const settings = {
        district_admins_access_unallocated_messages: true,
        permissions: {
          can_view_unallocated_data_records: ['district_admin'],
        }
      };
      const doc = {
        _id: uuid(),
        type: 'data_record',
        form: 'FORM',
        fields: {},
        errors: [],
        reported_date: new Date().getTime(),
        sms_message: {
          message: 'FORM public',
          form: 'FORM',
          from: '+01232323',
        }
      };

      return utils
        .saveDoc(doc)
        .then(() => utils.requestOnTestDb(_.defaults({ path: `/${doc._id}` }, offlineRequestOptions)).catch(err => err))
        .then(result => {
          // user can't see the unallocated report without permissions
          chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
        })
        .then(() => utils.updateSettings(settings, true))
        .then(() => utils.requestOnTestDb(_.defaults({ path: `/${doc._id}` }, offlineRequestOptions)).catch(err => err))
        .then(result => {
          // user can see the unallocated report with permissions
          chai.expect(result).to.deep.include(doc);
        });
    });

    it('GET sensitive documents', () => {
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
          fields: { private: false, place_id: 'shortcode:offline', },
        },
        {
          _id: 'insensitive_report_5',
          type: 'data_record',
          form: 'a',
          contact: { _id: 'fixture:online'},
          fields: { private: false, patient_id: 'shortcode:user:offline', },
        },
        {
          _id: 'insensitive_report_6',
          type: 'data_record',
          form: 'a',
          contact: { _id: 'fixture:offline'},
          fields: { private: true, patient_id: 'shortcode:user:offline', },
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
          fields: { private: true, place_id: 'fixture:offline', },
        },
        {
          _id: 'sensitive_report_5',
          type: 'data_record',
          form: 'a',
          contact: { _id: 'fixture:online'},
          fields: { private: true, patient_uuid: 'fixture:user:offline', },
        },
        {
          _id: 'sensitive_report_6',
          type: 'data_record',
          form: 'a',
          contact: { _id: 'fixture:online'},
          fields: { private: true, patient_id: 'shortcode:user:offline', },
        },
      ];

      return utils
        .saveDocs(docs)
        .then(() => Promise.all(docs.map(doc => utils
          .requestOnTestDb(_.defaults({ path: `/${doc._id}` }, offlineRequestOptions))
          .catch(err => err))))
        .then(results => {
          results.forEach((result, idx) => {
            const originalDoc = docs[idx];

            if (originalDoc._id.startsWith('insensitive')) {
              // not a private report, expect the result to match the doc
              chai.expect(result).excluding('_rev').to.deep.equal(originalDoc);
            } else {
              // a private report, expect an error
              chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
            }
          });
        });
    });

    it('POST', () => {
      offlineRequestOptions.method = 'POST';

      const allowedDoc = {
        _id: 'allowed_doc_post',
        type: 'clinic',
        parent: { _id: 'fixture:offline' },
        name: 'allowed',
      };
      const deniedDoc = {
        _id: 'denied_doc_post',
        type: 'clinic',
        parent: { _id: 'fixture:online' },
        name: 'denied',
      };

      return Promise.all([
        utils.requestOnTestDb(_.defaults({ body: allowedDoc, path: '/' }, offlineRequestOptions)),
        utils.requestOnTestDb(_.defaults({ body: deniedDoc, path: '/' }, offlineRequestOptions)).catch(err => err),
        utils.requestOnTestDb(_.defaults({ path: '/' }, offlineRequestOptions)).catch(err => err),
      ])
        .then(([allowed, denied, forbidden]) => {
          chai.expect(allowed).to.include({ id: 'allowed_doc_post', ok: true, });
          chai.expect(denied).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(forbidden).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});

          return Promise.all([
            utils.getDoc('allowed_doc_post'),
            utils.getDoc('denied_doc_post').catch(err => err),
          ]);
        })
        .then(([allowed, denied]) => {
          chai.expect(allowed).to.deep.include(allowedDoc);
          chai.expect(denied.statusCode).to.deep.equal(404);

          const ids = ['allowed_doc_post', 'denied_doc_post'];
          return sentinelUtils.waitForSentinel(ids).then(() => sentinelUtils.getInfoDocs(ids));
        }).then(([allowedInfo, deniedInfo]) => {
          chai.expect(allowedInfo).to.be.ok;
          chai.expect(deniedInfo).to.be.undefined;
        });
    });

    it('POST many types of reports', () => {
      offlineRequestOptions.method = 'POST';

      const reportScenarios = [
        { doc: reportForPatient('fixture:offline:patient', null, []), allowed: false },
        { doc: reportForPatient('fixture:offline:patient', null, ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', null, ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', null, ['patient_id', 'patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'offline', []), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'offline', ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'offline', ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'offline', ['patient_id', 'patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'online', []), allowed: false },
        { doc: reportForPatient('fixture:offline:patient', 'online', ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'online', ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'online', ['patient_id', 'patient_uuid']), allowed: true },

        { doc: reportForPatient('fixture:offline:clinic:patient', null, []), allowed: false },
        { doc: reportForPatient('fixture:offline:clinic:patient', null, ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', null, ['patient_uuid']), allowed: true },
        {
          doc: reportForPatient('fixture:offline:clinic:patient', null, ['patient_id', 'patient_uuid']),
          allowed: true
        },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', []), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', ['patient_uuid']), allowed: true },
        {
          doc: reportForPatient('fixture:offline:clinic:patient', 'offline', ['patient_id', 'patient_uuid']),
          allowed: true
        },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'online', []), allowed: false },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'online', ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'online', ['patient_uuid']), allowed: true },
        {
          doc: reportForPatient('fixture:offline:clinic:patient', 'online', ['patient_id', 'patient_uuid']),
          allowed: true
        },

        { doc: reportForPatient('fixture:online:patient', null, []), allowed: false },
        { doc: reportForPatient('fixture:online:patient', null, ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', null, ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', null, ['patient_id', 'patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'offline', []), allowed: true },
        { doc: reportForPatient('fixture:online:patient', 'offline', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'offline', ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'offline', ['patient_id', 'patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'online', []), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'online', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'online', ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'online', ['patient_id', 'patient_uuid']), allowed: false },

        { doc: reportForPatient('fixture:online:clinic:patient', null, []), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', null, ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', null, ['patient_uuid']), allowed: false },
        {
          doc: reportForPatient('fixture:online:clinic:patient', null, ['patient_id', 'patient_uuid']),
          allowed: false
        },
        { doc: reportForPatient('fixture:online:clinic:patient', 'offline', []), allowed: true },
        { doc: reportForPatient('fixture:online:clinic:patient', 'offline', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'offline', ['patient_uuid']), allowed: false },
        {
          doc: reportForPatient('fixture:online:clinic:patient', 'offline', ['patient_id', 'patient_uuid']),
          allowed: false
        },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', []), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', ['patient_uuid']), allowed: false },
        {
          doc: reportForPatient('fixture:online:clinic:patient', 'online', ['patient_id', 'patient_uuid']),
          allowed: false
        },
      ];
      return Promise
        .all(reportScenarios.map(scenario => utils.requestOnTestDb(
          _.defaults({ path: '/', body: scenario.doc }, offlineRequestOptions)
        ).catch(err => err)))
        .then(results => {
          results.forEach((result, idx) => {
            if (reportScenarios[idx].allowed) {
              chai.expect(result).to.deep.include({ ok: true, id: reportScenarios[idx].doc._id });
            } else {
              chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
            }
          });
        });
    });

    it('POST many types of reports and replication depth and needs_signoff', () => {
      offlineRequestOptions.method = 'POST';

      const reportScenarios = [
        { doc: reportForPatient('fixture:offline:patient', null, ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'offline', ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', null, ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:offline:clinic:patient', null, ['patient_uuid'], true), allowed: false },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', ['patient_id'], true), allowed: true },

        { doc: reportForPatient('fixture:online:patient', null, ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'online', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', null, ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', null, ['patient_uuid'], true), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', ['patient_id'], true), allowed: false },
      ];
      return utils
        .updateSettings({replication_depth: [{ role: 'district_admin', depth: 1 }]}, true)
        .then(() => Promise.all(reportScenarios.map(scenario => utils.requestOnTestDb(
          _.defaults({ path: '/', body: scenario.doc }, offlineRequestOptions)
        ).catch(err => err))))
        .then(results => {
          results.forEach((result, idx) => {
            if (reportScenarios[idx].allowed) {
              chai.expect(result).to.deep.include({ ok: true, id: reportScenarios[idx].doc._id });
            } else {
              chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
            }
          });
        });
    });

    it('POST tasks and targets', () => {
      offlineRequestOptions.method = 'POST';

      const allowedTask = {
        _id: 'task1',
        type: 'task',
        user: 'org.couchdb.user:offline',
        owner: 'fixture:offline:clinic',
        requester: 'fixture:offline:clinic',
        emission: {},
      };
      const deniedTask = {
        _id: 'task2',
        type: 'task',
        user: 'any_other_user',
        owner: 'fixture:offline:clinic',
        requester: 'fixture:offline:clinic',
        emission: {},
      };

      const allowedTarget = {
        _id: 'target1',
        type: 'target',
        user: 'org.couchdb.user:offline',
        owner: 'fixture:offline:clinic',
        targets: [],
      };
      const deniedTarget = {
        _id: 'target2',
        type: 'target',
        user: 'org.couchdb.user:offline',
        owner: 'fixture:online:clinic',
        targets: [],
      };

      return Promise
        .all([
          utils.requestOnTestDb(_.defaults({ body: allowedTask, path: '/' }, offlineRequestOptions)),
          utils.requestOnTestDb(_.defaults({ body: deniedTask, path: '/' }, offlineRequestOptions)).catch(err => err),
          utils.requestOnTestDb(_.defaults({ body: allowedTarget, path: '/' }, offlineRequestOptions)),
          utils.requestOnTestDb(_.defaults({ body: deniedTarget, path: '/' }, offlineRequestOptions)).catch(err => err),
        ])
        .then(results => {
          chai.expect(results[0]).to.deep.include({ ok: true, id: 'task1' });
          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[2]).to.deep.include({ ok: true, id: 'target1' });
          chai.expect(results[3]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
        });
    });

    it('PUT', () => {
      offlineRequestOptions.method = 'PUT';

      const docs = [
        {
          _id: 'a_put_1',
          type: 'clinic',
          parent: { _id: 'fixture:offline' },
          name: 'a1',
        },
        {
          _id: 'a_put_2',
          type: 'clinic',
          parent: { _id: 'fixture:offline' },
          name: 'a2',
        },
        {
          _id: 'd_put_1',
          type: 'clinic',
          parent: { _id: 'fixture:online' },
          name: 'd1',
        },
        {
          _id: 'd_put_2',
          type: 'clinic',
          parent: { _id: 'fixture:online' },
          name: 'd2',
        },
      ];

      return utils
        .saveDocsRevs(docs)
        .then(() => {
          const updates = [
            {
              _id: 'n_put_1',
              type: 'clinic',
              parent: { _id: 'fixture:offline' },
              name: 'n1',
            }, // new allowed
            {
              _id: 'n_put_2',
              type: 'clinic',
              parent: { _id: 'fixture:online' },
              name: 'n2',
            }, // new denied
            _.defaults({ name: 'a1 updated' }, docs[0]), // stored allowed, new allowed
            _.defaults({ name: 'a2 updated', parent: { _id: 'fixture:online' } }, docs[1]), // stored ok, new denied
            _.defaults({ name: 'd1 updated' }, docs[2]), // stored denied, new denied
            _.defaults({ name: 'd2 updated', parent: { _id: 'fixture:offline' } }, docs[3]), // stored denied, new ok
          ];

          const promises = updates.map(doc => utils
            .requestOnTestDb(Object.assign({ path: `/${doc._id}`, body: doc }, offlineRequestOptions))
            .catch(err => err));
          return Promise.all(promises);
        })
        .then(results => {
          chai.expect(results[0]).to.include({ ok: true, id: 'n_put_1' });
          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[2]).to.include({ ok: true, id: 'a_put_1', });

          chai.expect(results[3]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[4]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[5]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});

          const ids = ['a_put_1', 'a_put_2', 'd_put_1', 'd_put_2', 'n_put_1', 'n_put_2'];

          return sentinelUtils.waitForSentinel(ids).then(() => sentinelUtils.getInfoDocs(ids));
        }).then(([a1, a2, d1, d2, n1, n2]) => {
          chai.expect(a1._rev.substring(0, 2)).to.equal('4-');
          chai.expect(a2._rev.substring(0, 2)).to.equal('3-');
          chai.expect(d1._rev.substring(0, 2)).to.equal('3-');
          chai.expect(d2._rev.substring(0, 2)).to.equal('3-');
          chai.expect(n1._rev.substring(0, 2)).to.equal('3-');
          chai.expect(n2).to.be.undefined;
        });
    });

    it('PUT over DELETE stubs', () => {
      offlineRequestOptions.method = 'PUT';

      const docs = [
        {
          _id: 'a_put_del_1',
          type: 'clinic',
          parent: { _id: 'fixture:offline' },
          name: 'a1',
        },
        {
          _id: 'a_put_del_2',
          type: 'clinic',
          parent: { _id: 'fixture:offline' },
          name: 'a2',
        },
        {
          _id: 'd_put_del_1',
          type: 'clinic',
          parent: { _id: 'fixture:online' },
          name: 'd1',
        },
        {
          _id: 'd_put_del_2',
          type: 'clinic',
          parent: { _id: 'fixture:online' },
          name: 'd2',
        },
      ];

      return utils
        .saveDocs(docs)
        .then(results => Promise.all(
          docs.map((doc, idx) => utils.requestOnTestDb({
            method: 'DELETE',
            path: `/${doc._id}?rev=${results[idx].rev}`,
          }))
        ))
        .then(results => {
          results.forEach((result, idx) => (docs[idx]._rev = result.rev));

          const updates = [
            _.defaults({ name: 'a1 updated' }, docs[0]), // prev allowed, deleted, new allowed
            _.defaults({ name: 'a2 updated', parent: { _id: 'fixture:online' } }, docs[1]), // prev ok, deleted/new no
            _.defaults({ name: 'd1 updated' }, docs[2]), // prev denied, deleted, new denied
            _.defaults({ name: 'd2 updated', parent: { _id: 'fixture:offline' } }, docs[3]), // prev no, deleted/new ok
          ];

          return Promise.all(updates.map(doc => utils
            .requestOnTestDb(Object.assign({ path: `/${doc._id}`, body: doc }, offlineRequestOptions))
            .catch(err => err)));
        })
        .then(results => {
          chai.expect(results[0]).to.deep.nested.include({ statusCode: 409, 'responseBody.error': 'conflict'});
          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[2]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[3]).to.deep.nested.include({ statusCode: 409, 'responseBody.error': 'conflict'});
        });
    });

    it('PUT many types of reports', () => {
      offlineRequestOptions.method = 'PUT';

      const reportScenarios = [
        { doc: reportForPatient('fixture:offline:patient', null, []), allowed: false },
        { doc: reportForPatient('fixture:offline:patient', null, ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', null, ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', null, ['patient_id', 'patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'offline', []), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'offline', ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'offline', ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'offline', ['patient_id', 'patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'online', []), allowed: false },
        { doc: reportForPatient('fixture:offline:patient', 'online', ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'online', ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'online', ['patient_id', 'patient_uuid']), allowed: true },

        { doc: reportForPatient('fixture:offline:clinic:patient', null, []), allowed: false },
        { doc: reportForPatient('fixture:offline:clinic:patient', null, ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', null, ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', null, ['patient_id', 'patient_uuid']),
          allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', []), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', ['patient_id', 'patient_uuid']),
          allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'online', []), allowed: false },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'online', ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'online', ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'online', ['patient_id', 'patient_uuid']),
          allowed: true },

        { doc: reportForPatient('fixture:online:patient', null, []), allowed: false },
        { doc: reportForPatient('fixture:online:patient', null, ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', null, ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', null, ['patient_id', 'patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'offline', []), allowed: true },
        { doc: reportForPatient('fixture:online:patient', 'offline', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'offline', ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'offline', ['patient_id', 'patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'online', []), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'online', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'online', ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'online', ['patient_id', 'patient_uuid']), allowed: false },

        { doc: reportForPatient('fixture:online:clinic:patient', null, []), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', null, ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', null, ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', null, ['patient_id', 'patient_uuid']),
          allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'offline', []), allowed: true },
        { doc: reportForPatient('fixture:online:clinic:patient', 'offline', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'offline', ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'offline', ['patient_id', 'patient_uuid']),
          allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', []), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', ['patient_id', 'patient_uuid']),
          allowed: false },
      ];
      return Promise
        .all(reportScenarios.map(scenario => utils.requestOnTestDb(
          _.defaults({ path: `/${scenario.doc._id}`, body: scenario.doc }, offlineRequestOptions)
        ).catch(err => err)))
        .then(results => {
          results.forEach((result, idx) => {
            if (reportScenarios[idx].allowed) {
              chai.expect(result).to.deep.include({ ok: true, id: reportScenarios[idx].doc._id });
            } else {
              chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
            }
          });
        });
    });

    it('PUT many types of reports and replication depth and needs_signoff', () => {
      offlineRequestOptions.method = 'PUT';

      const reportScenarios = [
        { doc: reportForPatient('fixture:offline:patient', null, ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'offline', ['patient_id']), allowed: true },
        { doc: reportForPatient('fixture:offline:clinic:patient', null, ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:offline:clinic:patient', null, ['patient_uuid'], true), allowed: false },
        { doc: reportForPatient('fixture:offline:clinic:patient', 'offline', ['patient_id'], true), allowed: true },

        { doc: reportForPatient('fixture:online:patient', null, ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'online', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', null, ['patient_uuid']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', null, ['patient_uuid'], true), allowed: false },
        { doc: reportForPatient('fixture:online:clinic:patient', 'online', ['patient_id'], true), allowed: false },
      ];
      return utils
        .updateSettings({replication_depth: [{ role: 'district_admin', depth: 1 }]}, true)
        .then(() => Promise.all(reportScenarios.map(scenario => utils.requestOnTestDb(
          _.defaults({ path: `/${scenario.doc._id}`, body: scenario.doc }, offlineRequestOptions)
        ).catch(err => err))))
        .then(results => {
          results.forEach((result, idx) => {
            if (reportScenarios[idx].allowed) {
              chai.expect(result).to.deep.include({ ok: true, id: reportScenarios[idx].doc._id });
            } else {
              chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
            }
          });
        });
    });

    it('PUT with reports and existent docs', () => {
      offlineRequestOptions.method = 'PUT';

      const existentReports = [
        { doc: reportForPatient('fixture:offline:patient', 'offline', ['patient_uuid']), allowed: true },
        { doc: reportForPatient('fixture:offline:patient', 'online', ['patient_id', 'patient_uuid']), allowed: true },

        { doc: reportForPatient('fixture:online:patient', 'offline', ['patient_id']), allowed: false },
        { doc: reportForPatient('fixture:online:patient', 'online', ['patient_id', 'patient_uuid']), allowed: false },
      ];
      let reportScenarios;

      return utils
        .saveDocs(existentReports.map(scenario => scenario.doc))
        .then(results =>  {
          reportScenarios = [
            { doc: setReportPatient(existentReports[0].doc, 'fixture:online:patient', ['patient_id']), allowed: false },
            { doc: setReportContact(existentReports[1].doc, 'offline'), allowed: true },

            { doc: setReportPatient(existentReports[2].doc, 'fixture:offline:patient', ['patient_uuid']),
              allowed: false },
            { doc: setReportContact(existentReports[3].doc, 'offline'), allowed: false },
          ];
          results.forEach((result, i) => reportScenarios[i].doc._rev = result.rev);
        })
        .then(() => Promise.all(reportScenarios.map(scenario => utils.requestOnTestDb(
          _.defaults({ path: `/${scenario.doc._id}`, body: scenario.doc }, offlineRequestOptions)
        ).catch(err => err))))
        .then(results => {
          results.forEach((result, idx) => {
            if (reportScenarios[idx].allowed) {
              chai.expect(result).to.deep.include({ ok: true, id: reportScenarios[idx].doc._id });
            } else {
              chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
            }
          });
        });
    });

    it('PUT tasks and targets', () => {
      offlineRequestOptions.method = 'PUT';

      const allowedTask = {
        _id: 'task1',
        type: 'task',
        user: 'org.couchdb.user:offline',
        owner: 'fixture:offline:clinic',
        requester: 'fixture:offline:clinic',
        emission: {},
      };
      const deniedTask = {
        _id: 'task2',
        type: 'task',
        user: 'any_other_user',
        owner: 'fixture:offline:clinic',
        requester: 'fixture:offline:clinic',
        emission: {},
      };

      const allowedTarget = {
        _id: 'target1',
        type: 'target',
        user: 'org.couchdb.user:offline',
        owner: 'fixture:offline:clinic',
        targets: [],
      };
      const deniedTarget = {
        _id: 'target2',
        type: 'target',
        user: 'org.couchdb.user:offline',
        owner: 'fixture:online:clinic',
        targets: [],
      };

      const docs = [ allowedTask, deniedTask, allowedTarget, deniedTarget ];

      return utils
        .saveDocsRevs(docs)
        .then(() => {
          const updates = docs.map(doc => Object.assign({ updated: true }, doc));
          const promises = updates.map(doc => utils
            .requestOnTestDb(Object.assign({ path: `/${doc._id}`, body: doc }, offlineRequestOptions))
            .catch(err => err));
          return Promise.all(promises);
        })
        .then(results => {
          chai.expect(results[0]).to.deep.include({ ok: true, id: 'task1' });
          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[2]).to.deep.include({ ok: true, id: 'target1' });
          chai.expect(results[3]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
        });
    });

    it('DELETE', () => {
      offlineRequestOptions.method = 'DELETE';

      return utils
        .saveDocs([
          {
            _id: 'allowed_del',
            type: 'clinic',
            parent: { _id: 'fixture:offline' },
            name: 'allowed',
          },
          {
            _id: 'denied_del',
            type: 'clinic',
            parent: { _id: 'fixture:online' },
            name: 'denied',
          },
        ])
        .then(results => Promise.all([
          utils.requestOnTestDb(Object.assign({ path: `/allowed_del?rev=${results[0].rev}` }, offlineRequestOptions)),
          utils.requestOnTestDb(Object.assign({ path: `/denied_del?rev=${results[1].rev}` }, offlineRequestOptions))
            .catch(err => err),
        ]))
        .then(results => {
          chai.expect(results[0]).to.deep.include({ id: 'allowed_del', ok: true });
          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});

          return Promise.all([
            utils.getDoc('allowed_del').catch(err => err),
            utils.getDoc('denied_del'),
          ]);
        })
        .then(results => {
          chai.expect(results[0]).to.deep.include({
            statusCode: 404, responseBody: { error: 'not_found', reason: 'deleted' }
          });
          chai.expect(results[1]).to.deep.include({
            _id: 'denied_del',
            type: 'clinic',
            parent: { _id: 'fixture:online' },
            name: 'denied',
          });
        });
    });

    it('GET attachment', () => {
      const revs = {
        allowed_attach: [],
        denied_attach: [],
      };
      offlineRequestOptions.json = false;

      return utils
        .saveDocs([
          {
            _id: 'allowed_attach',
            type: 'clinic',
            parent: { _id: 'fixture:offline' },
            name: 'allowed attach',
          },
          {
            _id: 'denied_attach',
            type: 'clinic',
            parent: { _id: 'fixture:online' },
            name: 'denied attach',
          },
        ])
        .then(results => Promise.all(
          results.map(result => {
            revs[result.id].push(result.rev);
            return utils.requestOnTestDb({
              path: `/${result.id}/att_name?rev=${result.rev}`,
              method: 'PUT',
              body: 'my attachment content',
              headers: { 'Content-Type': 'text/plain' },
              json: false,
            });
          })
        ))
        .then(results => {
          results.forEach(result => revs[result.id].push(result.rev));
          return Promise.all([
            utils
              .requestOnTestDb(Object.assign({ path: '/allowed_attach/att_name', json: false }, offlineRequestOptions)),
            utils
              .requestOnTestDb(Object.assign({ path: '/denied_attach/att_name' }, offlineRequestOptions))
              .catch(err => err),
            utils
              .requestOnTestDb(
                Object.assign({ path: `/denied_attach/att_name?rev=${results[1].rev}` }, offlineRequestOptions)
              )
              .catch(err => err),
          ]);
        })
        .then(results => {
          chai.expect(results[0]).to.equal('my attachment content');
          chai.expect(results[1]).to.deep.include(
            { statusCode: 404, responseBody: { error: 'bad_request', reason: 'Invalid rev format' }}
          );
          chai.expect(results[2]).to.deep.include(
            { statusCode: 403, responseBody: { error: 'forbidden', reason: 'Insufficient privileges' }}
          );

          return Promise.all([
            utils.getDoc('allowed_attach'),
            utils.getDoc('denied_attach'),
          ]);
        })
        .then(results => {
          return utils.saveDocs([
            Object.assign(results[0], { parent: { _id: 'fixture:online' } }),
            Object.assign(results[1], { parent: { _id: 'fixture:offline' } }),
          ]);
        })
        .then(results => {
          results.forEach(result => revs[result.id].push(result.rev));

          const getRequestForIdRev = (id, rev) => utils
            .requestOnTestDb(Object.assign({ path: `/${id}/att_name?rev=${rev}` }, offlineRequestOptions))
            .catch(err => err);

          const promises = [];
          Object.keys(revs).forEach(id => promises.push(...revs[id].map(rev => getRequestForIdRev(id, rev))));
          return Promise.all(promises);
        })
        .then(results => {
          // allowed_attach is allowed, but missing attachment
          chai.expect(results[0].responseBody).to.deep.equal({
            error: 'not_found',
            reason: 'Document is missing attachment',
          });
          // allowed_attach is allowed and has attachment
          chai.expect(results[1]).to.equal('my attachment content');
          // allowed_attach is not allowed and has attachment
          chai.expect(results[2].responseBody.error).to.equal('forbidden');

          // denied_attach is not allowed, but missing attachment
          chai.expect(results[3].responseBody.error).to.equal('forbidden');
          // denied_attach is not allowed and has attachment
          chai.expect(results[4].responseBody.error).to.equal('forbidden');
          // denied_attach is allowed and has attachment
          chai.expect(results[5]).to.equal('my attachment content');

          //attachments for deleted docs
          return Promise.all([
            utils.deleteDoc('allowed_attach'),
            utils.deleteDoc('denied_attach'),
          ]);
        })
        .then(results => {
          return Promise.all([
            utils
              .requestOnTestDb(Object.assign({ path: '/allowed_attach/att_name' }, offlineRequestOptions))
              .catch(err => err),
            utils
              .requestOnTestDb(
                Object.assign({ path: `/allowed_attach/att_name?rev=${results[0].rev}` }, offlineRequestOptions)
              )
              .catch(err => err),
            utils
              .requestOnTestDb(Object.assign({ path: '/denied_attach/att_name' }, offlineRequestOptions))
              .catch(err => err),
            utils.requestOnTestDb(Object.assign(
              { path: `/denied_attach/att_name?rev=${results[1].rev}`, json: false },
              offlineRequestOptions
            )),
          ]);
        })
        .then(results => {
          chai.expect(results[0]).to.deep.nested.include({ statusCode: 404, 'responseBody.error': 'bad_request' });
          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[2]).to.deep.nested.include({ statusCode: 404, 'responseBody.error': 'bad_request' });
          chai.expect(results[3]).to.equal('my attachment content');
        });
    });

    it('GET attachment with name containing slashes', () => {
      const revs = {
        allowed_attach_1: [],
        denied_attach_1: [],
      };

      return utils
        .saveDocs([
          {
            _id: 'allowed_attach_1',
            type: 'clinic',
            parent: { _id: 'fixture:offline' },
            name: 'allowed attach',
          },
          {
            _id: 'denied_attach_1',
            type: 'clinic',
            parent: { _id: 'fixture:online' },
            name: 'denied attach',
          },
        ])
        .then(results => Promise.all(
          results.map(result => {
            revs[result.id].push(result.rev);
            return utils.requestOnTestDb({
              path: `/${result.id}/att_name/1/2/3/etc?rev=${result.rev}`,
              method: 'PUT',
              body: 'my attachment content',
              headers: { 'Content-Type': 'text/plain' },
              json: false,
            });
          })
        ))
        .then(results => {
          results.forEach(result => revs[result.id].push(result.rev));
          return Promise.all([
            utils.requestOnTestDb(Object.assign(
              { path: '/allowed_attach_1/att_name/1/2/3/etc', json: false },
              offlineRequestOptions
            )),
            utils.requestOnTestDb(Object.assign(
              { path: `/allowed_attach_1/att_name/1/2/3/etc?rev=${results[0].rev}`, json: false },
              offlineRequestOptions
            )),
            utils.requestOnTestDb(Object.assign(
              { path: '/denied_attach_1/att_name/1/2/3/etc' }, offlineRequestOptions
            )).catch(err => err),
            utils.requestOnTestDb(Object.assign(
              { path: `/denied_attach_1/att_name/1/2/3/etc?rev=${results[1].rev}`}, offlineRequestOptions
            )).catch(err => err),
          ]);
        })
        .then(results => {
          chai.expect(results[0]).to.equal('my attachment content');
          chai.expect(results[1]).to.equal('my attachment content');

          chai.expect(results[2]).to.deep.nested.include({ statusCode: 404, 'responseBody.error': 'bad_request' });
          chai.expect(results[3]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});

          return Promise.all([
            utils.getDoc('allowed_attach_1'),
            utils.getDoc('denied_attach_1'),
          ]);
        })
        .then(results => {
          return utils.saveDocs([
            Object.assign(results[0], { parent: { _id: 'fixture:online' } }),
            Object.assign(results[1], { parent: { _id: 'fixture:offline' } }),
          ]);
        })
        .then(results => {
          results.forEach(result => revs[result.id].push(result.rev));

          const promises = [];
          const attachmentRequest = (rev, id) => utils
            .requestOnTestDb(Object.assign(
              { path: `/${id}/att_name/1/2/3/etc?rev=${rev}`, json: false }, offlineRequestOptions
            ))
            .catch(err => err);
          Object.keys(revs).forEach(id => promises.push(...revs[id].map(rev => attachmentRequest(rev, id))));
          return Promise.all(promises);
        })
        .then(results => {
          // allowed_attach is allowed, but missing attachment
          chai.expect(results[0].responseBody).to.deep.equal({
            error: 'not_found',
            reason: 'Document is missing attachment',
          });
          // allowed_attach is allowed and has attachment
          chai.expect(results[1]).to.equal('my attachment content');
          // allowed_attach is not allowed and has attachment
          chai.expect(results[2].responseBody.error).to.equal('forbidden');
          // denied_attach is not allowed, but missing attachment
          chai.expect(results[3].responseBody.error).to.equal('forbidden');
          // denied_attach is not allowed and has attachment
          chai.expect(results[4].responseBody.error).to.equal('forbidden');
          // denied_attach is allowed and has attachment
          chai.expect(results[5]).to.equal('my attachment content');
        });
    });

    it('PUT attachment', () => {
      Object.assign(offlineRequestOptions, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: 'my new attachment content',
        json: false,
      });

      return utils
        .saveDocs([
          {
            _id: 'a_with_attachments',
            type: 'clinic',
            parent: { _id: 'fixture:offline' },
            name: 'allowed attach',
          },
          {
            _id: 'd_with_attachments',
            type: 'clinic',
            parent: { _id: 'fixture:online' },
            name: 'denied attach',
          },
        ])
        .then(results => Promise.all(
          results.map(result => utils
            .requestOnTestDb(Object.assign(
              { path: `/${result.id}/new_attachment?rev=${result.rev}` }, offlineRequestOptions
            ))
            .catch(err => err))
        ))
        .then(results => {
          chai.expect(results[0]).to.deep.include({ ok: true,  id: 'a_with_attachments' });
          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});

          return Promise.all([
            utils.requestOnTestDb({ path: '/a_with_attachments' }),
            utils.requestOnTestDb({ path: '/a_with_attachments/new_attachment', json: false }),
            utils.requestOnTestDb({ path: '/d_with_attachments' }),
            utils.requestOnTestDb({ path: '/d_with_attachments/new_attachment' }).catch(err => err),
          ]);
        })
        .then(results => {
          chai.expect(results[0]._attachments.new_attachment).to.be.ok;
          chai.expect(results[0]._id).to.equal('a_with_attachments');

          chai.expect(results[1]).to.equal('my new attachment content');

          chai.expect(results[2]._attachments).to.be.undefined;
          chai.expect(results[2]._id).to.equal('d_with_attachments');

          chai.expect(results[3].responseBody.error).to.equal('not_found');
        });
    });
  });

  describe('should restrict offline users when db name is not medic', () => {
    it('GET', () => {
      offlineRequestOptions.method = 'GET';

      return Promise.all([
        utils.requestOnMedicDb(_.defaults({ path: '/fixture:user:offline' }, offlineRequestOptions)),
        utils.requestOnMedicDb(_.defaults({ path: '/fixture:user:online' }, offlineRequestOptions)).catch(err => err),
      ]).then(results => {
        chai.expect(results[0]).to.deep.include({
          _id: 'fixture:user:offline',
          name: 'OfflineUser',
          type: 'person',
          parent: { _id: 'fixture:offline', parent: { _id: 'PARENT_PLACE' } },
        });
        chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
      });
    });

    it('PUT', () => {
      offlineRequestOptions.method = 'PUT';

      const docs = [
        {
          _id: 'a_put_1',
          type: 'clinic',
          parent: { _id: 'fixture:offline' },
          name: 'a1',
        },
        {
          _id: 'a_put_2',
          type: 'clinic',
          parent: { _id: 'fixture:offline' },
          name: 'a2',
        },
        {
          _id: 'd_put_1',
          type: 'clinic',
          parent: { _id: 'fixture:online' },
          name: 'd1',
        },
        {
          _id: 'd_put_2',
          type: 'clinic',
          parent: { _id: 'fixture:online' },
          name: 'd2',
        },
      ];

      return utils
        .saveDocsRevs(docs)
        .then(() => {
          const updates = [
            { _id: 'n_put_1', type: 'clinic', parent: { _id: 'fixture:offline' }, name: 'n1' }, // new allowed
            { _id: 'n_put_2', type: 'clinic', parent: { _id: 'fixture:online' }, name: 'n2' }, // new denied
            _.defaults({ name: 'a1 updated' }, docs[0]), // stored allowed, new allowed
            _.defaults({ name: 'a2 updated', parent: { _id: 'fixture:online' } }, docs[1]), // stored ok, new denied
            _.defaults({ name: 'd1 updated' }, docs[2]), // stored denied, new denied
            _.defaults({ name: 'd2 updated', parent: { _id: 'fixture:offline' } }, docs[3]), // stored denied, new ok
          ];

          return Promise.all(
            updates.map(doc => utils
              .requestOnTestDb(Object.assign({ path: `/${doc._id}`, body: doc }, offlineRequestOptions))
              .catch(err => err))
          );
        })
        .then(results => {
          chai.expect(results[0]).to.deep.include({ ok: true, id: 'n_put_1' });
          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[2]).to.deep.include({ ok: true, id: 'a_put_1' });
          chai.expect(results[3]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[4]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[5]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
        });
    });

    it('GET attachment', () => {
      return utils
        .saveDoc({ _id: 'with_attachments' })
        .then(result => utils.requestOnMedicDb({
          path: `/with_attachments/att_name?rev=${result.rev}`,
          method: 'PUT',
          body: 'my attachment content',
          headers: { 'Content-Type': 'text/plain' },
          json: false,
        }))
        .then(() => {
          onlineRequestOptions.path = '/with_attachments/att_name';
          onlineRequestOptions.json = false;
          return utils.requestOnMedicDb(onlineRequestOptions);
        })
        .then(result => {
          chai.expect(result).to.equal('my attachment content');
        });
    });

    it('PUT attachment', () => {
      return utils
        .saveDoc({ _id: 'with_attachments' })
        .then(result => {
          Object.assign(onlineRequestOptions, {
            path: `/with_attachments/new_attachment?rev=${result.rev}`,
            method: 'PUT',
            headers: { 'Content-Type': 'text/plain' },
            body: 'my new attachment content',
            json: false,
          });

          return utils.requestOnMedicDb(onlineRequestOptions);
        })
        .then(result => utils.requestOnMedicDb(
          { path: `/with_attachments/new_attachment?rev=${result.rev}`, json: false }
        ))
        .then(result => {
          chai.expect(result).to.equal('my new attachment content');
        });
    });
  });

  it('restricts calls with irregular urls which match couchdb endpoints', () => {
    const doc = {
      _id: 'denied_report',
      contact: { _id: 'fixture:online' },
      type: 'data_record',
      form: 'a',
    };

    return utils
      .saveDoc(doc)
      .then(() => Promise.all([
        utils.requestOnTestDb(_.defaults({ path: '/denied_report' }, offlineRequestOptions)).catch(err => err),
        utils.requestOnTestDb(_.defaults({ path: '///denied_report//' }, offlineRequestOptions)).catch(err => err),
        utils
          .request(_.defaults({ path: `//${constants.DB_NAME}//denied_report/dsada` }, offlineRequestOptions))
          .catch(err => err),
        utils.requestOnTestDb(_.defaults({ path: '/denied_report/something' }, offlineRequestOptions))
          .catch(err => err),
        utils.requestOnTestDb(_.defaults({ path: '///denied_report//something' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(_.defaults({ path: `//${constants.DB_NAME}//denied_report/something` }, offlineRequestOptions))
          .catch(err => err),
        utils.requestOnMedicDb(_.defaults({ path: '/denied_report' }, offlineRequestOptions)).catch(err => err),
        utils.requestOnMedicDb(_.defaults({ path: '///denied_report//' }, offlineRequestOptions)).catch(err => err),
        utils
          .request(_.defaults({ path: `//medic//denied_report/dsada` }, offlineRequestOptions))
          .catch(err => err),
        utils.requestOnMedicDb(_.defaults({ path: '/denied_report/something' }, offlineRequestOptions))
          .catch(err => err),
        utils.requestOnMedicDb(_.defaults({ path: '///denied_report//something' }, offlineRequestOptions))
          .catch(err => err),
        utils
          .request(_.defaults({ path: `//medic//denied_report/something` }, offlineRequestOptions))
          .catch(err => err),
      ]))
      .then(results => {
        chai.expect(results.every(result => result.statusCode === 403 || result.statusCode === 404)).to.equal(true);
      });
  });

  it('allows creation of feedback docs', () => {
    const doc = { _id: 'fb1', type: 'feedback', content: 'content' };

    Object.assign(offlineRequestOptions, {
      path: '/',
      method: 'POST',
      body: doc,
    });

    return utils
      .requestOnTestDb(offlineRequestOptions)
      .then(result => {
        chai.expect(result).excludingEvery('rev').to.deep.equal({ id: 'fb1', ok: true });
        return utils.getDoc('fb1');
      })
      .then(result => {
        chai.expect(result).to.deep.include(doc);
      });
  });

  it('does not allow updates of feedback docs', () => {
    const doc = { _id: 'fb1', type: 'feedback', content: 'content' };

    return utils
      .saveDoc(doc)
      .then(result => {
        doc._rev = result.rev;
        doc.content = 'new content';

        Object.assign(offlineRequestOptions, {
          method: 'PUT',
          path: '/fb1',
          body: doc,
        });
        return utils.requestOnTestDb(offlineRequestOptions).catch(err => err);
      })
      .then(result => {
        chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
        return utils.getDoc('fb1');
      })
      .then(result => {
        chai.expect(result._rev).to.equal(doc._rev);
        chai.expect(result.content).to.equal('content');
      });
  });

  describe('interactions with ddocs', () => {
    it('allows GETting _design/medic-client blocks all other ddoc GET requests', () => {
      return Promise
        .all([
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic-client' }, offlineRequestOptions)),
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic' }, offlineRequestOptions)).catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/_design/something' }, offlineRequestOptions)).catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic-admin' }, offlineRequestOptions)).catch(err => err)
        ])
        .then(results => {
          chai.expect(results[0]._id).to.equal('_design/medic-client');

          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[2]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[3]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
        });
    });

    it('blocks PUTting any ddoc', () => {
      const request = {
        method: 'PUT',
        body: { some: 'data' },
      };

      return Promise
        .all([
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic-client' }, request, offlineRequestOptions))
            .catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic' }, request, offlineRequestOptions))
            .catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/_design/something' }, request, offlineRequestOptions))
            .catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic-admin' }, request, offlineRequestOptions))
            .catch(err => err),
        ])
        .then(results => {
          chai.expect(results[0]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[1]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[2]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          chai.expect(results[3]).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
        });
    });

    it('blocks DELETEing any ddoc', () => {
      const request = {
        method: 'DELETE',
      };

      return Promise
        .all([
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic-client' }, request, offlineRequestOptions))
            .catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic' }, request, offlineRequestOptions))
            .catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/_design/something' }, request, offlineRequestOptions))
            .catch(err => err),
          utils.requestOnTestDb(_.defaults({ path: '/_design/medic-admin' }, request, offlineRequestOptions))
            .catch(err => err),
          utils.requestOnMedicDb(_.defaults({ path: '/_design/medic-client' }, request, offlineRequestOptions))
            .catch(err => err),
          utils.requestOnMedicDb(_.defaults({ path: '/_design/medic' }, request, offlineRequestOptions))
            .catch(err => err),
          utils.requestOnMedicDb(_.defaults({ path: '/_design/something' }, request, offlineRequestOptions))
            .catch(err => err),
          utils.requestOnMedicDb(_.defaults({ path: '/_design/medic-admin' }, request, offlineRequestOptions))
            .catch(err => err),
        ])
        .then(results => {
          results.forEach(result => {
            chai.expect(result).to.deep.nested.include({ statusCode: 403, 'responseBody.error': 'forbidden'});
          });
        });
    });
  });
});
