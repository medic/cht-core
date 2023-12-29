const transitionUtils = require('./utils');
const db = require('../db');
const NAME = 'compute_device_metrics';

// TODO still WIP

module.exports = {
  name: NAME,
  filter: function({ doc, info }) {
    const self = module.exports;
    return Boolean(
      doc &&
      doc.type === 'telemetry' &&
      !self._hasRun(info)
    );
  },
  _hasRun: function(doc) {
    return Boolean(
      transitionUtils.hasRun(doc, NAME) &&
            doc.transitions[NAME].ok
    );
  },
  onMatch: change => {
    const entry = change.doc;
    const date = `${entry.metadata.year}-${entry.metadata.month}-${entry.metadata.day}`;
    const deviceId = entry.metadata.deviceId;
    const webview = /Chrome\/(\d+\.\d+)/.exec(entry.device.userAgent)?.[1];
    const apk = entry.device.deviceInfo.app?.version;
    const android = entry.device.deviceInfo.software?.androidVersion;
    const cht = entry.metadata.versions.app;
    const settings = entry.metadata.versions.settings;
    const deviceMetas = {
      deviceId,
      date,
      webview,
      apk,
      android,
      cht,
      settings,
    };

    const userByDeviceId = {}; // this should be a couchdb db
    if (!userByDeviceId[entry.metadata.user]) {
      userByDeviceId[entry.metadata.user] = [];
    }
    const deviceIndex = userByDeviceId[entry.metadata.user].findIndex(d => d.deviceId === deviceId);
    const device = userByDeviceId[entry.metadata.user][deviceIndex];
    if (deviceIndex === -1) {
      // insert in db
      userByDeviceId[entry.metadata.user].push(deviceMetas);
    } else {
      // update
      if (device.date < date) {
        // if we got a more recent entry, replace the old one we had
        userByDeviceId[entry.metadata.user].splice(deviceIndex, 1, deviceMetas);
      }
    }
  }
};
