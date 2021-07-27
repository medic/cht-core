const utils = require('../../../utils');
const sUtils = require('../../sentinel/utils');
const commonElements = require('../../../page-objects/common/common.wdio.page');
const auth= require('../../../auth')();
const { cookieLogin } = require('../../../page-objects/login/login.wdio.page');
const reportsPage = require('../../../page-objects/reports/reportsPage.wdio');
const userFactory = require('../../../factories/cht/users/users');

const personFactory = require('../../../factories/cht/contacts/person');
const place = require('../../../factories/cht/contacts/place');

const places = place.generateHierarchy();
const clinic = places.find((place) => place.type === 'health_center');
const PHONE = '+64271234567';
const person = personFactory.build(
  {
    parent: {
      _id: clinic._id,
      parent: clinic.parent
    },
    phone: PHONE
  });
const docs = [...places, person];


describe('generating short codes', () => {

  const submit = () => {
    return utils.request({
      method: 'POST',
      path: '/api/v2/records',
      headers: {
        'Content-type': 'application/json'
      },
      body: {
        _meta: {
          form: 'CASEID',
          from: PHONE
        }
      }
    });
  };

  describe('submits new sms messages', () => {
    beforeEach(async () => {

      await cookieLogin();
    });

    before(async () => {

      const settings = await utils.getSettings();
      settings.forms = {
        'CASEID': {
					 'meta': {
						 'code': 'CASEID', 'icon': 'icon-healthcare', 'translation_key': 'Case Id Form'
          },
          'fields': {},
          'use_sentinel': true
        }
      };

      settings.registrations =  {
        'form': 'CASEID', 'events': [ { 'name': 'on_create', 'trigger': 'add_case' } ]
      };

      await utils.updateSettings(settings,false, true);
      await utils.saveDocs(docs);
      await browser.pause(10000);
    });
    after(async () => await utils.revertDb([], true));

    const checkItemSummary = async () => {
      expect(await (await reportsPage.submitterName()).getText()).toMatch(`Submitted by ${person.name}`);
      expect(await(await reportsPage.subjectName()).getText()).toBe('Siobhan');
      expect(await(await reportsPage.submitterPhone()).getText()).toBe(person.phone);
      expect(await(await reportsPage.submitterPlace()).getText()).toBe(clinic.name);
    };

    it('shows content', async () => {
      await submit();
      await sUtils.waitForSentinel();
      await commonElements.goToReports();
      await browser.pause(20000);
      await (await reportsPage.firstReport()).click();
      await checkItemSummary();
    });
  });
});
