const later = require('later');
const db = require('../db');

// set later to use local time
later.date.localTime();

// const CRON_EXPRESSION = '0 4 * * *'; // run at 4am every day
const CRON_EXPRESSION = '* * * * *'; // run every minute to debug
let timer;

module.exports = {
  execute: () => {
    if (!timer) {
      const schedule = later.parse.cron(CRON_EXPRESSION);
      timer = later.setInterval(() => module.exports.runCompute(), schedule);
    }
    return Promise.resolve();
  },
  runCompute: async () => {
    const telemetry = await db.medicUsersMeta.query('users-meta/telemetry', { include_docs: true });

    // used to see which user is still using an outdated browser/app
    const userByDeviceId = {};

    // used to get a bird's eye view of the deployment, how many devices have outdated software
    const versionsCounts = {
      android: {},
      app: {},
      webview: {},
    };

    telemetry.rows.forEach(({ doc: entry }) => {
      if (!entry.device && !entry.metadata) {
        return;
      }

      const webview = /Chrome\/(\d+\.\d+)/.exec(entry.device.userAgent)?.[1];
      const apk = entry.device.deviceInfo.app?.version;
      const android = entry.device.deviceInfo.software?.androidVersion;
      const cht = entry.metadata.versions.app;
      const settings = entry.metadata.versions.settings;

      if (android) {
        versionsCounts.android[android] = versionsCounts.android[android] ? versionsCounts.android[android] + 1 : 1;
      }
      if (apk) {
        versionsCounts.app[apk] = versionsCounts.app[apk] ? versionsCounts.app[apk] + 1 : 1;
      }
      if (webview) {
        versionsCounts.webview[webview] = versionsCounts.webview[webview] ? versionsCounts.webview[webview] + 1 : 1;
      }

      if (!userByDeviceId[entry.metadata.user]) {
        userByDeviceId[entry.metadata.user] = [];
      }

      const date = `${entry.metadata.year}-${entry.metadata.month}-${entry.metadata.day}`;
      const deviceId = entry.metadata.deviceId;
      const deviceMetas = {
        deviceId,
        date,
        webview,
        apk,
        android,
        cht,
        settings,
      };
      const deviceIndex = userByDeviceId[entry.metadata.user].findIndex(d => d.deviceId === deviceId);
      const device = userByDeviceId[entry.metadata.user][deviceIndex];
      if (deviceIndex === -1) {
        userByDeviceId[entry.metadata.user].push(deviceMetas);
      } else {
        if (device.date < date) {
          // if we got a more recent entry, replace the old one we had
          userByDeviceId[entry.metadata.user].splice(deviceIndex, 1, deviceMetas);
        }
      }
    });

    const { results } = await db.medicUsersMeta.bulkGet({
      docs: [
        { id: 'userByDeviceId' },
        { id: 'versionsCounts' },
      ],
      revs: true,
    });
    // console.log("results[0].docs[0]._rev", results[0].docs[0].ok._rev);
    // TODO: maybe find a different db where to store this, for now medic-users-meta is convenient
    await db.medicUsersMeta.bulkDocs([
      {
        _id: 'userByDeviceId',
        _rev: results[0].docs[0].ok._rev,
        data: userByDeviceId,
      },
      {
        _id: 'versionsCounts',
        _rev: results[1].docs[0].ok._rev,
        data: versionsCounts,
      },
    ]);
  },
};
