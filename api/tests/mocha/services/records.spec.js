const service = require('../../../src/services/records');
const chai = require('chai');
const definitions = require('../../form-definitions');
const config = require('../../../src/config');
const sinon = require('sinon');

describe('records service', () => {

  afterEach(() => {
    sinon.restore();
  });

  // This asserts that we don't rely on any Object properties because req.body doesn't extend Object
  it('create form handles weird pseudo object returned from req.body - #3770', () => {
    const body = Object.create(null);
    body.message = 'test';
    body.from = '+123';
    const doc = service.createByForm(body);
    chai.expect(doc.from).to.equal(body.from);
  });

  it('create form returns error if form value is missing', done => {
    try {
      service.createByForm({ message: 'test' });
    } catch (e) {
      chai.expect(e.publicMessage).to.equal('Missing required value: from');
      done();
    }
  });

  it('create json returns error if missing _meta property', done => {
    const body = { name: 'bob' };
    try {
      service.createRecordByJSON(body);
    } catch (e) {
      chai.expect(e.publicMessage).to.equal('Missing _meta property.');
      done();
    }
  });

  it('create form', () => {
    const actual = service.createByForm({
      message: 'test',
      from: '+123',
      unwanted: ';-- DROP TABLE users'
    });
    chai.expect(actual.type).to.equal('data_record');
    chai.expect(actual.from).to.equal('+123');
    chai.expect(actual.errors.length).to.equal(0);
    chai.expect(actual.sms_message.type).to.equal('sms_message');
    chai.expect(actual.sms_message.message).to.equal('test');
    chai.expect(actual.sms_message.form).to.equal('TEST');
    chai.expect(actual.sms_message.from).to.equal('+123');
  });

  it('strips unicode whitespace from textforms submission - #7654', () => {
    sinon.stub(config, 'get').returns(definitions.forms);

    const formDefinition = 'YY\u200BYY'; // strip the invisible character to match form defn
    const facilityId = 'Faci\u200Clity'; // string value - do not strip
    const year = '19\u200C99'; // integer value - strip
    const month = '1\u200D2'; // enum value - strip to match
    const misoprostol = '1\uFEFF'; // boolean value with trailing invisible character

    const message = `${formDefinition} ${facilityId} ${year} ${month} ${misoprostol}`;
    const actual = service.createByForm({
      message,
      from: '+123'
    });
    chai.expect(actual.sms_message.message).to.equal(message); // the given string is unchanged
    chai.expect(actual.sms_message.form).to.equal('YYYY'); // correct form is found
    chai.expect(actual.fields.facility_id).to.equal(facilityId); // character not stripped from string
    chai.expect(actual.fields.year).to.equal(1999); // integers parse
    chai.expect(actual.fields.month).to.equal('December'); // list items are found
    chai.expect(actual.fields.misoprostol_administered).to.equal(true); // booleans parse
  });

  it('strips unicode whitespace from textforms submission patient_id and place_id fields - #7676', () => {
    sinon.stub(config, 'get').returns(definitions.forms);

    const formDefinition = 'YYYR';
    const patientId = '012\u200C34'; // patient_id should be stripped
    const bsYear = '2068';

    const message = `${formDefinition} ${patientId} ${bsYear}`;
    const actual = service.createByForm({
      message,
      from: '+123'
    });
    chai.expect(actual.sms_message.message).to.equal(message);
    chai.expect(actual.sms_message.form).to.equal('YYYR');
    chai.expect(actual.fields.patient_id).to.equal('01234'); // character stripped from patient_id
  });

  it('create json', () => {
    sinon.stub(config, 'get').returns(definitions.forms);

    const actual = service.createRecordByJSON({
      _meta: {
        form: 'YYYY',
        from: '+123',
        unwanted: ';-- DROP TABLE users'
      }
    });

    chai.expect(actual.type).to.equal('data_record');
    chai.expect(actual.from).to.equal('+123');
    chai.expect(actual.sms_message.form).to.equal('YYYY');
    chai.expect(actual.sms_message.from).to.equal('+123');
  });

});
