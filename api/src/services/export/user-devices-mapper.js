const db = require('../../db');

module.exports = async () => {
  const { rows } = await db.medicUsersMeta.allDocs({ include_docs: true });
  const telemetry = rows.filter(e => e.doc.type === 'telemetry').map(e => e.doc);
  const userByDeviceId = {};
  telemetry.forEach((entry) => {
    if (!entry.device && !entry.metadata) {
      return;
    }

    const user = entry.metadata.user;
    const date = `${entry.metadata.year}-${entry.metadata.month}-${entry.metadata.day}`;
    const deviceMetas = {
      user,
      deviceId: entry.metadata.deviceId,
      date,
      webview: /Chrome\/(\d+\.\d+)/.exec(entry.device.userAgent)?.[1],
      apk: entry.device.deviceInfo.app?.version,
      android: entry.device.deviceInfo.software?.androidVersion,
      cht: entry.metadata.versions.app,
      settings: entry.metadata.versions.settings,
    };
    if (
      !userByDeviceId[user] ||
      userByDeviceId[user].date < date
    ) {
      userByDeviceId[user] = deviceMetas;
    }
  });
  return Object.values(userByDeviceId);
};
