function(doc) {
  if (doc.type === 'telemetry') {
    emit([doc.metadata.user, doc.metadata.deviceId], {
      date: `${doc.metadata.year}-${doc.metadata.month}-${doc.metadata.day}`,
      id: doc._id,
    });
  }
}
