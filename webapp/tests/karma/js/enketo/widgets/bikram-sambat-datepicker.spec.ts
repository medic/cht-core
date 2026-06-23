import jQuery from 'jquery';
import sinon from 'sinon';
import { expect } from 'chai';

const BikramSambatDatepicker = require('../../../../../src/js/enketo/widgets/bikram-sambat-datepicker');

describe('Enketo: Bikram Sambat Datepicker Widget', () => {
  const $ = jQuery;
  let originalCHTCore;

  const buildHtml = () => {
    const html =
      `<div id="bikram-sambat-test">
        <label class="question non-select or-appearance-bikram-sambat">
          <span lang="" class="question-label active">Visit date</span>
          <input type="date" name="/data/visit_date" data-type-xml="date">
        </label>
      </div>`;
    document.body.insertAdjacentHTML('afterbegin', html);
  };

  const dayInput = () => $('.bikram-sambat-input-group input[name="day"]');
  const monthInput = () => $('.bikram-sambat-input-group input[name="month"]');
  const yearInput = () => $('.bikram-sambat-input-group input[name="year"]');
  const realDateInput = () => $('input[type="date"][name="/data/visit_date"]');

  before(() => originalCHTCore = window.CHTCore);
  after(() => window.CHTCore = originalCHTCore);

  beforeEach(() => {
    window.CHTCore = {
      Language: { get: sinon.stub().resolves('ne') }
    };
  });

  afterEach(() => {
    sinon.restore();
    $('#bikram-sambat-test').remove();
    $('.nepali-date-picker-overlay').remove();
    $('.nepali-date-picker').remove();
  });

  const initWidget = async () => {
    buildHtml();
    const widget = new BikramSambatDatepicker($(BikramSambatDatepicker.selector)[0]);
    // _init() resolves window.CHTCore.Language.get() asynchronously
    await new Promise(resolve => setTimeout(resolve, 0));
    return widget;
  };

  it('clears the date when day and year are entered but month is left unselected', async () => {
    await initWidget();

    dayInput().val('15').trigger('change');
    yearInput().val('2081').trigger('change');

    // Allow the guard's deferred re-check (setTimeout) to run
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(realDateInput().val()).to.equal('');
  });

  it('clears the date on blur when day and year are entered but month is left unselected', async () => {
    await initWidget();

    dayInput().val('15').trigger('change').trigger('blur');
    yearInput().val('2081').trigger('change').trigger('blur');

    // Allow the guard's deferred re-check (setTimeout) to run after
    // the library's own blur handler has fired
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(realDateInput().val()).to.equal('');
  });

  it('does not clear the date when day, month and year are all filled', async () => {
    await initWidget();

    dayInput().val('9').trigger('change');
    monthInput().val('4').trigger('change');
    yearInput().val('2081').trigger('change').trigger('blur');

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(realDateInput().val()).to.not.equal('');
  });

  it('does not run the guard for changes on the real date input itself', async () => {
    await initWidget();
    realDateInput().val('2024-07-24');

    realDateInput().trigger('change').trigger('blur');

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(realDateInput().val()).to.equal('2024-07-24');
  });

  it('initializes with a calendar button', async () => {
    await initWidget();
    expect($('.calendar-btn')).to.have.lengthOf(1);
  });

  it('opens calendar popup and backdrop when calendar button is clicked', async () => {
    await initWidget();
    $('.calendar-btn').click();

    expect($('.nepali-date-picker')).to.have.lengthOf(1);
    expect($('.nepali-date-picker-overlay')).to.have.lengthOf(1);
    expect($('.nepali-date-picker .close-btn')).to.have.lengthOf(1);
  });

  it('closes calendar popup and backdrop when close button is clicked', async () => {
    await initWidget();
    $('.calendar-btn').click();

    expect($('.nepali-date-picker')).to.have.lengthOf(1);
    $('.nepali-date-picker .close-btn').click();

    expect($('.nepali-date-picker').is(':visible')).to.be.false;
    expect($('.nepali-date-picker-overlay').is(':visible')).to.be.false;
  });

  it('closes calendar popup and backdrop when overlay is clicked', async () => {
    await initWidget();
    $('.calendar-btn').click();

    expect($('.nepali-date-picker-overlay').is(':visible')).to.be.true;
    $('.nepali-date-picker-overlay').click();

    expect($('.nepali-date-picker').is(':visible')).to.be.false;
    expect($('.nepali-date-picker-overlay').is(':visible')).to.be.false;
  });

  it('closes calendar popup and backdrop when Escape key is pressed', async () => {
    await initWidget();
    $('.calendar-btn').click();

    expect($('.nepali-date-picker').is(':visible')).to.be.true;
    
    // Simulate Escape key press
    const event = $.Event('keydown');
    event.keyCode = 27;
    $(document).trigger(event);

    expect($('.nepali-date-picker').is(':visible')).to.be.false;
    expect($('.nepali-date-picker-overlay').is(':visible')).to.be.false;
  });

  it('updates input fields when a date is selected from calendar', async () => {
    await initWidget();
    $('.calendar-btn').click();

    // Click on a date cell in the calendar table (e.g. the first active day)
    const activeDays = $('.nepali-date-picker table tbody td.current-month-date:not(.disable)');
    if (activeDays.length > 0) {
      $(activeDays[0]).click();
    }

    // Expect inputs to have been populated
    expect(dayInput().val()).to.not.equal('');
    expect(monthInput().val()).to.not.equal('');
    expect(yearInput().val()).to.not.equal('');
    expect(realDateInput().val()).to.not.equal('');
  });

  it('correctly updates fields and converts date when dateSelect event is triggered', async () => {
    await initWidget();
    const hiddenInput = $('.nepali-datepicker-input');
    const event: any = $.Event('dateSelect');
    event.datePickerData = {
      bsYear: 2081,
      bsMonth: 3,
      bsDate: 15
    };
    hiddenInput.trigger(event);

    expect(dayInput().val()).to.equal('१५');
    expect(monthInput().val()).to.equal('३');
    expect(yearInput().val()).to.equal('२०८१');
    expect(realDateInput().val()).to.equal('2024-06-29');
  });

  it('correctly parses Devanagari numbers in manual fields when opening calendar', async () => {
    await initWidget();
    
    dayInput().val('१५');
    monthInput().val('३');
    yearInput().val('२०८१');

    $('.calendar-btn').click();

    expect($('.nepali-datepicker-input').val()).to.equal('२०८१-३-१५');
  });
});
