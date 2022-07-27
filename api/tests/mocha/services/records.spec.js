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
    } catch(e) {
      chai.expect(e.publicMessage).to.equal('Missing required value: from');
      done();
    }
  });

  it('create json returns error if missing _meta property', done => {
    const body = { name: 'bob' };
    try {
      service.createRecordByJSON(body);
    } catch(e) {
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
    // contains a zero width invisible unicode characters which should be stripped out
    const message = 'A\u200B B\u200C C\u200D';
    const actual = service.createByForm({
      message,
      from: '+123'
    });
    chai.expect(actual.sms_message.message).to.equal('A B C');
    chai.expect(actual.sms_message.form).to.equal('A');
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
