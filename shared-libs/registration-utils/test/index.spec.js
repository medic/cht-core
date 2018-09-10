const sinon = require('sinon').sandbox.create(),
      chai = require('chai'),
      utils = require('../src/index');

describe('registrationUtils', () => {

  afterEach(() => sinon.restore());

  describe('isValidRegistration', () => {
    const config = { registrations: {} };

    it('should return false when no doc', () => {
      chai.expect(utils.isValidRegistration(false, config)).to.equal(false);
    });

    it('should return false when doc has errors', () => {
      const doc = {
        type: 'data_record',
        form: 'form',
        content_type: 'xml',
        errors: []
      };
      config.registrations = [{ form: 'form' }];
      chai.expect(utils.isValidRegistration({ errors: [1] }, config)).to.equal(false);
      chai.expect(utils.isValidRegistration(doc, config)).to.equal(true);
    });

    it('should return false when no config', () => {
      const doc = {
        type: 'data_record',
        form: 'form',
        content_type: 'xml',
        errors: []
      };

      chai.expect(utils.isValidRegistration(doc, false)).to.equal(false);
      chai.expect(utils.isValidRegistration(doc, {})).to.equal(false);
    });

    it('should support invalid configurations', () => {
      config.registrations = [
        { some: 'thing' },
        undefined,
        false,
        { form: 22 },
        { form: ['a', 'b', 'c'] },
        1234,
        'medicMobile',
        [1, 2, 3, 4]
      ];

      const doc = {
        type: 'data_record',
        form: 'form',
        content_type: 'xml',
        errors: []
      };

      chai.expect(utils.isValidRegistration(doc, config)).to.equal(false);
    });

    it('should return false when doc is invalid', () => {
      config.registrations = [{ form: 'form1' }, { form: 'form2' }];
      config.forms = { form2: {}, form5: {} };

      let invalidDoc = {
        type: 'data_record',
        content_type: 'xml',
        contact: true
      };
      // no `form` field
      chai.expect(utils.isValidRegistration(invalidDoc, config)).to.equal(false);

      invalidDoc = {
        type: 'something',
        form: 'form1',
        contact: true
      };
      // missing non-xml form
      chai.expect(utils.isValidRegistration(invalidDoc, config)).to.equal(false);

      invalidDoc = {
        type: 'data_record',
        form: 'form5',
        contact: true
      };
      // no registration configuration
      chai.expect(utils.isValidRegistration(invalidDoc, config)).to.equal(false);

      invalidDoc = {
        type: 'data_record',
        form: 'form3',
        contact: true
      };
      // no registration configuration and form configuration
      chai.expect(utils.isValidRegistration(invalidDoc, config)).to.equal(false);

      invalidDoc = {
        type: 'data_record',
        form: 'form2',
      };
      // non-public configured sms form with unknown sender
      chai.expect(utils.isValidRegistration(invalidDoc, config)).to.equal(false);

      invalidDoc = {
        type: 'data_record',
        form: '!!!~~~~////',
      };
      // no alphanumeric sequence found in form field
      chai.expect(utils.isValidRegistration(invalidDoc, config)).to.equal(false);

      invalidDoc = {
        type: 'data_record',
        form: '!!!!something~~~~form2',
      };
      // invalid form field
      chai.expect(utils.isValidRegistration(invalidDoc, config)).to.equal(false);

      invalidDoc = {
        type: 'data_record',
        form: '!!form4~~something',
        content_type: 'xml'
      };
      // invalid form field
      chai.expect(utils.isValidRegistration(invalidDoc, config)).to.equal(false);
    });

    it('should return false when form does not have configured registrations', () => {
      config.registrations = [{ form: 'form1' }];
      const doc = {
        type: 'data_record',
        form: 'form',
        content_type: 'xml',
        errors: []
      };

      chai.expect(utils.isValidRegistration(doc, config)).to.equal(false);
    });

    it('should return true for valid docs', () => {
      config.registrations = [{ form: 'form1' }, { form: 'form2' }, { form: 'form3' }, { form: 'FORM4' }, { form: 'form5' }];
      config.forms = { form2: {}, form3: { public_form: true }, FORM5: { } };

      let validDoc = {
        type: 'data_record',
        form: 'form1',
        content_type: 'xml',
      };
      // configured XML form
      chai.expect(utils.isValidRegistration(validDoc, config)).to.equal(true);

      validDoc = {
        type: 'data_record',
        form: 'form2',
        contact: true
      };
      // configured SMS form, known sender
      chai.expect(utils.isValidRegistration(validDoc, config)).to.equal(true);
      validDoc.contact = false;
      // configured SMS form, unknown sender
      chai.expect(utils.isValidRegistration(validDoc, config)).to.equal(false);

      validDoc = {
        type: 'data_record',
        form: 'form3',
        contact: true
      };
      // configured public SMS form, known sender
      chai.expect(utils.isValidRegistration(validDoc, config)).to.equal(true);
      validDoc.contact = false;
      // configured public SMS form, unknown sender
      chai.expect(utils.isValidRegistration(validDoc, config)).to.equal(true);

      validDoc = {
        type: 'data_record',
        form: 'FORM5',
        contact: true
      };
      // configured SMS form, known sender, unmatched case
      chai.expect(utils.isValidRegistration(validDoc, config)).to.equal(true);

      validDoc = {
        type: 'data_record',
        form: 'form4',
        content_type: 'xml'
      };
      // configured XML form, unmatched case
      chai.expect(utils.isValidRegistration(validDoc, config)).to.equal(true);

      validDoc = {
        type: 'data_record',
        form: '!!form4~~',
        content_type: 'xml'
      };
      // configured XML form, unmatched case, junk characters
      chai.expect(utils.isValidRegistration(validDoc, config)).to.equal(true);
    });
  });

  describe('normalizeFormCode', () => {
    it('returns false for strings that do not match', () => {
      chai.expect(utils._normalizeFormCode('   ')).to.equal(null);
      chai.expect(utils._normalizeFormCode('!a!b!c!d')).to.equal(null);
      chai.expect(utils._normalizeFormCode('some time')).to.equal(null);
      chai.expect(utils._normalizeFormCode('_some!where-')).to.equal(null);
      chai.expect(utils._normalizeFormCode('____test____??1')).to.equal(null);
      chai.expect(utils._normalizeFormCode('$%^&alpha1_-)(&-^')).to.equal(null);
    });

    it('returns alpha+dash+underscore substring that matches, lowercased', () => {
      chai.expect(utils._normalizeFormCode('medic')).to.equal('medic');
      chai.expect(utils._normalizeFormCode('Medic-Mobile')).to.equal('medic-mobile');
      chai.expect(utils._normalizeFormCode('Medic_Mobile')).to.equal('medic_mobile');
      chai.expect(utils._normalizeFormCode('someform123')).to.equal('someform123');
      chai.expect(utils._normalizeFormCode('$%^&alpha1_-)(&^')).to.equal('alpha1_-');
    });
  });
});
