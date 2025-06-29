function(doc) {
  if (
    doc.type === 'telemetry' &&
    doc.metadata &&
    doc.metadata.user &&
    doc.metadata.deviceId &&
    doc.metadata.year &&
    doc.metadata.month &&
    doc.metadata.day
  ) {
    var pad = function (number) {
      var string = number.toString();
      return string.length === 2 ? string : '0' + string;
    };

    var deviceInfo = doc.device && doc.device.deviceInfo;

    emit([doc.metadata.user, doc.metadata.deviceId], {
      date: doc.metadata.year + '-' + pad(doc.metadata.month) + '-' + pad(doc.metadata.day),
      id: doc._id,
      device: {
        userAgent: doc.device && doc.device.userAgent,
        versions: {
          apk: deviceInfo && deviceInfo.app && deviceInfo.app.version,
          android: deviceInfo && deviceInfo.software && deviceInfo.software.androidVersion,
          cht: doc.metadata.versions && doc.metadata.versions.app,
          settings: doc.metadata.versions && doc.metadata.versions.settings,
        },
        storage: {
          free: deviceInfo && deviceInfo.storage && deviceInfo.storage.free,
          total: deviceInfo && deviceInfo.storage && deviceInfo.storage.total
        }
      }
    });
  }
}