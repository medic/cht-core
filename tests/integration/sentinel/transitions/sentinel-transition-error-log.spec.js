const utils = require('@utils');

describe('Sentinel transition error log', function() {

  after(async () => await utils.revertSettings(true));

  it('log error for unknown transition', async () => {
    const unknownTransitionPattern = /Unknown transition "something"/;
    const settings = {
      transitions: {
        something: true
      }
    };

    const waitForLogs = await utils.waitForSentinelLogs(true, unknownTransitionPattern);
    await utils.updateSettings(settings, 'sentinel');
    await waitForLogs.promise;
  });
});

