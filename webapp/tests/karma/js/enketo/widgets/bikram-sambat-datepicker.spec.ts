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
});
