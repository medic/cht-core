const sinon = require('sinon');
const chai = require('chai');
const definitions = require('../../form-definitions');
const config = require('../../../src/config');
const records = require('../../../src/services/records');

describe('records-public-forms', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('public form does not have errors', () => {
    sinon.stub(config, 'get').returns(definitions.forms);
    const body = {
      from: '+9999999999',
      message: '1!YYYW!facility#foo',
      sent_timestamp: '1352399720000'
    };
    const doc = records.createByForm(body);
    chai.expect(doc.fields.foo).to.equal('foo'); // make sure form parsed correctly
    chai.expect(doc.from).to.equal(body.from);
    chai.expect(doc.errors.length).to.equal(0);
  });

  it('private form does not have errors', () => {
    sinon.stub(config, 'get').returns(definitions.forms);
    const body = {
      from: '+9999999999',
      message: '1!YYYZ!one#two#20111010',
      sent_timestamp: '1352399720000'
    };
    const doc = records.createByForm(body);
    chai.expect(doc.fields.two).to.equal('two'); // make sure form parsed correctly
    chai.expect(doc.from).to.equal(body.from);
    chai.expect(doc.errors.length).to.equal(0);
  });

});
