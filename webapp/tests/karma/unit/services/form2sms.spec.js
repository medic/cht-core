describe('Form2Sms service', function() {
  'use strict';

  const TEST_FORM_NAME = 'form:test';
  const TEST_FORM_ID = `form:${TEST_FORM_NAME}`;

  /** @return a mock form ready for putting in #dbContent */
  let service;
  const dbGet = sinon.stub();
  const dbGetAttachment = sinon.stub();
//      $parse = sinon.stub();

  beforeEach(function() {
    module('inboxApp');

    module(function($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({
        get: dbGet,
        getAttachment: dbGetAttachment,
      }));
      $provide.value('$log', { error: sinon.stub() });
//      $provide.value('$parse', $parse);
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
      const doc = aSimpleFormSubmission();
      // and there's no form
      dbGet.withArgs(TEST_FORM_ID).returns(Promise.reject());

      // when
      return service(doc)

        .then(smsContent => assert.isUndefined(smsContent));

    });

    it('should parse attached code for a form', () => TODO());
    it('should fall back to ODK compact form specification if no custom code is provided', () => TODO());
    it('should return nothing if neither code nor ODK compact format are provided', () => TODO());
  });

  function aSimpleFormSubmission() {
    const id = 'abc-123';

    const doc = {
      _id: id,
      form: TEST_FORM_NAME,
    };

    const xml = '<test></test>';

    dbGet.withArgs(id).returns(doc);
    dbGetAttachment.withArgs(id, 'content').returns(xml);

    return doc;
  }

});

function TODO() {
}
