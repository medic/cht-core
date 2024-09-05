import { expect } from 'chai';
import sinon from 'sinon';
import fs from 'fs';
import semver from 'semver';
import { validateNodeVersion } from '../cht-deploy';

describe('validateNodeVersion', () => {
  beforeEach(() => {
    sinon.stub(fs, 'readFileSync');
    sinon.stub(semver, 'satisfies');
    sinon.stub(console, 'error');
    sinon.stub(process, 'exit');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should exit with code 1 if package.json cannot be read', () => {
    fs.readFileSync.throws(new Error('File not found'));

    validateNodeVersion();

    expect(console.error.calledWith('Error reading package.json:', 'File not found')).to.be.true;
    expect(process.exit.calledWith(1)).to.be.true;
  });

  it('should exit with code 1 if Node.js version does not satisfy the required version', () => {
    fs.readFileSync.returns(JSON.stringify({
      engines: {
        node: '>=12.0.0'
      }
    }));
    semver.satisfies.returns(false);

    validateNodeVersion();

    expect(console.error
      .calledWith(`Invalid Node.js version. Required: >=12.0.0. Current: ${process.version}`)).to.be.true;
    expect(process.exit.calledWith(1)).to.be.true;
  });

  it('should not exit if Node.js version satisfies the required version', () => {
    fs.readFileSync.returns(JSON.stringify({
      engines: {
        node: '>=12.0.0'
      }
    }));
    semver.satisfies.returns(true);

    validateNodeVersion();

    expect(console.error.called).to.be.false;
    expect(process.exit.called).to.be.false;
  });

  it('should not exit if no engines field is present in package.json', () => {
    fs.readFileSync.returns(JSON.stringify({}));

    validateNodeVersion();

    expect(console.error.called).to.be.false;
    expect(process.exit.called).to.be.false;
  });
});
