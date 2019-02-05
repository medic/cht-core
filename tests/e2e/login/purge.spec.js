const auth = require('../../auth')(),
      commonElements = require('../../page-objects/common/common.po.js'),
      reports = require('../../page-objects/reports/reports.po.js'),
      utils = require('../../utils'),
      loginPage = require('../../page-objects/login/login.po.js');

describe('Purging on login', () => {

  const restrictedUserName = 'e2e_restricted',
        restrictedPass = 'e2e_restricted',
        restrictedFacilityId = 'restriced-facility',
        restrictedContactId = 'restricted-contact',
        patientId = 'e2e-patient',
        goodFormId = 'good-form',
        badFormId = 'bad-form';

  // TODO: at some point if we're feeling masochistic we can re-do this as
  // actual admin app interactions + restricted user interactions (to create reports)
  const restrictedUser = {
    _id: `org.couchdb.user:${restrictedUserName}`,
    type: 'user',
    name: restrictedUserName,
    password: restrictedPass,
    facility_id: restrictedFacilityId,
    roles: [
      'district-manager',
      'kujua_user',
      'data_entry',
      'district_admin'
    ]
  };
  const initialDocs = [
    {
      _id: `org.couchdb.user:${restrictedUserName}`,
      language: 'en',
      known: true,
      type: 'user-settings',
      roles: [
        'district-manager',
        'kujua_user',
        'data_entry',
        'district_admin'
      ],
      facility_id: restrictedFacilityId,
      contact_id: restrictedContactId,
      name: restrictedUserName
    },
    {
      _id: restrictedFacilityId,
      parent: {
        _id: 'this-does-not-matter'
      },
      name: 'A CHW area',
      type: 'health_center',
      reported_date: Date.now(),
      contact: {
        _id: restrictedContactId,
        parent: {
          _id: restrictedFacilityId,
          parent: {
            _id: 'this-does-not-matter'
          }
        }
      }
    },
    {
      _id: restrictedContactId,
      name: 'CHW User',
      type: 'person',
      reported_date: Date.now(),
      parent: {
        _id: restrictedFacilityId,
        parent: {
          _id: 'this-does-not-matter'
        }
      }
    },
    {
      _id: patientId,
      name: 'A patient',
      reported_date: Date.now(),
      type: 'person',
      parent: {
        _id: restrictedFacilityId,
        parent: {
          _id: 'this-does-not-matter'
        }
      }
    }
  ];
  const initialReports = [
    {
      _id: goodFormId,
      form: 'a-good-form-type',
      type: 'data_record',
      content_type: 'xml',
      reported_date: Date.now(),
      contact: {
        _id: restrictedContactId,
        parent: {
          _id: restrictedFacilityId,
          parent: {
            _id: 'this-does-not-matter'
          }
        }
      },
      fields: {
        patient_id: patientId,
        patient_name: 'A patient',
        some: 'data',
      }
    },
    {
      _id: badFormId,
      form: 'a-bad-form-type',
      type: 'data_record',
      content_type: 'xml',
      reported_date: Date.now(),
      contact: {
        _id: restrictedContactId,
        parent: {
          _id: restrictedFacilityId,
          parent: {
            _id: 'this-does-not-matter'
          }
        }
      },
      fields: {
        patient_id: patientId,
        patient_name: 'A patient',
        some: 'data',
      }
    }
  ];

  const purgeFn = (userCtx, contact, reports) => {
    if (!userCtx.roles.includes('data_entry')) {
      // wrong user type - don't purge
      return [];
    }
    if (contact.type !== 'person') {
      // report not about person - don't purge
      return [];
    }
    return reports.filter(r => r.form === 'a-bad-form-type').map(r => r._id);
  };

  beforeAll(done => {
    return Promise.all([
      utils.saveDocs(initialReports.concat(initialDocs)),
      utils.request({
        path: `/_users/org.couchdb.user:${restrictedUserName}`,
        method: 'PUT',
        body: JSON.stringify(restrictedUser)
      }),
      utils.updateSettings({purge: { fn: purgeFn.toString() }})
    ])
    .then(() => done()).catch(done.fail);
  });

  afterAll(done => {
    commonElements.goToLoginPage();
    loginPage.login(auth.user, auth.pass);
    return Promise.all([
      utils.request(`/_users/org.couchdb.user:${restrictedUserName}`)
      .then(doc => utils.request({
        path: `/_users/org.couchdb.user:${restrictedUserName}?rev=${doc._rev}`,
        method: 'DELETE'
      })),
      utils.revertDb()
    ])
    .then(() => done()).catch(done.fail);
  });

  beforeEach(utils.beforeEach);
  afterEach(utils.afterEach);

  it('Logging in as a restricted user with configured purge rules should perform a purge', () => {
    utils.resetBrowser();
    commonElements.goToLoginPage();
    loginPage.login(restrictedUserName, restrictedPass);
    commonElements.calm();
    commonElements.goToReports();
    browser.wait(() => element(by.css('#reports-list li:first-child')).isPresent(), 10000, 'There should be at least one report in the LHS');
    reports.expectReportsToExist([goodFormId]);
    reports.expectReportsToNotExist([badFormId]);
  });

});
