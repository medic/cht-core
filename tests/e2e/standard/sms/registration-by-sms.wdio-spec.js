const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const gatewayApiUtils = require('@utils/gateway-api');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');

describe('Registration by SMS', () => {
  const district_hospital = placeFactory.generateHierarchy(['district_hospital']).get('district_hospital');
  const user = userFactory.build({ place: district_hospital._id });

  before(async () => {
    await utils.saveDocs([district_hospital]);
    await utils.createUsers([user]);
    await loginPage.cookieLogin();
  });

  it('Should create a new person via SMS and trigger the configured message schedule', async () => {
    const name = 'Filippo';
    const message = `N ${name}`;
    await gatewayApiUtils.api.postMessage({
      id: 'new-person-sms',
      from: user.phone,
      content: message
    });

    await commonPage.goToPeople(user.place);
    const allRHSPeople = await contactPage.getAllRHSPeopleNames();
    expect(allRHSPeople.length).to.equal(2);
    expect(allRHSPeople).to.include.members([name, user.contact.name]);

    await contactPage.selectLHSRowByText(name);
    await commonPage.waitForPageLoaded();
    const medicID = await contactPage.getContactMedicID();

    await commonPage.goToReports();
    const firstReport = await reportsPage.firstReport();
    const firstReportInfo = await reportsPage.getListReportInfo(firstReport);
    await reportsPage.openSelectedReport(firstReport);
    await commonPage.waitForPageLoaded();

    expect(firstReportInfo.heading).to.equal(name);
    expect(firstReportInfo.form).to.equal('New Person (SMS)');
    expect(firstReportInfo.lineage).to.equal(district_hospital.name);
    expect(await reportsPage.getRawReportContent()).to.equal(message);

    const automaticReply = await reportsPage.getAutomaticReply();
    expect(automaticReply.message).to.include(`Thank you ${user.contact.name} for registering ${name}.`);
    expect(automaticReply.recipient).to.include(user.phone);

    const taskDetails = await reportsPage.getTaskDetails(1, 1);
    const expectedMessage = `${user.contact.name}, did ${name} ${medicID} require care? To register pregnancy, send ` +
                                    `'P ${medicID} <Weeks since LMP>'. For PNC, send delivery report using ` +
                                    `'D ${medicID} <Delivery Code> <Days Since Delivery>'. Thank you!`;
    expect(await (await reportsPage.reportTasks()).isDisplayed()).to.be.true;
    expect(taskDetails.title).to.equal('Registration Followup');
    expect(taskDetails.message).to.equal(expectedMessage);
    expect(taskDetails.recipient).to.include(user.phone);
    expect(taskDetails.state).to.equal('scheduled');
  });

  it('should add phone number field when set', async () => {
    const settings = await utils.getSettings();
    await utils.updateSettings({
      registrations: [
        ...settings.registrations,
        {
          form: 'NP',
          events: [{
            name: 'on_create',
            trigger: 'add_patient',
            params: '',
            bool_expr: ''
          }],
          messages: [{
            recipient: 'reporting_unit',
            event_type: 'report_accepted',
            message: [{
              locale: 'en',
              content: 'Patient {{patient_name}} ({{patient_id}}) added to {{clinic.name}}'
            }],
          }],
        }
      ],
      forms: {
        ...settings.forms,
        NP: {
          meta: { code: 'NP' },
          fields: {
            phone_number: {
              labels: {
                tiny: { en: 'phone number' },
                description: { en: 'phone number' },
                short: { en: 'phone number' }
              },
              position: 0,
              flags: { allow_duplicate: false },
              type: 'phone_number',
              required: true
            },
            patient_name: {
              labels: {
                tiny: { en: 'patient_name' },
                description: { en: 'Patient name' },
                short: { en: 'Patient name' }
              },
              position: 1,
              type: 'string',
              length: [ 3, 30 ],
              required: true
            }
          },
          public_form: false,
        }
      }
    });

    const name = 'Mario';
    const phone = '+254702323235';
    const phoneFormatted = '0702 323233';
    const message = `NP ${phone} ${name}`;
    await gatewayApiUtils.api.postMessage({
      id: 'new-person-sms',
      from: user.phone,
      content: message
    });

    await commonPage.goToReports();
    const id = await reportsPage.getLastSubmittedReportId();
    await reportsPage.openReport(id);
    await browser.takeScreenshot();

    await commonPage.goToPeople(user.place);
    const allRHSPeople = await contactPage.getAllRHSPeopleNames();
    expect(allRHSPeople.length).to.equal(3);
    expect(allRHSPeople).to.include.members([name, user.contact.name]);

    await contactPage.selectLHSRowByText(name);
    await commonPage.waitForPageLoaded();
    const contactSummaryPhone = await contactPage.getPhone();
    const medicID = await contactPage.getContactMedicID();
    expect(contactSummaryPhone).to.equal(phoneFormatted);

    await commonPage.goToReports();
    const firstReport = await reportsPage.firstReport();
    await reportsPage.openSelectedReport(firstReport);

    const automaticReply = await reportsPage.getAutomaticReply();
    expect(automaticReply.message).to.include(`Thank you ${user.contact.name} for registering ${name}.`);
    expect(automaticReply.recipient).to.include(user.phone);

    const taskDetails = await reportsPage.getTaskDetails(1, 1);
    const expectedMessage = `${user.contact.name}, did ${name} ${medicID} require care? To register pregnancy, send ` +
                            `'P ${medicID} <Weeks since LMP>'. For PNC, send delivery report using ` +
                            `'D ${medicID} <Delivery Code> <Days Since Delivery>'. Thank you!`;
    expect(await (await reportsPage.reportTasks()).isDisplayed()).to.be.true;
    expect(taskDetails.title).to.equal('Registration Followup');
    expect(taskDetails.message).to.equal(expectedMessage);
    expect(taskDetails.recipient).to.include(user.phone);
    expect(taskDetails.state).to.equal('scheduled');
  });
});
