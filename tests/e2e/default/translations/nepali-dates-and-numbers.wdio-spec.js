const path = require('path');
const bikramSambat = require('bikram-sambat');
const { devanagari } = require('eurodigit/src/to_non_euro');
const moment = require('moment');

const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const contactsPage = require('@page-objects/default/contacts/contacts.wdio.page');
const chtConfUtils = require('@utils/cht-conf');
const gatewayApiUtils = require('@utils/gateway-api');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('Bikram Sambat date display', () => {
  const NEPALI_LOCALE_CODE = 'ne';
  const FORM_ID_BS = 'B';
  const FORM_ID_BS_PARTS = 'C';
  const NINE_WEEKS_AGO = moment().subtract({ weeks: 9 }).startOf('day');
  const TEN_WEEKS_AGO = moment().subtract({ weeks: 10 }).startOf('day');

  const FORMS = {
    B: {
      meta: { code: FORM_ID_BS, label: 'LMP with BS Date' },
      fields: {
        name: { type: 'string', labels: { short: 'Name' } },
        lmp_date: { type: 'bsDate', labels: { short: 'LMP Date' } }
      }
    },
    C: {
      meta: { code: FORM_ID_BS_PARTS, label: 'LMP with BS date parts' },
      fields: {
        name: { type: 'string', labels: { short: 'Name' } },
        lmp_year: { type: 'bsYear' },
        lmp_month: { type: 'bsMonth' },
        lmp_day: { type: 'bsDay' },
        lmp_date: { type: 'bsAggreDate', labels: { short: 'LMP Date' } }
      }
    }
  };

  const REGISTRATIONS = [
    { form: FORM_ID_BS, events: [{ name: 'on_create', trigger: 'add_expected_date' }] },
    { form: FORM_ID_BS_PARTS, events: [{ name: 'on_create', trigger: 'add_expected_date' }] }
  ];

  const TRANSITIONS = { registration: true };

  const setLanguage = async (locale) => {
    const localeCookie = 'locale';
    const existentCookie = await browser.getCookies(localeCookie);
    if (existentCookie && existentCookie[0] && existentCookie[0].value === locale) {
      return;
    }
    await browser.setCookies({ name: localeCookie, value: locale });
    await browser.refresh();
  };

  const getReports = async () => {
    const options = {
      path: '/_design/medic-client/_view/reports_by_date',
      qs: { include_docs: true },
    };
    const response = await utils.requestOnMedicDb(options);
    return response.rows.map(row => row.doc);
  };

  const setExistentReportDates = async (dates) => {
    const reports = await getReports();
    dates.forEach((date, idx) => reports[idx].reported_date = moment(date).valueOf());
    return utils.saveDocs(reports);
  };

  const momentToBikParts = (mDate) => {
    return bikramSambat.toBik(moment(mDate).format('YYYY-MM-DD'));
  };

  const momentToBikYMD = (mDate) => {
    const bsDate = momentToBikParts(mDate);
    return `${bsDate.year}-${bsDate.month}-${bsDate.day}`;
  };

  before(async () => {
    await chtConfUtils.initializeConfigDir();
    const contactSummaryFile = path.join(__dirname, 'config', 'bikram-sambat-contact-template-config.js');

    const { contactSummary } = await chtConfUtils.compileNoolsConfig({ contactSummary: contactSummaryFile });
    await utils.updateSettings(
      { contact_summary: contactSummary, forms: FORMS, registrations: REGISTRATIONS, transitions: TRANSITIONS },
      { ignoreReload: true }
    );

    const formsPath = path.join(__dirname, 'forms');
    await chtConfUtils.compileAndUploadAppForms(formsPath);

    await loginPage.cookieLogin();
    await commonPage.tabsSelector.analyticsTab().waitForDisplayed();
  });

  after(async () => {
    await utils.revertDb([/^form:/], true);
    await utils.revertSettings(true);
  });

  it('enketo xpath extension function should display correct values when Nepali is not selected', async () => {
    await commonPage.goToReports();
    await commonPage.openFastActionReport('bikram-sambat-dates', false);

    const date1 = '2021-01-01';
    const dateBk1 = bikramSambat.toBik_text(date1);

    await commonEnketoPage.setDateValue('Date 1', date1);
    expect(await commonEnketoPage.getInputValue('to-bikram-sambat([date 1 path])')).to.equal(dateBk1);

    const date2 = '2021-02-02';
    const dateBk2 = bikramSambat.toBik_text(date2);

    await reportsPage.setBikDateInput('/bikram-sambat-dates/data/date2', bikramSambat.toBik(date2));
    expect(await commonEnketoPage.getInputValue('to-bikram-sambat([date 2 path])')).to.equal(dateBk2);

    await commonEnketoPage.validateSummaryReport([dateBk1, dateBk2]);

    await genericForm.submitForm();
  });

  it('enketo xpath extension function should display correct values when Nepali is selected', async () => {
    await setLanguage(NEPALI_LOCALE_CODE);

    await commonPage.goToReports();
    await commonPage.openFastActionReport('bikram-sambat-dates', false);

    const date1 = '2020-01-01';
    const dateBk1 = bikramSambat.toBik_text(date1);

    await reportsPage.setBikDateInput('/bikram-sambat-dates/data/date1', bikramSambat.toBik(date1));
    expect(await commonEnketoPage.getInputValue('to-bikram-sambat([date 1 path])')).to.equal(dateBk1);

    const date2 = '2021-02-02';
    const dateBk2 = bikramSambat.toBik_text(date2);

    await reportsPage.setBikDateInput('/bikram-sambat-dates/data/date2', bikramSambat.toBik(date2));
    expect(await commonEnketoPage.getInputValue('to-bikram-sambat([date 2 path])')).to.equal(dateBk2);

    await commonEnketoPage.validateSummaryReport([dateBk1, dateBk2]);

    await genericForm.submitForm();
  });

  it('should display report list dates converted to bikram sambat', async () => {
    await setLanguage(NEPALI_LOCALE_CODE);

    // we added 2 reports in the previous tests
    // because of how we display relative dates, results could be inconsistent if we left the reported dates unchanged
    // and cause the test to flake
    const date1 = '2015-08-01';
    const date2 = '2010-03-18';
    await setExistentReportDates([date1, date2]);

    await browser.refresh();
    await commonPage.goToReports();

    const reportDetails = await reportsPage.reportsListDetails();
    moment.locale(NEPALI_LOCALE_CODE);
    expect(reportDetails[0].reported_date).to.equal(moment(date1).fromNow(false));
    expect(reportDetails[1].reported_date).to.equal(moment(date2).fromNow(false));
  });

  it('should convert contact summary dates to bikram sambat when language is Nepali', async () => {
    await setLanguage(NEPALI_LOCALE_CODE);

    const date = '2010-01-01';
    const bkDateText = bikramSambat.toBik_text(date);
    const bkDate = bikramSambat.toBik(date);
    const { day: bkDay, month: bkMonth } = bikramSambat.toDev(bkDate.year, bkDate.month, bkDate.day);

    const contact = {
      _id: 'george_bush',
      name: 'George Bush',
      type: 'person',
      reported_date: moment(date).valueOf(),
      parent: { _id: 'hospital' },
      phone: '+40755456456',
      field: 'text 0123456789',
      another: 'other text 0123456789',
    };

    await utils.saveDoc(contact);
    await commonPage.goToPeople(contact._id);

    moment.locale(NEPALI_LOCALE_CODE);
    const years = moment().diff(date, 'years');
    const relativeDateSuffix = moment(date).fromNow(false);
    const relativeDateLocale = moment.localeData().relativeTime(devanagari(years), true, 'yy', false);
    const relativeDateLocaleSuffix = moment.localeData().pastFuture(years * -1, relativeDateLocale);

    const dateOfDeath = await contactsPage.getContactSummaryField('dateOfDeath');
    expect(dateOfDeath).to.not.be.undefined;
    // The text has &nbsp; which wdio translates in different ways -> Local: just spaces, CI: spaces and new line
    expect(dateOfDeath).to.match(
      new RegExp(`मृत्युको दिन((\\s){1,2})${relativeDateLocale}`)
    );

    expect(await contactsPage.getContactSummaryField('age')).to.equal(relativeDateLocale);
    expect(await contactsPage.getContactSummaryField('dayMonth')).to.equal(`${bkDay} ${bkMonth}`);
    expect(await contactsPage.getContactSummaryField('relativeDate')).to.equal(relativeDateSuffix);
    expect(await contactsPage.getContactSummaryField('relativeDay')).to.equal(relativeDateLocaleSuffix);
    expect(await contactsPage.getContactSummaryField('simpleDate')).to.equal(bkDateText);
    expect(await contactsPage.getContactSummaryField('simpleDateTime')).to.equal(
      `${bkDateText}, ${moment(date).format('LTS')}`
    );
    expect(await contactsPage.getContactSummaryField('fullDate')).to.equal(
      `${relativeDateSuffix}\n${bkDateText}, ${moment(date).format('LTS')}`
    );
    expect(await contactsPage.getContactSummaryField('phone')).to.equal('+४०७५५४५६४५६');
    expect(await contactsPage.getContactSummaryField('field')).to.equal('text ०१२३४५६७८९');
    expect(await contactsPage.getContactSummaryField('another')).to.equal('other text 0123456789');
  });

  it('SMS report shows bsDate type as date field correctly', async () => {
    await setLanguage(NEPALI_LOCALE_CODE);
    moment.locale(NEPALI_LOCALE_CODE);

    await gatewayApiUtils.api.postMessage({
      id: 'lmp-id-bs',
      from: '+9779876543210',
      content: `${FORM_ID_BS} Shrestha ${momentToBikYMD(TEN_WEEKS_AGO)}`
    });

    await commonPage.goToPeople();
    await commonPage.goToReports();
    const firstReport = await reportsPage.leftPanelSelectors.firstReport();
    await firstReport.click();

    const dateFormat = bikramSambat.toBik_text(TEN_WEEKS_AGO);
    const relativeFormat = moment(TEN_WEEKS_AGO.toDate()).fromNow();
    const lmpDateValue = await reportsPage.getReportDetailFieldValueByLabel('LMP Date');
    expect(lmpDateValue).to.equal(`${dateFormat} (${relativeFormat})`);
  });

  it('SMS report shows bsAggreDate type as date field correctly', async () => {
    await setLanguage(NEPALI_LOCALE_CODE);
    moment.locale(NEPALI_LOCALE_CODE);
    const lmpBSParts = momentToBikParts(NINE_WEEKS_AGO);

    await gatewayApiUtils.api.postMessage({
      id: 'lmp-id-bs-parts',
      from: '+9779876543210',
      content: `${FORM_ID_BS_PARTS} Shrestha ` +
        `${lmpBSParts.year} ${lmpBSParts.month} ${lmpBSParts.day}`
    });

    await commonPage.goToPeople();
    await commonPage.goToReports();
    const firstReport = await reportsPage.leftPanelSelectors.firstReport();
    await firstReport.click();

    const dateFormat = bikramSambat.toBik_text(NINE_WEEKS_AGO);
    const relativeFormat = moment(NINE_WEEKS_AGO.toDate()).fromNow();
    const lmpDateValue = await reportsPage.getReportDetailFieldValueByLabel('LMP Date');
    expect(lmpDateValue).to.equal(`${dateFormat} (${relativeFormat})`);
  });
});
