const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const checkMedicConfVersion = rewire('../../src/lib/check-medic-conf-dependency-version');
const RUNNING_VERSION = '3.1.2';

describe('check-medic-conf-dependency-version', () => { 
  let warn, fs; 
  
  beforeEach(() => {  
    warn = sinon.stub();
    fs = {
      exists: sinon.stub().returns(true),
      readJson: sinon.stub().returns({ dependencies: { 'medic-conf': '1.0.0' } }),
    };

    checkMedicConfVersion.__set__('warn', warn);
    checkMedicConfVersion.__set__('runningVersion', RUNNING_VERSION);
    checkMedicConfVersion.__set__('fs', fs);
  });

  const scenarios = [
    { version: '2.0.0', throw: true },
    { version: '3.0.0' },    
    { version: '3.1.1' },
    { version: '3.1.2' },
    { version: '3.1.3', throw: true },
    { version: '3.2.0', throw: true },
    { version: '3.3.0', throw: true },
    { version: '4.0.0', throw: true },
    { version: '4.1.0', throw: true },
    { version: '4.0.1', throw: true },
    { version: '5.0.0', throw: true },
    { desc: 'undefined', version: undefined, warn: true },
    { desc: 'empty', version: '', warn: true }
  ];

  for (const scenario of scenarios) {
    it(`${scenario.desc || scenario.version}`, () => {
      fs.readJson.returns({ dependencies: { 'medic-conf': scenario.version } });

      if (scenario.throw) {
        expect(() => checkMedicConfVersion()).to.throw();
      } else {
        const actual = checkMedicConfVersion();
        expect(actual).to.be.undefined;
      }
      expect(warn.called).to.eq(!!scenario.warn);
    });
  }

  it('project package.json path does not exist', () => {
    fs.exists.returns(false);
    const actual = checkMedicConfVersion();
    expect(actual).to.be.undefined;
    expect(warn.args[0][0]).to.include('No project package.json');
  });

  it('devDependencies', () => {
      fs.readJson.returns({devDependencies:   {'medic-conf': '3.1.2'}});
      const actual = checkMedicConfVersion();
      expect(actual).to.be.undefined;
      expect(warn.called).to.eq(false);
    });
});
