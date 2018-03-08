const controller = require('../../../controllers/record-utils'),
      definitions = require('../../form-definitions'),
      config = require('../../../config'),
      sinon = require('sinon').sandbox.create();

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

// This asserts that we don't rely on any Object properties because req.body doesn't extend Object
exports['create form handles weird pseudo object returned from req.body - #3770'] = test => {
  const body = Object.create(null);
  body.message = 'test';
  body.from = '+123';
  const doc = controller.createByForm(body);
  test.equals(doc.from, body.from);
  test.done();
};

exports['create form returns error if form value is missing'] = test => {
  try {
    controller.createByForm({ message: 'test' });
    test.fail('Error should have been thrown');
  } catch(e) {
    test.equals(e.publicMessage, 'Missing required value: from');
  }
  test.done();
};

exports['create json returns error if missing _meta property'] = test => {
  const body = { name: 'bob' };
  try {  
    controller.createRecordByJSON(body);
    test.fail('Error should have been thrown');
  } catch(e) {
    test.equals(e.publicMessage, 'Missing _meta property.');
  }
  test.done();
};

exports['create form'] = test => {
  const actual = controller.createByForm({
    message: 'test',
    from: '+123',
    unwanted: ';-- DROP TABLE users'
  });
  test.equals(actual.type, 'data_record');
  test.equals(actual.from, '+123');
  test.equals(actual.errors.length, 1);
  test.equals(actual.errors[0].code, 'sys.facility_not_found');
  test.equals(actual.sms_message.type, 'sms_message');
  test.equals(actual.sms_message.message, 'test');
  test.equals(actual.sms_message.form, 'TEST');
  test.equals(actual.sms_message.from, '+123');
  test.done();
};

exports['create json'] = test => {
  sinon.stub(config, 'get').returns(definitions.forms);

  const actual = controller.createRecordByJSON({
    _meta: {
      form: 'YYYY',
      from: '+123',
      unwanted: ';-- DROP TABLE users'
    }
  });

  test.equals(actual.type, 'data_record');
  test.equals(actual.from, '+123');
  test.equals(actual.sms_message.form, 'YYYY');
  test.equals(actual.sms_message.from, '+123');
  test.done();
};
