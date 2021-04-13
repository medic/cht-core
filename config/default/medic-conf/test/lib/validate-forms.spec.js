const { assert, expect } = require('chai');
const rewire = require('rewire');
const sinon = require('sinon');

const log = require('../../src/lib/log');

const validateForms = rewire('../../src/lib/validate-forms');

const BASE_DIR = 'data/lib/upload-forms';
const FORMS_SUBDIR = '.';

describe('validate-forms', () => {

  afterEach(sinon.restore);

  it('should reject forms which do not have <meta><instanceID/></meta>', () => {
    const logInfo = sinon.stub(log, 'info');
    const logError = sinon.stub(log, 'error');
    const apiMock = {
      formsValidate: sinon.stub().resolves({ok:true})
    };
    return validateForms.__with__({api: apiMock})(async () => {
      try {
        await validateForms(`${BASE_DIR}/no-instance-id`, FORMS_SUBDIR);
        assert.fail('Expected Error to be thrown.');
      } catch (e) {
        assert.notInclude(e.message, 'One or more forms appears to have errors found by the API validation endpoint.');
        assert.include(e.message, 'One or more forms appears to be missing <meta><instanceID/></meta> node.');
        expect(logInfo.args[0][0]).to.equal('Validating form: example.xml…');
        expect(logError.callCount).to.equal(1);
      }
    });
  });

  it('should reject forms that the api validations reject', () => {
    const logInfo = sinon.stub(log, 'info');
    const logError = sinon.stub(log, 'error');
    const apiMock = {
      formsValidate: sinon.stub().rejects('The error')
    };
    return validateForms.__with__({api: apiMock})(async () => {
      try {
        await validateForms(`${BASE_DIR}/merge-properties`, FORMS_SUBDIR);
        assert.fail('Expected Error to be thrown.');
      } catch (e) {
        expect(apiMock.formsValidate.called).to.be.true;
        assert.include(e.message, 'One or more forms appears to have errors found by the API validation endpoint.');
        assert.notInclude(e.message, 'One or more forms appears to be missing <meta><instanceID/></meta> node.');
        expect(logInfo.args[0][0]).to.equal('Validating form: example.xml…');
        expect(logError.callCount).to.equal(1);
      }
    });
  });

  it('should execute all validations and fail with all the errors concatenated', () => {
    const logInfo = sinon.stub(log, 'info');
    const logError = sinon.stub(log, 'error');
    const apiMock = {
      formsValidate: sinon.stub().rejects('The error')
    };
    return validateForms.__with__({api: apiMock})(async () => {
      try {
        await validateForms(`${BASE_DIR}/good-and-bad-forms`, FORMS_SUBDIR);
        assert.fail('Expected Error to be thrown.');
      } catch (e) {
        assert.include(e.message, 'One or more forms appears to have errors found by the API validation endpoint.');
        assert.include(e.message, 'One or more forms appears to be missing <meta><instanceID/></meta> node.');
        expect(logInfo.args[0][0]).to.equal('Validating form: example-no-id.xml…');
        expect(logInfo.args[1][0]).to.equal('Validating form: example.xml…');
        expect(logError.callCount).to.equal(2);
      }
    });
  });

  it('should resolve OK if all validations pass', () => {
    const logInfo = sinon.stub(log, 'info');
    const apiMock = {
      formsValidate: sinon.stub().resolves({ok:true})
    };
    return validateForms.__with__({api: apiMock})(async () => {
      await validateForms(`${BASE_DIR}/merge-properties`, FORMS_SUBDIR);
      expect(logInfo.args[0][0]).to.equal('Validating form: example.xml…');
    });
  });
});
