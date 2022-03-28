const auth = require('../../auth')();
const commonElements = require('../../page-objects/common/common.po.js');
const reports = require('../../page-objects/reports/reports.po.js');
const utils = require('../../utils');
const helper = require('../../helper');
const loginPage = require('../../page-objects/login/login.po.js');
const sentinelUtils = require('../sentinel/utils');
const chai = require('chai');

/* global window */

describe('Purging on login', () => {

  const restrictedUserName = 'e2e_restricted';
  const restrictedPass = 'e2e_restricted';
  const restrictedFacilityId = 'restriced-facility';
  const restrictedContactId = 'restricted-contact';
  const patientId = 'e2e-patient';
  const goodFormId = 'good-form';
  const badFormId = 'bad-form';
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

  let originalTimeout;
  beforeAll(async () => {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
    await commonElements.goToMessagesNative();
    await utils.saveDocs(initialReports.concat(initialDocs));
    await utils.request({
      path: `/_users/org.couchdb.user:${restrictedUserName}`,
      method: 'PUT',
      body: restrictedUser
    });
    const seq = await sentinelUtils.getCurrentSeq();
    await utils.updateSettings({ purge: { fn: purgeFn.toString(), text_expression: 'every 1 seconds' } }, true);
    await restartSentinel();
    await sentinelUtils.waitForPurgeCompletion(seq);
  });

  afterAll(async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    await utils.revertDb([], 'api');
    await commonElements.goToLoginPageNative();
    await loginPage.loginNative(auth.username, auth.password);
    await utils.deleteUsers([restrictedUserName]);
    await sentinelUtils.deletePurgeDbs();
    await utils.resetBrowserNative();
  });

  beforeEach(utils.beforeEach);
  afterEach(utils.afterEach);

  const getPurgeLog = () => {
    return browser.executeAsyncScript((() => {
      const callback = arguments[arguments.length - 1];
      const db = window.CHTCore.DB.get();
      db.get('_local/purgelog')
        .then(doc => callback(doc))
        .catch(err => callback(err));
    }));
  };

  const restartSentinel = () => utils.stopSentinel().then(() => utils.startSentinel());

  it('Logging in as a restricted user with configured purge rules should not download purged docs', async () => {
    await utils.resetBrowser();
    await commonElements.goToLoginPageNative();
    await loginPage.loginNative(restrictedUserName, restrictedPass);
    await commonElements.calmNative();
    await commonElements.goToReportsNative();
    const goodFormReport = reports.reportByUUID(goodFormId);
    await helper.waitUntilReadyNative(goodFormReport);
    expect(await browser.isElementPresent(goodFormReport)).toBeTrue;
    expect(await browser.isElementPresent(reports.reportByUUID(badFormId))).toBeFalse;

    let result = await getPurgeLog();
    // purge ran but after initial replication, nothing to purge
    chai.expect(result._rev).to.equal('0-1');
    chai.expect(result.roles).to.equal(JSON.stringify(restrictedUser.roles.sort()));
    chai.expect(result.history.length).to.equal(1);
    chai.expect(result.count).to.equal(0);
    chai.expect(result.history[0]).to.deep.equal({
      count: 0,
      roles: result.roles,
      date: result.date
    });
    const purgeDate = result.date;

    await utils.resetBrowser();
    await commonElements.calmNative();
    await browser.waitForAngular();
    result = await getPurgeLog();

    // purge didn't run again on next refresh
    chai.expect(result._rev).to.equal('0-1');
    chai.expect(result.date).to.equal(purgeDate);
    await utils.saveDocs(subsequentReports);

    await commonElements.syncNative();
    await commonElements.goToReportsNative();
    expect(await browser.isElementPresent(reports.reportByUUID(goodFormId))).toBeTrue;
    expect(await browser.isElementPresent(reports.reportByUUID(goodFormId2))).toBeTrue;
    expect(await browser.isElementPresent(reports.reportByUUID(badFormId2))).toBeTrue;

    await browser.driver.setNetworkConditions({ offline: true, latency: 0, throughput: 0 });

    const purgeSettings = {
      fn: purgeFn.toString(),
      text_expression: 'every 1 seconds',
      run_every_days: '0'
    };
    await utils.revertSettings(true);
    const seq = await sentinelUtils.getCurrentSeq();
    await utils.updateSettings({ purge: purgeSettings }, true);
    await restartSentinel();
    await sentinelUtils.waitForPurgeCompletion(seq);
    // get new settings that say to purge on every boot!

    await browser.driver.setNetworkConditions({ latency: 0, throughput: 1000 * 1000 }, 'No throttling');
    await commonElements.syncNative();
    await utils.refreshToGetNewSettings();

    result = await getPurgeLog();
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
    await commonElements.goToReportsNative();

    expect(await browser.isElementPresent(reports.reportByUUID(goodFormId))).toBeTrue;
    expect(await browser.isElementPresent(reports.reportByUUID(goodFormId2))).toBeTrue;
    expect(await browser.isElementPresent(reports.reportByUUID(badFormId))).toBeFalse;
    expect(await browser.isElementPresent(reports.reportByUUID(badFormId2))).toBeFalse;
  });
});
