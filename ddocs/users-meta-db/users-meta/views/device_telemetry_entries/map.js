function(doc) {
  if (doc.type === 'telemetry') {
    if (!doc.device && !doc.metadata) {
      return;
    }

    emit(doc._id);
  }
}
