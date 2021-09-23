const path = require('path');
const bikramSambat = require('bikram-sambat');
const moment = require('moment');
const { expect } = require('chai');

const utils = require('../../utils');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const reportsPage = require('../../page-objects/reports/reports.wdio.page');
const contactsPage = require('../../page-objects/contacts/contacts.wdio.page');
const chtConfUtils = require('../../cht-conf-utils');

const NEPALI_LOCALE_CODE = 'ne';

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
  console.log(reports);
  dates.forEach((date, idx) => reports[idx].reported_date = moment(date).valueOf());
  return utils.saveDocs(reports);
};

describe('Bikram Sambat date display', () => {
  before(async () => {
    await chtConfUtils.initializeConfigDir();
    const contactSummaryFile = path.join(__dirname, 'bikram-sambat-config', 'contact-summary.templated.js');

    const { contactSummary } = await chtConfUtils.compileNoolsConfig({ contactSummary: contactSummaryFile });
    await utils.updateSettings({ contact_summary: contactSummary }, true);

    const formsPath = path.join(__dirname, 'bikram-sambat-config', 'forms');
    await chtConfUtils.compileAndUploadAppForms(formsPath);

    await loginPage.cookieLogin();
    await (await commonPage.analyticsTab()).waitForDisplayed();
  });

  after(async () => {
    await utils.revertDb([], true);
  });

  it('enketo xpath extension function should display correct values when Nepali is not selected', async () => {
    await commonPage.goToReports();
    await reportsPage.openForm('Bikram Sambat Date');

    const date1 = '2021-01-01';
    const dateBk1 = bikramSambat.toBik_text(date1);

    await reportsPage.setDateInput('/bikram-sambat-dates/data/date1', date1);
    expect(await reportsPage.getFieldValue('/bikram-sambat-dates/data/date1_text')).to.equal(dateBk1);
    expect(await reportsPage.getSummaryField('/bikram-sambat-dates/summary/field1')).to.equal(`date1 = ${dateBk1}`);

    const date2 = '2021-01-01';
    const dateBk2 = bikramSambat.toBik_text(date2);

    await reportsPage.setBikDateInput('/bikram-sambat-dates/data/date2', bikramSambat.toBik(date2));
    expect(await reportsPage.getFieldValue('/bikram-sambat-dates/data/date2_text')).to.equal(dateBk2);
    expect(await reportsPage.getSummaryField('/bikram-sambat-dates/summary/field2')).to.equal(`date2 = ${dateBk2}`);

    await reportsPage.submitForm();
  });

  it('enketo xpath extension function should display correct values when Nepali is selected', async () => {
    await setLanguage(NEPALI_LOCALE_CODE);

    await commonPage.goToReports();
    await reportsPage.openForm('Bikram Sambat Date');

    const date1 = '2020-01-01';
    const dateBk1 = bikramSambat.toBik_text(date1);

    await reportsPage.setBikDateInput('/bikram-sambat-dates/data/date1', bikramSambat.toBik(date1));
    expect(await reportsPage.getFieldValue('/bikram-sambat-dates/data/date1_text')).to.equal(dateBk1);
    expect(await reportsPage.getSummaryField('/bikram-sambat-dates/summary/field1')).to.equal(`date1 = ${dateBk1}`);

    const date2 = '2021-01-01';
    const dateBk2 = bikramSambat.toBik_text(date2);

    await reportsPage.setBikDateInput('/bikram-sambat-dates/data/date2', bikramSambat.toBik(date2));
    expect(await reportsPage.getFieldValue('/bikram-sambat-dates/data/date2_text')).to.equal(dateBk2);
    expect(await reportsPage.getSummaryField('/bikram-sambat-dates/summary/field2')).to.equal(`date2 = ${dateBk2}`);

    await reportsPage.submitForm();
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
    await commonPage.waitForLoaders();

    const reportDetails = await reportsPage.reportsListDetails();
    moment.locale(NEPALI_LOCALE_CODE);
    expect(reportDetails[0].reported_date).to.equal(moment(date1).fromNow(false));
    expect(reportDetails[1].reported_date).to.equal(moment(date2).fromNow(false));
  });

  it('should convert contact summary dates to bikram sambat when language is Nepali', async () => {
    await setLanguage(NEPALI_LOCALE_CODE);

    const date = '2010-01-01';
    const bkDate = bikramSambat.toBik_text(date);
    // todo change this when lib is updated
    const [ bkDay, bkMonth ] = bkDate.split(' ');

    const contact = {
      _id: 'george_bush',
      name: 'George Bush',
      type: 'person',
      reported_date: moment(date).valueOf(),
      parent: { _id: 'hospital' },
    };

    await utils.saveDoc(contact);
    await commonPage.goToPeople(contact._id);

    moment.locale(NEPALI_LOCALE_CODE);
    const years = moment().diff(date, 'years');
    const relativeDateSuffix = moment(date).fromNow(false);
    const relativeDateLocale = moment.localeData().relativeTime(moment().format(String(years)), true, 'yy', false);
    const relativeDateLocaleSuffix = moment.localeData().pastFuture(years * -1, relativeDateLocale);

    // space between prefix and the date is &nbsp;
    expect(await contactsPage.getContactSummaryField('dateOfDeath')).to.match(
      new RegExp(`contact\\.deceased\\.date\\.prefix[\\s\\h]${relativeDateLocale}`)
    );
    expect(await contactsPage.getContactSummaryField('age')).to.equal(relativeDateLocale);
    expect(await contactsPage.getContactSummaryField('dayMonth')).to.equal(`${bkDay} ${bkMonth}`);
    expect(await contactsPage.getContactSummaryField('relativeDate')).to.equal(relativeDateSuffix);
    expect(await contactsPage.getContactSummaryField('relativeDay')).to.equal(relativeDateLocaleSuffix);
    expect(await contactsPage.getContactSummaryField('simpleDate')).to.equal(bkDate);
    expect(await contactsPage.getContactSummaryField('simpleDateTime')).to.equal(
      `${bkDate}, ${moment(date).format('LTS')}`
    );
    expect(await contactsPage.getContactSummaryField('fullDate')).to.equal(
      `${relativeDateSuffix}\n${bkDate}, ${moment(date).format('LTS')}`
    );
  });
});
