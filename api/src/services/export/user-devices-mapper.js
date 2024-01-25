const db = require('../../db');

module.exports = async () => {
  const userByDeviceId = {};
  const limit = 1000;
  let skip = 0;
  let response = await db.medicUsersMeta.allDocs({ include_docs: true, limit, skip });
  while (response.rows.length === limit) {
    response.rows
      .filter(e => e.doc.type === 'telemetry').map(e => e.doc)
      .forEach((entry) => {
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

    skip += limit;
    response = await db.medicUsersMeta.allDocs({ include_docs: true, limit, skip });
  }
  return Object.values(userByDeviceId);
};
