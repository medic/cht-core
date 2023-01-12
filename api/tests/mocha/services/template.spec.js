const fs = require('fs');
const _ = require('lodash');

const { expect } = require('chai');
const sinon = require('sinon');

const template = require('../../../src/services/template');

describe('template', () => {
  beforeEach(() => {
    sinon.stub(fs.promises, 'readFile');
    sinon.stub(_, 'template');
  });
  afterEach(() => {
    sinon.restore();
    template.clear();
  });

  it('should read from path and return template function', async () => {
    fs.promises.readFile.resolves('the contents');
    _.template.returns('the template function');

    const result = await template.getTemplate('the path');
    expect(result).to.equal('the template function');
    expect(fs.promises.readFile.args).to.deep.equal([['the path', { encoding: 'utf-8' }]]);
    expect(_.template.args).to.deep.equal([['the contents']]);
  });

  it('should cache template by path', async () => {
    fs.promises.readFile.resolves('contents');
    _.template.returns('template function');

    const result = await template.getTemplate('a path');
    expect(result).to.equal('template function');
    expect(fs.promises.readFile.args).to.deep.equal([['a path', { encoding: 'utf-8' }]]);
    expect(_.template.args).to.deep.equal([['contents']]);

    expect(await template.getTemplate('a path')).to.equal('template function');
    expect(fs.promises.readFile.callCount).to.equal(1);
    expect(_.template.callCount).to.equal(1);

    expect(await template.getTemplate('a path')).to.equal('template function');
    expect(fs.promises.readFile.callCount).to.equal(1);
    expect(_.template.callCount).to.equal(1);

    fs.promises.readFile.resolves('other contents');
    _.template.returns('other template function');
    expect(await template.getTemplate('other path')).to.equal('other template function');
    expect(fs.promises.readFile.callCount).to.equal(2);
    expect(_.template.callCount).to.equal(2);

    expect(await template.getTemplate('other path')).to.equal('other template function');
    expect(fs.promises.readFile.callCount).to.equal(2);
    expect(_.template.callCount).to.equal(2);

    expect(await template.getTemplate('a path')).to.equal('template function');
    expect(fs.promises.readFile.callCount).to.equal(2);
    expect(_.template.callCount).to.equal(2);
  });
});
