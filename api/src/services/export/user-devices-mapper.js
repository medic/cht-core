const db = require('../../db');

module.exports = {
  map: async () => {
    return Promise.resolve()
      .then(() => {
        return {
          header: [
            'user',
            'deviceId',
            'date',
            'webview',
            'apk',
            'android',
            'cht',
            'settings',
          ],
          getRows: (doc) => {
            const user = doc.key;
            const date = doc.value.date;
            const deviceId = doc.value.device.deviceId;
            const webview = /Chrome\/(\d+\.\d+)/.exec(doc.value.device.userAgent)?.[1];
            const { apk, android, cht, settings } = doc.value.device.versions;

            return [[
              user,
              deviceId,
              date,
              webview,
              apk,
              android,
              cht,
              settings,
            ]];
          },
        };
      });
  },
  getDocIds: async (options) => {
    const result = await db.medicUsersMeta.query('users-meta/device_by_user', { ...options, group: true });
    return result.rows.map(row => row.key);
  },
  getDocs: async (ids) => {
    const result = await db.medicUsersMeta.query('users-meta/device_by_user', { keys: ids, group: true });
    return result.rows;
  },
};
