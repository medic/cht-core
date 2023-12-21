const fs = require('fs');

let telemetry = fs.readFileSync('./telemetry.json', 'utf8');
telemetry = JSON.parse(telemetry);

const userByDeviceId = {};
// const versionsCounts = {
//   android: {},
//   apk: {},
//   webview: {},
// };
// let androidEntries = telemetry.filter(entry => entry.device?.userAgent?.includes('Android'));
// console.log("telemetry", androidEntries[0].metadata.versions);
telemetry.forEach(entry => {
  if (!entry.device && !entry.metadata) {
    return;
  }

  const webview = /Chrome\/(\d+\.\d+)/.exec(entry.device.userAgent)?.[1];
  const apk = entry.device.deviceInfo.app?.version;
  const android = entry.device.deviceInfo.software?.androidVersion;
  const cht = entry.metadata.versions.app;
  const settings = entry.metadata.versions.settings;

  // versionsCounts.android[android] = versionsCounts.android[android] ? versionsCounts.android[android] + 1 : 1;
  // versionsCounts.app[apk] = versionsCounts.app[apk] ? versionsCounts.app[apk] + 1 : 1;
  // versionsCounts.webview[webview] = versionsCounts.webview[webview] ? versionsCounts.webview[webview] + 1 : 1;

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
      console.log(`found a more recent entry for user ${entry.metadata.user} & device ${deviceId} - ${device.date} < ${date}`);
      // if we got a more recent entry, replace the old one we had
      userByDeviceId[entry.metadata.user].splice(deviceIndex, 1, deviceMetas);
    }
  }
});

// console.log("userByDeviceId", userByDeviceId);
for (const [user, devices] of Object.entries(userByDeviceId)) {
  // console.log(user, devices);
}
