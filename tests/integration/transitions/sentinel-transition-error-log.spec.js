const utils = require('@utils');
const { assert } = require('chai');

describe('Sentinel Error Logs', async () => {
  
  it('logs an error if unknown transition, every 5 minutes', async () => {
    const settings = {
      transitions: {
        test_transition: true
      }
    };

    const collectLogs = await utils.collectSentinelLogs(/Unknown transition/);
    await utils.updateSettings(settings, 'sentinel', false);
    const logs = await collectLogs();
    assert.exists(await logs.find(log => log.match(/Unknown transition "test_transition"/)));
  });
});
