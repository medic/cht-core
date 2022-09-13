import jQuery from 'jquery';
import sinon from 'sinon';
import { expect } from 'chai';

describe('Enketo: Phone Widget', () => {
  const $ = jQuery;
  const inputName = '/some/input/name';
  let phoneWidget;
  let settingsService;
  const inputSelector = (name) => $('input[name="' + name + '"]');
  const proxySelector = (name) => inputSelector(name).prev();
  const buildHtml = (type = 'tel') => {
    const html = 
      '<div id="phone-widget-test"><label class="question non-select"> \
         <span lang="" class="question-label active">person.field.phone</span> \
         <span class="required">*</span> \
         <input type="' + type + '" name="' + inputName + '" data-type-xml="' + type + '" > \
         <span class="or-constraint-msg active" lang="" data-i18n="constraint.invalid">Value not allowed</span> \
         <span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span> \
      </label></div>';
    document.body.insertAdjacentHTML('afterbegin', html);
  };
  
  beforeEach(() => {
    settingsService = { get: sinon.stub().resolves({}) };
    // Fetch phone widget.
    phoneWidget = require('../../../../../src/js/enketo/widgets/phone-widget');
  });

  afterEach(() => {
    sinon.restore();
    $('#phone-widget-test').remove();
  });

  it('should be placed in DOM when widget is added', () => {
    buildHtml();
    const input = inputSelector(inputName);
    const proxyInput = proxySelector(inputName);

    new phoneWidget($(phoneWidget.selector)[0], {}, settingsService);

    // Check a proxy input field is added, and the real one is hidden.
    expect($('input').length).to.equal(2);
    expect(input.is(':visible')).to.equal(false);
    expect(proxyInput.length).to.equal(1);
    expect(proxyInput.is(':visible')).to.equal(true);
  });

  it('should format input when input value change', () => {
    buildHtml();
    new phoneWidget($(phoneWidget.selector)[0], {}, settingsService);
    const input = inputSelector(inputName);
    const proxyInput = proxySelector(inputName);

    proxyInput
      .val('+1 (650) 222-3333')
      .change();

    expect(proxyInput.length).to.equal(1);
    expect(input.length).to.equal(1);
    expect(input.val()).to.equal('+16502223333');
  });

  it('should still format if no settings are found', () => {
    buildHtml();
    new phoneWidget($(phoneWidget.selector)[0], {}, settingsService);
    const input = inputSelector(inputName);
    const proxyInput = proxySelector(inputName);

    proxyInput
      .val('+1 (650) 222-3333')
      .change();

    expect(input.val()).to.equal('+16502223333');
  });

  it('should not format invalid input', () => {
    buildHtml();
    new phoneWidget($(phoneWidget.selector)[0], {}, settingsService);
    const input = inputSelector(inputName);
    const proxyInput = proxySelector(inputName);
    const invalid = '+1 (650) 222-33333333';

    proxyInput
      .val(invalid)
      .change();

    expect(input.val()).to.equal(invalid);
  });

  it('should keep formatted input when value is valid', () => {
    buildHtml();
    new phoneWidget($(phoneWidget.selector)[0], {}, settingsService);
    const input = inputSelector(inputName);
    const proxyInput = proxySelector(inputName);
    const valid = '+16502223333';

    proxyInput
      .val(valid)
      .change();

    expect(input.val()).to.equal(valid);
  });

  it('should not modify non-phone fields', () => {
    buildHtml('other');
    expect($(phoneWidget.selector).length).to.equal(0);
  });
});
