const bowser = require('bowser');

const logger = require('@medic/logger');
const db = require('../../db');

const getBrowser = (userAgent) => {
  try {
    return bowser.parse(userAgent).browser;
  } catch (error) {
    logger.error(`Error parsing user agent "${JSON.stringify(userAgent)}": ${error.toString()}`);
    return null;
  }
};

module.exports = async () => {
  const { rows } = await db.medicUsersMeta.query('users-meta/device_by_user', { group: true });
  return rows.map(doc => {
    const [user, deviceId] = doc.key;
    const date = doc.value.date;
    const userAgent = doc.value.device.userAgent;
    const browser = userAgent && getBrowser(userAgent);
    const { apk, android, cht, settings } = doc.value.device.versions || {};
    const storage = (doc.value.device && doc.value.device.storage) || {};
    return {
      user,
      deviceId,
      date,
      browser: userAgent ? {
        name: browser?.name || undefined,
        version: browser?.version || undefined,
      } : {},
      apk,
      android,
      cht,
      settings,
      storageFree: storage.free,
      storageTotal: storage.total,
    };
  });
};
