import jQuery from 'jquery';
import sinon from 'sinon';
import { expect } from 'chai';
import { FormModel } from 'enketo-core';
import phoneNumber from '@medic/phone-number';
const PhoneWidget = require('../../../../../src/js/enketo/widgets/phone-widget');

describe('Enketo: Phone Widget', () => {
  const $ = jQuery;
  const inputName = '/some/input/name';
  const SETTINGS = { hello: 'world' };
  const DENORMALIZED_NUMBER = '+1 (650) 222-3333';
  const NORMALIZED_NUMBER = '+16502223333';

  let phoneNumberValidate;
  let phoneNumberNormalize;
  let settingsService;
  let dbQuery;
  let dbService;
  let originalCHTCore;

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

  const buildContactFormHtml = (id) => {
    const formHtml = `<div id="contact-form" data-editing="${id}"></div>`;
    document.body.insertAdjacentHTML('afterbegin', formHtml);
  };

  before(() => originalCHTCore = window.CHTCore);
  after(() => window.CHTCore = originalCHTCore);
  
  beforeEach(() => {
    phoneNumberValidate = sinon.stub(phoneNumber, 'validate');
    phoneNumberNormalize = sinon.stub(phoneNumber, 'normalize').returns(NORMALIZED_NUMBER);
    settingsService = { get: sinon.stub().resolves(SETTINGS) };
    dbQuery = sinon.stub().resolves({ rows: [] });
    dbService = { get: sinon.stub().returns({ query: dbQuery }) };
    window.CHTCore = {
      Settings: settingsService,
      DB: dbService
    };
  });

  afterEach(() => {
    sinon.restore();
    $('#phone-widget-test').remove();
    $('#contact-form').remove();
  });

  it('should be placed in DOM when widget is added', () => {
    buildHtml();
    const input = inputSelector(inputName);
    const proxyInput = proxySelector(inputName);

    new PhoneWidget($(PhoneWidget.selector)[0], {}, settingsService);

    // Check a proxy input field is added, and the real one is hidden.
    expect($('input').length).to.equal(2);
    expect(input.is(':visible')).to.equal(false);
    expect(proxyInput.length).to.equal(1);
    expect(proxyInput.is(':visible')).to.equal(true);
    expect(settingsService.get.calledOnceWithExactly()).to.be.true;
  });

  it('should format input when input value change', async () => {
    buildHtml();
    await new PhoneWidget($(PhoneWidget.selector)[0], {}, settingsService);
    const input = inputSelector(inputName);
    const proxyInput = proxySelector(inputName);

    proxyInput
      .val(DENORMALIZED_NUMBER)
      .change();

    expect(proxyInput.length).to.equal(1);
    expect(input.length).to.equal(1);
    expect(input.val()).to.equal(NORMALIZED_NUMBER);
    expect(settingsService.get.calledOnceWithExactly()).to.be.true;
    expect(phoneNumberNormalize.args).to.deep.equal([
      [{ }, DENORMALIZED_NUMBER],
      [SETTINGS, DENORMALIZED_NUMBER]
    ]);
  });

  it('should still format if no settings are found', () => {
    buildHtml();
    // Not awaiting the settings to be returned
    new PhoneWidget($(PhoneWidget.selector)[0], {}, settingsService);
    const input = inputSelector(inputName);
    const proxyInput = proxySelector(inputName);

    proxyInput
      .val(DENORMALIZED_NUMBER)
      .change();

    expect(input.val()).to.equal(NORMALIZED_NUMBER);
    expect(settingsService.get.calledOnceWithExactly()).to.be.true;
    expect(phoneNumberNormalize.calledOnceWithExactly({ }, DENORMALIZED_NUMBER)).to.be.true;
  });

  it('should not format invalid input', () => {
    phoneNumberNormalize.returns(false);
    buildHtml();
    new PhoneWidget($(PhoneWidget.selector)[0], {}, settingsService);
    const input = inputSelector(inputName);
    const proxyInput = proxySelector(inputName);

    proxyInput
      .val(DENORMALIZED_NUMBER)
      .change();

    expect(input.val()).to.equal(DENORMALIZED_NUMBER);
    expect(settingsService.get.calledOnceWithExactly()).to.be.true;
    expect(phoneNumberNormalize.calledOnceWithExactly({ }, DENORMALIZED_NUMBER)).to.be.true;
  });

  it('should keep formatted input when value is valid', () => {
    buildHtml();
    new PhoneWidget($(PhoneWidget.selector)[0], {}, settingsService);
    const input = inputSelector(inputName);
    const proxyInput = proxySelector(inputName);

    proxyInput
      .val(NORMALIZED_NUMBER)
      .change();

    expect(input.val()).to.equal(NORMALIZED_NUMBER);
    expect(settingsService.get.calledOnceWithExactly()).to.be.true;
    expect(phoneNumberNormalize.calledOnceWithExactly({ }, NORMALIZED_NUMBER)).to.be.true;
  });

  it('should not modify non-phone fields', () => {
    buildHtml('other');
    expect($(PhoneWidget.selector).length).to.equal(0);
  });

  describe('types.tel validate', () => {
    it('returns true for a valid phone number', async () => {
      phoneNumberValidate.returns(true);

      const result = await FormModel.prototype.types.tel.validate(DENORMALIZED_NUMBER);

      expect(result).to.be.true;
      expect(settingsService.get.calledOnceWithExactly()).to.be.true;
      expect(phoneNumberValidate.calledOnceWithExactly(SETTINGS, DENORMALIZED_NUMBER)).to.be.true;
      expect(phoneNumberNormalize.calledOnceWithExactly(SETTINGS, DENORMALIZED_NUMBER)).to.be.true;
      expect(dbService.get.calledOnceWithExactly()).to.be.true;
      expect(dbQuery.calledOnceWithExactly('medic-client/contacts_by_phone', { key: NORMALIZED_NUMBER })).to.be.true;
    });

    it('throws error for invalid phone number', async () => {
      phoneNumberValidate.returns(false);

      await expect(FormModel.prototype.types.tel.validate(DENORMALIZED_NUMBER)).to.be
        .rejectedWith(`invalid phone number: "${DENORMALIZED_NUMBER}"`);

      expect(settingsService.get.calledOnceWithExactly()).to.be.true;
      expect(phoneNumberValidate.calledOnceWithExactly(SETTINGS, DENORMALIZED_NUMBER)).to.be.true;
      expect(phoneNumberNormalize.notCalled).to.be.true;
      expect(dbService.get.notCalled).to.be.true;
      expect(dbQuery.notCalled).to.be.true;
    });

    it('throws error for duplicate phone number', async () => {
      buildContactFormHtml('my-contact-id');
      phoneNumberValidate.returns(true);
      dbQuery.resolves({ rows: [{ id: 'some-id' }] });

      await expect(FormModel.prototype.types.tel.validate(DENORMALIZED_NUMBER)).to.be
        .rejectedWith(`phone number not unique: "${DENORMALIZED_NUMBER}"`);

      expect(settingsService.get.calledOnceWithExactly()).to.be.true;
      expect(phoneNumberValidate.calledOnceWithExactly(SETTINGS, DENORMALIZED_NUMBER)).to.be.true;
      expect(phoneNumberNormalize.calledOnceWithExactly(SETTINGS, DENORMALIZED_NUMBER)).to.be.true;
      expect(dbService.get.calledOnceWithExactly()).to.be.true;
      expect(dbQuery.calledOnceWithExactly('medic-client/contacts_by_phone', { key: NORMALIZED_NUMBER })).to.be.true;
    });

    it('returns true for a duplicate phone number when it is for the contact being edited', async () => {
      const contactId = 'my-contact-id';
      buildContactFormHtml(contactId);
      phoneNumberValidate.returns(true);
      dbQuery.resolves({ rows: [{ id: contactId }] });

      const result = await FormModel.prototype.types.tel.validate(DENORMALIZED_NUMBER);

      expect(result).to.be.true;
      expect(settingsService.get.calledOnceWithExactly()).to.be.true;
      expect(phoneNumberValidate.calledOnceWithExactly(SETTINGS, DENORMALIZED_NUMBER)).to.be.true;
      expect(phoneNumberNormalize.calledOnceWithExactly(SETTINGS, DENORMALIZED_NUMBER)).to.be.true;
      expect(dbService.get.calledOnceWithExactly()).to.be.true;
      expect(dbQuery.calledOnceWithExactly('medic-client/contacts_by_phone', { key: NORMALIZED_NUMBER })).to.be.true;
    });
  });
});
