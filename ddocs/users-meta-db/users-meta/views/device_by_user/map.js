function(doc) {
  if (
    doc.type === 'telemetry' &&
    doc.metadata &&
    doc.metadata.user &&
    doc.metadata.year &&
    doc.metadata.month &&
    doc.metadata.day &&
    doc.metadata.versions &&
    doc.device
  ) {
    emit(doc.metadata.user, {
      date: doc.metadata.year + '-' +
        doc.metadata.month.toString().padStart(2, '0') + '-' +
        doc.metadata.day.toString().padStart(2, '0'),
      id: doc._id,
      device: {
        deviceId: doc.metadata.deviceId,
        userAgent: doc.device.userAgent,
        versions: {
          apk: doc.device.deviceInfo.app ? doc.device.deviceInfo.app.version : undefined,
          android: doc.device.deviceInfo.software ? doc.device.deviceInfo.software.androidVersion : undefined,
          cht: doc.metadata.versions.app,
          settings: doc.metadata.versions.settings,
        },
      },
    });
  }
}
