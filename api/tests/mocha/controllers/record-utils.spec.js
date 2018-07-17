const controller = require('../../../src/controllers/record-utils'),
      chai = require('chai'),
      definitions = require('../../form-definitions'),
      config = require('../../../src/config'),
      sinon = require('sinon');

describe('record-utils', () => {

  afterEach(() => {
    sinon.restore();
  });

  // This asserts that we don't rely on any Object properties because req.body doesn't extend Object
  it('create form handles weird pseudo object returned from req.body - #3770', done => {
    const body = Object.create(null);
    body.message = 'test';
    body.from = '+123';
    const doc = controller.createByForm(body);
    chai.expect(doc.from).to.equal(body.from);
    done();
  });

  it('create form returns error if form value is missing', done => {
    try {
      controller.createByForm({ message: 'test' });
    } catch(e) {
      chai.expect(e.publicMessage).to.equal('Missing required value: from');
      done();
    }
  });

  it('create json returns error if missing _meta property', done => {
    const body = { name: 'bob' };
    try {  
      controller.createRecordByJSON(body);
    } catch(e) {
      chai.expect(e.publicMessage).to.equal('Missing _meta property.');
      done();
    }
  });

  it('create form', done => {
    const actual = controller.createByForm({
      message: 'test',
      from: '+123',
      unwanted: ';-- DROP TABLE users'
    });
    chai.expect(actual.type).to.equal('data_record');
    chai.expect(actual.from).to.equal('+123');
    chai.expect(actual.errors.length).to.equal(1);
    chai.expect(actual.errors[0].code).to.equal('sys.facility_not_found');
    chai.expect(actual.sms_message.type).to.equal('sms_message');
    chai.expect(actual.sms_message.message).to.equal('test');
    chai.expect(actual.sms_message.form).to.equal('TEST');
    chai.expect(actual.sms_message.from).to.equal('+123');
    done();
  });

  it('create json', done => {
    sinon.stub(config, 'get').returns(definitions.forms);

    const actual = controller.createRecordByJSON({
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
    done();
  });

});
