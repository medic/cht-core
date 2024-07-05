import { expect } from 'chai';
import sinon from 'sinon';
import fs from 'fs';
import { validateArguments } from '../cht-deploy';

describe('validateArguments', () => {
  let processArgvBackup;

  beforeEach(() => {
    sinon.stub(console, 'error');
    sinon.stub(process, 'exit');
    processArgvBackup = process.argv;
  });

  afterEach(() => {
    sinon.restore();
    process.argv = processArgvBackup;
  });

  it('should exit with code 1 if no arguments are provided', () => {
    process.argv = ['node', 'cht-deploy'];

    validateArguments();

    expect(console.error
      .calledWith('No values file provided. Please specify a values file using -f <file>')).to.be.true;
    expect(process.exit.calledWith(1)).to.be.true;
  });

  it('should exit with code 1 if only one argument is provided', () => {
    process.argv = ['node', 'cht-deploy', '-f'];

    validateArguments();

    expect(console.error
      .calledWith('No values file provided. Please specify a values file using -f <file>')).to.be.true;
    expect(process.exit.calledWith(1)).to.be.true;
  });

  it('should exit with code 1 if the first argument is not -f', () => {
    process.argv = ['node', 'cht-deploy', '-x', 'values.yaml'];

    validateArguments();

    expect(console.error
      .calledWith('No values file provided. Please specify a values file using -f <file>')).to.be.true;
    expect(process.exit.calledWith(1)).to.be.true;
  });

  it('should exit with code 1 if the specified file does not exist', () => {
    sinon.stub(fs, 'accessSync').throws(new Error('File not found'));
    process.argv = ['node', 'cht-deploy', '-f', 'values.yaml'];

    validateArguments();

    expect(console.error.calledWith('File not found: values.yaml')).to.be.true;
    expect(process.exit.calledWith(1)).to.be.true;

    fs.accessSync.restore();
  });

  it('should return arguments if -f and a valid file are provided', () => {
    sinon.stub(fs, 'accessSync').returns(undefined);
    process.argv = ['node', 'cht-deploy', '-f', 'values.yaml'];

    const args = validateArguments();

    expect(args).to.deep.equal(['-f', 'values.yaml']);
    expect(console.error.called).to.be.false;
    expect(process.exit.called).to.be.false;

    fs.accessSync.restore();
  });
});
