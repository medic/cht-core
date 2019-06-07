const sinon = require('sinon');
const chai = require('chai');
const migration = require('../../../src/migrations/convert-translations-messages-fix');
const firstMigration = require('../../../src/migrations/convert-translation-messages');

describe('convert-translation-messages-fix migration', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should rerun convert-translation-messages', () => {
    sinon.stub(firstMigration, 'run').resolves('whatever');
    return migration.run().then(result => {
      chai.expect(firstMigration.run.callCount).to.equal(1);
      chai.expect(result).to.equal('whatever');
    });
  });
});
