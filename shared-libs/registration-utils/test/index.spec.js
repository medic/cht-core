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

  describe('formCodeMatches', () => {

    const TESTS = [
      { conf: 'N', docForm: 'F joan', expected: false },
      { conf: 'medic', docForm: 'medic', expected: true },
      { conf: 'medic-mobile', docForm: 'Medic-Mobile', expected: true },
      { conf: 'medic_mobile', docForm: 'Medic_Mobile', expected: true },
      { conf: 'someform123', docForm: 'someform123', expected: true },
      { conf: 'alpha1_-', docForm: '$%^&alpha1_-)(&0^', expected: true },
      { conf: 'क', docForm: 'क', expected: true },
    ];

    TESTS.forEach(({ conf, docForm, expected }) => {
      it(`returns "${expected}" for conf="${conf}" and docForm="${docForm}"`, () => {
        chai.expect(utils._formCodeMatches(conf, docForm)).to.equal(expected);
      });
    });

  });

  describe('getSubjectIds', () => {
    it('should return correct values', () => {
      chai.expect(utils.getSubjectIds(false)).to.deep.equal([]);
      chai.expect(utils.getSubjectIds({})).to.deep.equal([]);
      chai.expect(utils.getSubjectIds({ _id: 'a' })).to.deep.equal(['a']);
      chai.expect(utils.getSubjectIds({ patient_id: 'b' })).to.deep.equal(['b']);
      chai.expect(utils.getSubjectIds({ place_id: 'c' })).to.deep.equal(['c']);
      chai.expect(utils.getSubjectIds({ _id: '' })).to.deep.equal([]);
      chai.expect(utils.getSubjectIds({ patient_id: false })).to.deep.equal([]);
      chai.expect(utils.getSubjectIds({ place_id: null })).to.deep.equal([]);
      chai.expect(utils.getSubjectIds({ _id: 'a', patient_id: 'b' })).to.deep.equal(['a', 'b']);
      chai.expect(utils.getSubjectIds({ _id: 'b', place_id: 'c' })).to.deep.equal(['b', 'c']);
      chai.expect(utils.getSubjectIds({ _id: 'd', place_id: 'f', foo: 'bar' })).to.deep.equal(['d', 'f']);
    });
  });

  describe('getPatientId', () => {
    it('should return correct values', () => {
      chai.expect(utils.getPatientId()).to.equal(undefined);
      chai.expect(utils.getPatientId(false)).to.equal(false);
      chai.expect(utils.getPatientId({})).to.equal(undefined);
      chai.expect(utils.getPatientId({ patient_id: 'a' })).to.equal('a');
      chai.expect(utils.getPatientId({ place_id: 'a' })).to.equal('a');
      chai.expect(utils.getPatientId({ patient_id: 'a', place_id: 'b' })).to.equal('a');
      chai.expect(utils.getPatientId({ patient_id: 'a', fields: {} })).to.equal('a');
      chai.expect(utils.getPatientId({ patient_id: 'a', fields: { patient_id: 'b' } })).to.equal('a');
      chai.expect(utils.getPatientId({ place_id: 'a', fields: { patient_id: 'b' } })).to.equal('a');
      chai.expect(utils.getPatientId({ place_id: 'a', fields: { place_id: 'b' } })).to.equal('a');
      chai.expect(utils.getPatientId({ fields: { place_id: 'b' } })).to.equal('b');
      chai.expect(utils.getPatientId({ fields: { patient_id: 'b' } })).to.equal('b');
      chai.expect(utils.getPatientId({ fields: { patient_uuid: 'b' } })).to.equal('b');
      chai.expect(utils.getPatientId({ fields: { patient_id: 'a', patient_uuid: 'b' } })).to.equal('a');
      chai.expect(utils.getPatientId({ fields: { place_id: 'a', patient_uuid: 'b' } })).to.equal('a');
    });
  });
});
