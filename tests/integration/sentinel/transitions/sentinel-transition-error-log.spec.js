const utils = require('@utils');
const { expect } = require('chai');

describe('Sentinel transition error log', async function() {

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
    const logs = await collectLogs();
    expect(logs).to.have.lengthOf(1);
  });
});

