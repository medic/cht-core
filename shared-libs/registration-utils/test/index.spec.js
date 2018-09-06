const sinon = require('sinon').sandbox.create(),
      expect = require('chai').expect;
const utils = require('../src/index');

describe('registrationUtils', () => {

  beforeEach(done => {
    sinon.restore();
    done();
  });

  describe('isValidRegistration', function() {
    var config = { registrations: {} };

    it('should return false when no doc', function() {
      expect(utils.isValidRegistration(false, config)).to.equal(false);
    });

    it('should return false when doc has errors', function() {
      var doc = {
        type: 'data_record',
        form: 'form',
        content_type: 'xml',
        errors: []
      };
      config.registrations = [{ form: 'form' }];
      expect(utils.isValidRegistration({ errors: [1] }, config)).to.equal(false);
      expect(utils.isValidRegistration(doc, config)).to.equal(true);
    });

    it('should return false when no config', function() {
      var doc = {
        type: 'data_record',
        form: 'form',
        content_type: 'xml',
        errors: []
      };

      expect(utils.isValidRegistration(doc, false)).to.equal(false);
      expect(utils.isValidRegistration(doc, {})).to.equal(false);
    });

    it('should return false when doc is invalid', function() {
      config.registrations = [{ form: 'form1' }, { form: 'form2' }];
      config.forms = { form2: {} };

      var invalidDoc1 = {
        type: 'data_record',
        content_type: 'xml',
        contact: true
      };
      expect(utils.isValidRegistration(invalidDoc1, config)).to.equal(false);

      var invalidDoc2 = {
        type: 'something',
        form: 'form1',
        contact: true
      };
      expect(utils.isValidRegistration(invalidDoc2, config)).to.equal(false);

      var invalidDoc3 = {
        type: 'data_record',
        form: 'form3',
        contact: true
      };
      expect(utils.isValidRegistration(invalidDoc3, config)).to.equal(false);

      var invalidDoc4 = {
        type: 'data_record',
        form: 'form3',
        contact: true
      };
      expect(utils.isValidRegistration(invalidDoc4, config)).to.equal(false);

      var invalidDoc5 = {
        type: 'data_record',
        form: 'form2',
      };
      expect(utils.isValidRegistration(invalidDoc5, config)).to.equal(false);
    });

    it('should return false when form does not have configured registrations', function() {
      config.registrations = [{ form: 'form1' }];
      var doc = {
        type: 'data_record',
        form: 'form',
        content_type: 'xml',
        errors: []
      };

      expect(utils.isValidRegistration(doc, config)).to.equal(false);
    });

    it('should return true for valid docs', function() {
      config.registrations = [{ form: 'form1' }, { form: 'form2' }, { form: 'form3' }];
      config.forms = { form2: {}, form3: { public_form: true } };

      var validDoc1 = {
        type: 'data_record',
        form: 'form1',
        content_type: 'xml',
      };
      expect(utils.isValidRegistration(validDoc1, config)).to.equal(true);

      var validDoc2 = {
        type: 'data_record',
        form: 'form2',
        contact: true
      };
      expect(utils.isValidRegistration(validDoc2, config)).to.equal(true);
      validDoc2.contact = false;
      expect(utils.isValidRegistration(validDoc2, config)).to.equal(false);

      var validDoc3 = {
        type: 'data_record',
        form: 'form3',
        contact: true
      };
      expect(utils.isValidRegistration(validDoc3, config)).to.equal(true);
      validDoc3.contact = false;
      expect(utils.isValidRegistration(validDoc3, config)).to.equal(true);
    });

  });

});
