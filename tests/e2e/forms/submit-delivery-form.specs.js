const helper = require('../../helper'),
      deliveryReport = require('../../page-objects/forms/delivery-report.po.js'),
      common = require('../../page-objects/common/common.po.js'),
      utils = require('../../utils');

describe('Submit Delivery Report', () => {

  const contactId = '3b3d50d275280d2568cd36281d00348b';
  const docs = [
    {
      _id: 'c49385b3594af7025ef097114104ef48',
      reported_date: 1469578114543,
      notes: '',
      contact: {
        _id: contactId,
        name: 'Jack',
        date_of_birth: '',
        phone: '+64274444444',
        alternate_phone: '',
        notes: '',
        type: 'person',
        reported_date: 1478469976421
      },
      name: 'Number three district',
      external_id: '',
      type: 'district_hospital'
    },
    {
      _id: contactId,
      name: 'Jack',
      date_of_birth: '',
      phone: '+64274444444',
      alternate_phone: '',
      notes: '',
      type: 'person',
      reported_date: 1478469976421,
      parent: {
        _id: 'c49385b3594af7025ef097114104ef48',
        reported_date: 1469578114543,
        notes: '',
        contact: {
          _id: contactId,
          name: 'Jack',
          date_of_birth: '',
          phone: '+64274444444',
          alternate_phone: '',
          notes: '',
          type: 'person',
          reported_date: 1478469976421
        },
        name: 'Number three district',
        external_id: '',
        type: 'district_hospital'
      }
    }
  ];

  const noteToCHW = 'Good news, Jack! Jack () has delivered at the health facility. We will alert you when it is time to refer them for PNC. Please monitor them for danger signs. Thank you!';

  beforeAll(done => {
    protractor.promise.all(docs.map(utils.saveDoc))
      .then(() => deliveryReport.configureForm(contactId, done))
      .catch(done.fail);
  });

  afterEach(done =>{
    utils.resetBrowser();
    done();
  });

  afterAll(utils.afterEach);

  xit('open delivery form', () => {
    common.goToReports();
    browser.wait(() => {
      return element(by.css('.action-container .general-actions:not(.ng-hide) .fa-plus')).isPresent();
    }, 10000);

    browser.sleep(1000); // let the refresh work here - #3691

    // select form
    const addButton = element(by.css('.action-container .general-actions:not(.ng-hide) .fa-plus'));
    browser.wait(() => {
      return addButton.isPresent();
    }, 10000);
    helper.clickElement(addButton);
    element(by.css('.action-container .general-actions .dropup.open .dropdown-menu li:first-child a')).click();
    browser.wait(() => {
      return element(by.css('#report-form')).isPresent();
    }, 10000);

    //select name
    deliveryReport.selectPatientName('jack');
    deliveryReport.nextPage();
    helper.waitElementToBeVisible(element(by.css('[value="healthy"]')));

    //Delivery info
    deliveryReport.selectLiveBirthButton();
    deliveryReport.selectFacilityButton();
    deliveryReport.enterDeliveryDate('');
    deliveryReport.nextPage();
    expect(deliveryReport.getNoteToCHW()).toBe(noteToCHW);
    deliveryReport.nextPage();

    //summary page
    expect(deliveryReport.getOutcomeText()).toBe('Live Birth');
    expect(deliveryReport.getDeliveryLocationSummaryText())
      .toBe('Facility');
    expect(deliveryReport.getFollowUpMessage()).toBe(noteToCHW);
    //submit
    deliveryReport.submit();
    expect(element(by.css('div.details')).isPresent()).toBeTruthy();
  });
});
