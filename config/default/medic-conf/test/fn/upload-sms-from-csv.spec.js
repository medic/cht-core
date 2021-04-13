const chai = require('chai');
chai.use(require('chai-exclude'));
const sinon = require('sinon');

const api = require('../api-stub');
const environment = require('../../src/lib/environment');
const fs = require('../../src/lib/sync-fs');
const csvToSms = require('../../src/fn/upload-sms-from-csv');

const { assert } = chai;

describe('upload-sms-from-csv', function() {
  beforeEach(api.start);
  afterEach(api.stop);

  it('should upload SMS supplied in CSV format to medic-api', function() {

    // given
    const testDir = 'data/upload-sms-from-csv';
    sinon.stub(environment, 'pathToProject').get(() => testDir);

    // when
    return csvToSms.execute()
      .then(() => {
        const expected = fs.readJson(`${testDir}/expected.json`);
        assert.deepEqualExcludingEvery(api.gatewayRequests, expected, ['id', 'sms_sent', 'sms_received']);
      });

  });
});
