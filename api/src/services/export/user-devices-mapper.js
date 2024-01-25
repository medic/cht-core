const db = require('../../db');

module.exports = async () => {
  const { rows } = await db.medicUsersMeta.query('users-meta/device_by_user', { group: true });
  return rows.map(doc => {
    const user = doc.key;
    const date = doc.value.date;
    const deviceId = doc.value.device.deviceId;
    const webview = /Chrome\/(\d+\.\d+)/.exec(doc.value.device.userAgent)?.[1];
    const { apk, android, cht, settings } = doc.value.device.versions;
    return {
      user,
      deviceId,
      date,
      webview,
      apk,
      android,
      cht,
      settings,
    };
  });
};
