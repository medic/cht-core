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
      return number.toString().padStart(2, '0');
    };

    emit([doc.metadata.user, doc.metadata.deviceId], {
      date: doc.metadata.year + '-' + pad(doc.metadata.month) + '-' + pad(doc.metadata.day),
      id: doc._id,
      device: {
        userAgent: doc.device && doc.device.userAgent,
        versions: {
          apk: doc.device && doc.device.deviceInfo && doc.device.deviceInfo.app && doc.device.deviceInfo.app.version,
          android: doc.device
            && doc.device.deviceInfo
            && doc.device.deviceInfo.software
            && doc.device.deviceInfo.software.androidVersion,
          cht: doc.metadata.versions && doc.metadata.versions.app,
          settings: doc.metadata.versions && doc.metadata.versions.settings,
        },
      },
    });
  }
}
