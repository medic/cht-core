describe('Form2Sms service', function() {
  'use strict';

  const TEST_FORM_NAME = 'form:test';
  const TEST_FORM_ID = `form:${TEST_FORM_NAME}`;

  /** @return a mock form ready for putting in #dbContent */
  let service;
  const dbGet = sinon.stub();
  const GetReportContent = sinon.stub();

  beforeEach(function() {
    module('inboxApp');

    module(function($provide) {
      $provide.value('$log', { debug:sinon.stub(), error:sinon.stub() });
      $provide.factory('DB', KarmaUtils.mockDB({ get:dbGet }));
      $provide.value('GetReportContent', GetReportContent);
      $provide.value('Settings', Promise.resolve({ gateway_number:'+1234567890' }));
    });
    inject(function(_Form2Sms_) {
      service = _Form2Sms_;
    });
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('#()', function() {
    it('should return nothing for a non-existent doc', () => {
      // given
      var NO_FORM;

      // when
      return service(NO_FORM)

        .then(smsContent => assert.isUndefined(smsContent));

    });

    it('should return nothing for a non-existent form', () => {
      // given
      const doc = aFormSubmission();
      // and there's no form
      dbGet.withArgs(TEST_FORM_ID).returns(Promise.reject());

      // when
      return service(doc)

        .then(smsContent => assert.isUndefined(smsContent));

    });

    it('should parse attached code for a form', () => {
      // given
      const doc = aFormSubmission();
      doc.fields = { a:1, b:2, c:3 };
      // and
      testFormExistsWithAttachedCode('spaced("T", text("a"), text("b"), text("c"))');

      // when
      return service(doc)

        .then(smsContent => assert.equal(smsContent, 'T 1 2 3'));
    });

    it('should fall back to ODK compact form specification if no custom code is provided', () => {
      // given
      const doc = aFormSubmission(`
        <test prefix="T" delimiter="#">
          <field_one tag="f1">une</field_one>
          <field_two tag="f2">deux</field_two>
          <ignored_field>rien</ignored_field>
        </test>
      `);
      // and
      testFormExists();

      // when
      return service(doc)

        .then(smsContent => assert.equal(smsContent, 'T#f1#une#f2#deux'));

    });

    it('should return nothing if neither code nor ODK compact format are provided', () => {
      // given
      const doc = aFormSubmission('<test/>');
      // and
      testFormExists();

      // when
      return service(doc)

        .then(smsContent => assert.isUndefined(smsContent));
    });
  });

  function testFormExists() {
    testFormExistsWithAttachedCode(undefined);
  }

  function testFormExistsWithAttachedCode(code) {
    dbGet.withArgs(TEST_FORM_ID).returns(Promise.resolve({ xml2sms:code }));
  }

  function aFormSubmission(xml) {
    const id = 'abc-123';

    GetReportContent.returns(Promise.resolve(xml));

    return { _id:id, form:TEST_FORM_NAME };
  }

});
