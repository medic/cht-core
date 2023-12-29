const db = require('../api/src/db');

const sortObjectKeys = (obj, compareFn = (a, b) => a.localeCompare(b)) => Object.keys(obj).sort(compareFn).reduce((result, key) => {
  result[key] = obj[key];
  return result;
}, {});

(async () => {
  console.time('query allDocs');
  const telemetry = await db.medicUsersMeta.query('users-meta/telemetry', { include_docs: true });

  // let telemetry = await db.medicUsersMeta.allDocs({ include_docs: true });
  // telemetry = telemetry.rows.filter(e => e.doc.type === 'telemetry').map(e => e.doc);
  // console.log("telemetry", telemetry.length);

  // await db.medicUsersMeta.createIndex({
  //   index: {
  //     fields: ['type'],
  //   },
  // });

  // const telemetry = await db.medicUsersMeta.find({
  //   limit: 50000,
  //   selector: { type: 'telemetry' },
  // });
  // console.log("telemetry", telemetry.docs.length);

  console.timeEnd('query allDocs');

  // used to see which user is still using an outdated browser/app
  const userByDeviceId = {};

  // used to get a bird's eye view of the deployment, how many devices have outdated software
  const versionsCounts = {
    android: {},
    app: {},
    webview: {},
  };
  console.time('compute device stuff');
  telemetry.rows.forEach(({ doc: entry }) => {
    if (!entry.device && !entry.metadata) {
      return;
    }

    const webview = /Chrome\/(\d+\.\d+)/.exec(entry.device.userAgent)?.[1];
    const apk = entry.device.deviceInfo.app?.version;
    const android = entry.device.deviceInfo.software?.androidVersion;
    const cht = entry.metadata.versions.app;
    const settings = entry.metadata.versions.settings;

    versionsCounts.android[android] = versionsCounts.android[android] ? versionsCounts.android[android] + 1 : 1;
    versionsCounts.app[apk] = versionsCounts.app[apk] ? versionsCounts.app[apk] + 1 : 1;
    versionsCounts.webview[webview] = versionsCounts.webview[webview] ? versionsCounts.webview[webview] + 1 : 1;

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
        // console.log(`found a more recent entry for user ${entry.metadata.user} & device ${deviceId} - ${device.date} < ${date}`);
        // if we got a more recent entry, replace the old one we had
        userByDeviceId[entry.metadata.user].splice(deviceIndex, 1, deviceMetas);
      }
    }
  });
  console.timeEnd('compute device stuff');

  versionsCounts.android = sortObjectKeys(versionsCounts.android);
  versionsCounts.app = sortObjectKeys(versionsCounts.app);
  versionsCounts.webview = sortObjectKeys(versionsCounts.webview, (a, b) => {
    if (a === undefined) {
      return -1;
    }
    if (b === undefined) {
      return 1;
    }
    return parseInt(a) - parseInt(b);
  });
})();
