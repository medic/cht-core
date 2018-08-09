const sinon = require('sinon'),
      chai = require('chai'),
      definitions = require('../../form-definitions'),
      config = require('../../../src/config'),
      recordUtils = require('../../../src/controllers/record-utils');

describe('record-utils-public-forms', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('public form has no facility not found error', () => {
    sinon.stub(config, 'get').returns(definitions.forms);
    const body = {
      from: '+9999999999',
      message: '1!YYYW!facility#foo',
      sent_timestamp: '1352399720000'
    };
    const doc = recordUtils.createByForm(body);
    chai.expect(doc.fields.foo).to.equal('foo'); // make sure form parsed correctly
    chai.expect(doc.from).to.equal(body.from);
    chai.expect(doc.errors.length).to.equal(0);
  });

  it('private form has facility not found error', () => {
    sinon.stub(config, 'get').returns(definitions.forms);
    const body = {
      from: '+9999999999',
      message: '1!YYYZ!one#two#20111010',
      sent_timestamp: '1352399720000'
    };
    const doc = recordUtils.createByForm(body);
    chai.expect(doc.fields.two).to.equal('two'); // make sure form parsed correctly
    chai.expect(doc.from).to.equal(body.from);
    chai.expect(doc.errors.length).to.equal(1);
  });

});
