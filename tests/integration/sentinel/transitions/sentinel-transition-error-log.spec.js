const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const { setTimeout } = require('timers/promises');
const { expect } = require('chai');

describe('Sentinel transition error log', async function() {
  this.timeout(10 * 60 * 1000);
  after(async () => await utils.revertSettings(true));

  it('log error for unkown transition', async () => {
    const unknownTransitionPattern = /Unknown transition "something"/;
    const settings = {
      transitions: {
        something: true
      }
    };

    const collectLogs = await utils.collectSentinelLogs(unknownTransitionPattern);
    await utils.updateSettings(settings, 'sentinel');
    await sentinelUtils.getCurrentSeq();
    const logs = await collectLogs();
    expect(logs).to.have.lengthOf(1);
    await setTimeout(5 * 60 * 1000); // every 5 minutes
    expect(await collectLogs()).to.have.lengthOf(2);
  });
});

