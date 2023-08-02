const utils = require('@utils');
const moment = require('moment');

const validLog = (line, before, after) => {
  const [date, action] = line.split(/\s/);
  expect(moment.utc(date, 'YYYY-MM-DDTHH:mm:ss.SSS', true).isValid()).to.equal(true);
  expect(moment.utc(date).isBetween(before, after)).to.be.true;
  expect(action).to.be.oneOf(['REQ:', 'RES:', 'DEBUG:', 'INFO:', 'ERROR:', 'WARN:']);
};

describe('logging', () => {
  it('logs should include formatted date in API and Sentinel', async () => {
    const before = moment.utc().subtract(5, 'second');

    const collectApiLogs = await utils.collectApiLogs(/.*/);
    const collectSentinelLogs = await utils.collectApiLogs(/.*/);
    await utils.delayPromise(1000); // log debug message for checking messages
    await utils.request('/dbinfo');
    await utils.updateSettings({ test: true }, 'sentinel');
    const apiLogs = (await collectApiLogs()).filter(log => log.length);
    const sentinelLogs = (await collectSentinelLogs()).filter(log => log.length);

    const after = moment.utc().subtract(5, 'second');

    expect(apiLogs.length).to.be.greaterThan(0);
    apiLogs.forEach(log => validLog(log, before, after));

    expect(sentinelLogs.length).to.be.greaterThan(0);
    sentinelLogs.forEach(log => validLog(log, before, after));
  });
});
