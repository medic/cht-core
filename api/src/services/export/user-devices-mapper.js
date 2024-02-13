const bowser = require('bowser');

const logger = require('../../logger');
const db = require('../../db');

const getBrowser = (userAgent) => {
  try {
    return bowser.parse(userAgent).browser;
  } catch (error) {
    logger.error(`Error parsing user agent "${userAgent}": ${error.toString()}`);
    return null;
  }
};

module.exports = async () => {
  const { rows } = await db.medicUsersMeta.query('users-meta/device_by_user', { group: true });
  return rows.map(doc => {
    const user = doc.key;
    const date = doc.value.date;
    const deviceId = doc.value.device.deviceId;
    const browser = getBrowser(doc.value.device.userAgent);
    const { apk, android, cht, settings } = doc.value.device.versions;
    return {
      user,
      deviceId,
      date,
      browser: {
        name: browser?.name,
        version: browser?.version,
      },
      apk,
      android,
      cht,
      settings,
    };
  });
};
