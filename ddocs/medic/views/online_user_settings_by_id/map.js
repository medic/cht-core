function(doc) {
  if (doc.type === 'user-settings' &&
      doc.roles &&
      (doc.roles.indexOf('_admin') !== -1 ||
      doc.roles.indexOf('national_admin') !== -1)) {
    emit(doc._id);
  }
}
