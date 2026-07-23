import jQuery from 'jquery';
import sinon from 'sinon';
import { expect } from 'chai';

const BikramSambatDatepicker = require('../../../../../src/js/enketo/widgets/bikram-sambat-datepicker');

describe('Enketo: Bikram Sambat Datepicker Widget', () => {
  const $ = jQuery;
  let originalCHTCore;
  let widgetInstance;

  const buildHtml = (appearance = 'or-appearance-bikram-sambat') => {
    const html =
      `<div id="bikram-sambat-test">
        <label class="question non-select ${appearance}">
          <span lang="" class="question-label active">Visit date</span>
          <input type="date" name="/data/visit_date" data-type-xml="date">
        </label>
      </div>`;
    document.body.insertAdjacentHTML('afterbegin', html);
  };

  const buildHtmlMultiple = (count: number) => {
    let html = '<div id="bikram-sambat-test">';
    for (let i = 0; i < count; i++) {
      html += `
        <label class="question non-select or-appearance-bikram-sambat">
          <span lang="" class="question-label active">Visit date ${i}</span>
          <input type="date" name="/data/visit_date_${i}" data-type-xml="date">
        </label>`;
    }
    html += '</div>';
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
    if (widgetInstance) {
      widgetInstance.destroy(widgetInstance.element);
      widgetInstance = null;
    }
    $('#bikram-sambat-test').remove();
  });

  const initWidget = async (appearance?: string) => {
    buildHtml(appearance);
    widgetInstance = new BikramSambatDatepicker($(BikramSambatDatepicker.selector)[0]);
    // _init() resolves window.CHTCore.Language.get() asynchronously
    await new Promise(resolve => setTimeout(resolve, 0));
    return widgetInstance;
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

  it('removes body-appended picker nodes during global widget reset for multiple concurrent widgets', async () => {
    buildHtmlMultiple(3);
    const widgets: any[] = [];
    const elements = $(BikramSambatDatepicker.selector);
    for (let i = 0; i < elements.length; i++) {
      const widget = new BikramSambatDatepicker(elements[i]);
      widgets.push(widget);
    }
    await new Promise(resolve => setTimeout(resolve, 0));

    $('.calendar-btn').each(function() {
      $(this).click();
    });

    expect($('.nepali-date-picker')).to.have.lengthOf(3);
    
    BikramSambatDatepicker.globalReset();

    expect($('.nepali-date-picker')).to.have.lengthOf(0);
    expect($('.nepali-date-picker-overlay')).to.have.lengthOf(0);
    widgets.forEach(w => expect(w.$hiddenDateInput).to.be.null);
  });

  it('automatically cleans up pickers when widget DOM element is removed from body (repeat row removal)', async () => {
    const widget = await initWidget();
    $('.calendar-btn').click();

    expect($('.nepali-date-picker')).to.have.lengthOf(1);
    expect($('.nepali-date-picker-overlay')).to.have.lengthOf(1);

    $('#bikram-sambat-test').remove();

    await new Promise(resolve => setTimeout(resolve, 50));

    expect($('.nepali-date-picker')).to.have.lengthOf(0);
    expect($('.nepali-date-picker-overlay')).to.have.lengthOf(0);
    expect(widget.$hiddenDateInput).to.be.null;
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
    expect(activeDays.length).to.be.greaterThan(0);
    $(activeDays[0]).click();

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

  it('renders clear button and clears fields when clicked', async () => {
    await initWidget();
    $('.calendar-btn').click();

    expect($('.nepali-date-picker .clear-btn')).to.have.lengthOf(1);

    // Set initial values
    dayInput().val('१५');
    monthInput().val('३');
    yearInput().val('२०८१');
    realDateInput().val('2024-06-29');

    // Click clear button
    $('.nepali-date-picker .clear-btn').click();

    // Verify fields are empty
    expect(dayInput().val()).to.equal('');
    expect(monthInput().val()).to.equal('');
    expect(yearInput().val()).to.equal('');
    expect(realDateInput().val()).to.equal('');
    expect($('.nepali-date-picker').is(':visible')).to.be.false;
  });

  it('keeps calendar open after selecting a date', async () => {
    await initWidget();
    $('.calendar-btn').click();

    const activeDays = $('.nepali-date-picker table tbody td.current-month-date:not(.disable)');
    expect(activeDays.length).to.be.greaterThan(0);
    $(activeDays[0]).click();

    expect($('.nepali-date-picker').is(':visible')).to.be.true;
  });

  it('converts manual keyboard entry (day, month dropdown, year) to correct Gregorian value', async () => {
    await initWidget();

    dayInput().val('१५').trigger('change');
    $('.month-dropdown li a').eq(2).click();
    yearInput().val('२०८१').trigger('change').trigger('blur');

    // Allow the guard's deferred re-check (setTimeout) to run
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(realDateInput().val()).to.equal('2024-06-29'); // 2081-03-15 BS is 2024-06-29 AD
  });

  it('re-seeds/highlights the selected date when reopening the calendar picker', async () => {
    await initWidget();

    // Set initial date values
    dayInput().val('१५');
    monthInput().val('३');
    yearInput().val('२०८१');

    // Click calendar button to open the picker
    $('.calendar-btn').click();

    // The hidden input should be set to Devanagari formatted date
    expect($('.nepali-datepicker-input').val()).to.equal('२०८१-३-१५');
  });

  it('resets the picker value to empty when opening with invalid or partial manual fields', async () => {
    await initWidget();

    // Set partial fields (missing month)
    dayInput().val('१५');
    yearInput().val('२०८१');

    $('.calendar-btn').click();

    // The hidden input value should be empty since the date is incomplete
    expect($('.nepali-datepicker-input').val()).to.equal('');
  });

  it('resets the month placeholder to महिना and de-highlights selected day when clear is clicked', async () => {
    await initWidget();
    $('.calendar-btn').click();

    // Set values
    dayInput().val('१५');
    monthInput().val('३');
    yearInput().val('२०८१');
    $('.bikram-sambat-input-group .month-dropdown button').html('असार <span class="caret"></span>');

    // Click clear button
    $('.nepali-date-picker .clear-btn').click();

    // Verify month dropdown placeholder is reset to महिना
    expect($('.bikram-sambat-input-group .month-dropdown button').text().trim()).to.equal('महिना');
    
    // Verify calendar has no active day cell highlighted
    expect($('.nepali-date-picker table tbody td.active')).to.have.lengthOf(0);
  });

  it('does not render when a non-Nepali locale is active and appearance is not forced', async () => {
    // Override window.CHTCore.Language.get() to return English
    window.CHTCore.Language.get = sinon.stub().resolves('en');

    await initWidget('other-appearance');

    // The template should not have been appended (no day/month/year inputs)
    expect(dayInput()).to.have.lengthOf(0);
    expect($('.bikram-sambat-widget')).to.have.lengthOf(0);
  });

  it('handles manual entry of a divergent date (like Mansir 30, 2082) gracefully without throwing', async () => {
    await initWidget();

    let threwError = false;
    try {
      dayInput().val('३०').trigger('change');
      $('.month-dropdown li a').eq(7).click(); // Mansir (8th month)
      yearInput().val('२०८२').trigger('change').trigger('blur');

      await new Promise(resolve => setTimeout(resolve, 0));
    } catch (_e) {
      threwError = true;
    }

    expect(threwError).to.be.false;
    expect(realDateInput().val()).to.equal('');
  });

  it('falls back gracefully if $.fn.nepaliDatePicker plugin is not loaded', async () => {
    const originalPlugin = ($.fn as any).nepaliDatePicker;
    delete ($.fn as any).nepaliDatePicker;
    
    let errorThrown = false;
    try {
      await initWidget();
    } catch (_e) {
      errorThrown = true;
    }
    
    ($.fn as any).nepaliDatePicker = originalPlugin;
    expect(errorThrown).to.be.false;
  });
});
