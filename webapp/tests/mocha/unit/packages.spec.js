const package = require('../../../package.json');
const { expect } = require('chai');

describe.only('test openrosa-xpath-evaluator version', () => {
  console.log('running only this test');
  it('matches ^1.5.1', () => {
    expect(package.dependencies['openrosa-xpath-evaluator']).to.equal('^1.5.1');
  });
});
