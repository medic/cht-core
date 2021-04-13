const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const convertForms = rewire('./../../src/lib/convert-forms');
const fs = require('./../../src/lib/sync-fs');

describe('convert-forms', () => {
  
  let mockXls2xform;
  let withMocks;
  beforeEach(() => {
    mockXls2xform = sinon.stub().resolves();
    withMocks = cb => convertForms.__with__({
      xls2xform: mockXls2xform,
      fixXml: sinon.stub(),
      getHiddenFields: sinon.stub(),
    })(cb);

    sinon.stub(fs, 'readdir').returns(['a.xml', 'b.xlsx', 'c.xlsx']);
    sinon.stub(fs, 'exists').returns(true);
    sinon.stub(fs, 'readJson').returns({});
  });
  afterEach(sinon.restore);

  describe('filtering', () => {
    it('convert one form', () => withMocks(async () => {
      await convertForms('./path', 'app');
      expect(mockXls2xform.callCount).to.eq(2);
      expect(mockXls2xform.args[0]).to.deep.eq(['./path/forms/app/b.xlsx', './path/forms/app/b.xml']);
    }));

    it('filter matches one form only', () => withMocks(async () => {
      await convertForms('./path', 'app', { forms: ['c'] });
      expect(mockXls2xform.callCount).to.eq(1);
    }));

    it('filter matches no forms', () => withMocks(async () => {
      await convertForms('./path', 'app', { forms: ['z'] });
      expect(mockXls2xform.callCount).to.eq(0);
    }));

    it('--debug does not filter', () => withMocks(async () => {
      await convertForms('./path', 'app', { forms: ['--debug'] });
      expect(mockXls2xform.callCount).to.eq(2);
    }));
  });
});
