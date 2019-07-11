const { promisify } = require('util');
const readFile = promisify(require('fs').readFile);
const { join } = require('path');
const chai = require('chai');
const sinon = require('sinon');
const service = require('../../../src/services/generate-xform');
const FILES = {
  xform: 'xform.xml',
  form: 'form.html',
  model: 'model.xml'
};

describe.only('generate-xform service', () => {

  const read = (dirname, filename) => {
    return readFile(join(__dirname, 'xforms', dirname, filename), 'utf8');
  };

  const setup = dirname => {
    const promises = Object.values(FILES).map(filename => read(dirname, filename));
    return Promise.all(promises).then(contents => {
      const results = {};
      Object.keys(FILES).forEach((prop, i) => {
        results[prop] = contents[i];
      });
      return results;
    });
  };

  const runTest = dirname => {
    return setup(dirname).then(given => {
      return service.generate(given.xform).then(actual => {
        chai.expect(actual.form).to.equal(given.form);
        chai.expect(actual.model).to.equal(given.model);
      });
    });
  };

  it('generates form and model', () => runTest('simple'));
  it('replaces multimedia src elements', () => runTest('multimedia'));

});
