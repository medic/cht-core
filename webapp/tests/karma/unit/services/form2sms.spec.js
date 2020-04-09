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
      $provide.value('$log', { debug: sinon.stub(), error: sinon.stub() });
      $provide.value('$q', Q);
      $provide.factory('DB', KarmaUtils.mockDB({ get: dbGet }));
      $provide.value('GetReportContent', GetReportContent);
      $provide.value('Settings', Promise.resolve({ gateway_number: '+1234567890' }));
    });
    inject(function(_Form2Sms_) {
      service = _Form2Sms_;
    });
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('#()', function() {
    it('should throw for a non-existent doc', () => {
      // given
      let NO_FORM;

      // when
      return service(NO_FORM)

        .then(smsContent => assert.fail(`Should have thrown, but instead returned ${smsContent}`))

        .catch(err => assert.notEqual(err.name, 'AssertionError'));
    });

    it('should throw for a non-existent form', () => {
      // given
      const doc = aFormSubmission();
      // and there's no form
      dbGet.withArgs(TEST_FORM_ID).rejects(new Error('expected'));

      // when
      return service(doc)

        .then(smsContent => assert.fail(`Should have thrown, but instead returned ${smsContent}`))

        .catch(err => assert.equal(err.message, 'expected'));
    });

    it('should parse attached code for a form', () => {
      // given
      const doc = aFormSubmission();
      doc.fields = { a:1, b:2, c:3 };
      // and
      testFormExistsWithAttachedCode('spaced("T", doc.a, doc.b, doc.c)');

      // when
      return service(doc)

        .then(smsContent => assert.equal(smsContent, 'T 1 2 3'));
    });

    it('should fall back to ODK compact form specification if no custom code is provided but value is truthy', () => {
      // given
      const doc = aFormSubmission(`
        <test prefix="T" delimiter="#">
          <field_one tag="f1">une</field_one>
          <field_two tag="f2">deux</field_two>
          <ignored_field>rien</ignored_field>
        </test>
      `);
      // and
      testFormExistsWithAttachedCode(true);

      // when
      return service(doc)

        .then(smsContent => assert.equal(smsContent, 'T#f1#une#f2#deux'));
    });

    it('should do nothing if xml2sms field not provided', () => {
      const doc = aFormSubmission(`
        <test prefix="T" delimiter="#">
          <field_one tag="f1">une</field_one>
          <field_two tag="f2">deux</field_two>
          <ignored_field>rien</ignored_field>
        </test>
      `);

      testFormExists();
      return service(doc).then(smsContent => assert.isUndefined(smsContent));
    });

    it('should do nothing if xml2sms field is false', () => {
      const doc = aFormSubmission(`
        <test prefix="T" delimiter="#">
          <field_one tag="f1">une</field_one>
          <field_two tag="f2">deux</field_two>
          <ignored_field>rien</ignored_field>
        </test>
      `);

      testFormExistsWithAttachedCode(false);
      return service(doc).then(smsContent => assert.isUndefined(smsContent));
    });

    it('should return nothing if neither code nor ODK compact format are provided', () => {
      // given
      const doc = aFormSubmission('<test/>');
      // and
      testFormExistsWithAttachedCode(true);

      // when
      return service(doc)

        .then(smsContent => assert.isUndefined(smsContent));
    });
  });

  it('should allow nice encoding of danger signs', () => {
    // given
    const doc = aFormSubmission();
    doc.fields = {
      s_acc_danger_signs: {
        s_acc_danger_sign_seizure: 'no',
        s_acc_danger_sign_loss_consiousness: 'yes',
        s_acc_danger_sign_unable_drink: 'no',
        s_acc_danger_sign_confusion: 'yes',
        s_acc_danger_sign_vomit: 'no',
        s_acc_danger_sign_chest_indrawing: 'yes',
        s_acc_danger_sign_wheezing: 'no',
        s_acc_danger_sign_bleeding: 'yes',
        s_acc_danger_sign_lathargy: 'no',
        has_danger_sign: 'true',
      },
    };

    // and
    testFormExistsWithAttachedCode(`
        concat(
            "U5 ",
            match(doc.s_acc_danger_signs.has_danger_sign, "true:DANGER, false:NO_DANGER"),
            " ",
            match(doc.s_acc_danger_signs.s_acc_danger_sign_seizure, "yes:S"),
            match(doc.s_acc_danger_signs.s_acc_danger_sign_loss_consiousness, "yes:L"),
            match(doc.s_acc_danger_signs.s_acc_danger_sign_unable_drink, "yes:D"),
            match(doc.s_acc_danger_signs.s_acc_danger_sign_confusion, "yes:C"),
            match(doc.s_acc_danger_signs.s_acc_danger_sign_vomit, "yes:V"),
            match(doc.s_acc_danger_signs.s_acc_danger_sign_chest_indrawing, "yes:I"),
            match(doc.s_acc_danger_signs.s_acc_danger_sign_wheezing, "yes:W"),
            match(doc.s_acc_danger_signs.s_acc_danger_sign_bleeding, "yes:B"),
            match(doc.s_acc_danger_signs.s_acc_danger_sign_lathargy, "yes:Y")
        )
    `);

    // when
    return service(doc)

      .then(smsContent => assert.equal(smsContent, 'U5 DANGER LCIB'));
  });

  function testFormExists() {
    testFormExistsWithAttachedCode(undefined);
  }

  function testFormExistsWithAttachedCode(code) {
    dbGet.withArgs(TEST_FORM_ID).resolves({ xml2sms:code });
  }

  function aFormSubmission(xml) {
    GetReportContent.resolves(xml);
    return { _id:'abc-123', form:TEST_FORM_NAME };
  }
});
