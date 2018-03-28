const sinon = require('sinon').sandbox.create(),
    definitions = require('../../form-definitions'),
    config = require('../../../config'),
    recordUtils = require('../../../controllers/record-utils');

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

exports['public form has no facility not found error'] = test => {
  sinon.stub(config, 'get').returns(definitions.forms);
  const body = {
    from: '+9999999999',
    message: '1!YYYW!facility#foo',
    sent_timestamp: '1352399720000'
  };
  const doc = recordUtils.createByForm(body);
  test.equals(doc.fields.foo, 'foo'); // make sure form parsed correctly
  test.equals(doc.from, body.from);
  test.equals(doc.errors.length, 0);
  test.done();
};

exports['private form has facility not found error'] = test => {
  sinon.stub(config, 'get').returns(definitions.forms);
  const body = {
    from: '+9999999999',
    message: '1!YYYZ!one#two#20111010',
    sent_timestamp: '1352399720000'
  };
  const doc = recordUtils.createByForm(body);
  test.equals(doc.fields.two, 'two'); // make sure form parsed correctly
  test.equals(doc.from, body.from);
  test.equals(doc.errors.length, 1);
  test.done();
};
