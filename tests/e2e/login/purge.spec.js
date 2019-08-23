const auth = require('../../auth')(),
      commonElements = require('../../page-objects/common/common.po.js'),
      reports = require('../../page-objects/reports/reports.po.js'),
      utils = require('../../utils'),
      loginPage = require('../../page-objects/login/login.po.js');
const sentinelUtils = require('../sentinel/utils');
const chai = require('chai');
const helper = require('../../helper');

/* global window */

describe('Purging on login', () => {

  const restrictedUserName = 'e2e_restricted',
        restrictedPass = 'e2e_restricted',
        restrictedFacilityId = 'restriced-facility',
        restrictedContactId = 'restricted-contact',
        patientId = 'e2e-patient',
        goodFormId = 'good-form',
        badFormId = 'bad-form';
  const badFormId2 = 'bad-form2';
  const goodFormId2 = 'good-form2';

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

  const subsequentReports = [
    {
      _id: goodFormId2,
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
      _id: badFormId2,
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
    let seq;
    return utils
      .saveDocs(initialReports.concat(initialDocs))
      .then(() => utils.request({
        path: `/_users/org.couchdb.user:${restrictedUserName}`,
        method: 'PUT',
        body: JSON.stringify(restrictedUser)
      }))
      .then(() => sentinelUtils.getCurrentSeq())
      .then(result => seq = result)
      .then(() => utils.updateSettings({ purge: { fn: purgeFn.toString(), text_expression: 'every 1 seconds' }, reschedule: true }))
      .then(() => sentinelUtils.waitForPurgeCompletion(seq))
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
    .then(() => sentinelUtils.deletePurgeDbs())
    .then(() => done()).catch(done.fail);
  });

  beforeEach(utils.beforeEach);
  afterEach(utils.afterEach);

  const getPurgeLog = () => {
    return browser.executeAsyncScript((() => {
      let callback = arguments[arguments.length - 1];
      let db = window.PouchDB('medic-user-e2e_restricted');
      db.get('_local/purgelog').then(doc => callback(doc), err => callback(err));
    }));
  };

  it('Logging in as a restricted user with configured purge rules should not download purged docs', () => {
    utils.resetBrowser();
    commonElements.goToLoginPage();
    loginPage.login(restrictedUserName, restrictedPass);
    commonElements.calm();
    commonElements.goToReports();
    browser.wait(() => element(by.css('#reports-list li:first-child')).isPresent(), 10000, 'There should be at least one report in the LHS');
    reports.expectReportsToExist([goodFormId]);
    reports.expectReportsToNotExist([badFormId]);

    getPurgeLog().then(result => {
      // no purge log as we didn't purge
      chai.expect(result.status).to.equal(404);
      chai.expect(result.error).to.equal(true);
    });
    commonElements.sync();
    utils.resetBrowser();
    helper.waitForAngularComplete();

    let purgeDate;
    getPurgeLog().then(result => {
      // purge ran but there's nothing to purge
      chai.expect(result._rev).to.equal('0-1');
      chai.expect(result.roles).to.equal(JSON.stringify(restrictedUser.roles.sort()));
      chai.expect(result.history.length).to.equal(1);
      chai.expect(result.count).to.equal(0);
      chai.expect(result.history[0]).to.deep.equal({
        count: 0,
        roles: result.roles,
        date: result.date
      });
      purgeDate = result.date;
    });

    utils.resetBrowser();
    helper.waitForAngularComplete();

    getPurgeLog().then(result => {
      // purge didn't run again
      chai.expect(result._rev).to.equal('0-1');
      chai.expect(result.date).to.equal(purgeDate);
    });

    browser.wait(() => utils.saveDocs(subsequentReports).then(() => true));
    commonElements.sync();
    reports.expectReportsToExist([goodFormId, goodFormId2, badFormId2]);

    browser.wait(() => utils.revertSettings(true).then(() => true));
    commonElements.sync();
    utils.refreshToGetNewSettings();
    commonElements.calm();

    browser.wait(() => {
      let seq;
      const purgeSettings = {
        fn: purgeFn.toString(),
        text_expression: 'every 1 seconds',
        run_every_days: '0'
      };
      return sentinelUtils
        .getCurrentSeq()
        .then(result => seq = result)
        .then(() => utils.updateSettings({ purge: purgeSettings, reschedule: true }, true))
        .then(() => sentinelUtils.waitForPurgeCompletion(seq))
        .then(() => true);
    });

    // get new settings that say to purge on every boot!
    commonElements.sync();
    utils.refreshToGetNewSettings();
    commonElements.calm();

    utils.resetBrowser();
    helper.waitForAngularComplete();
    getPurgeLog().then(result => {
      // purge ran again and it purged the bad form
      chai.expect(result._rev).to.equal('0-2');
      chai.expect(result.roles).to.equal(JSON.stringify(restrictedUser.roles.sort()));
      chai.expect(result.history.length).to.equal(2);
      chai.expect(result.count).to.equal(1);
      chai.expect(result.history[1].date).to.equal(purgeDate);
      chai.expect(result.history[0]).to.deep.equal({
        count: 1,
        roles: result.roles,
        date: result.date
      });
    });
    reports.expectReportsToExist([goodFormId, goodFormId2]);
    reports.expectReportsToNotExist([badFormId, badFormId2]);
  });

});
