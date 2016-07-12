function(doc) {
  if (doc.type === 'help' && doc._id.indexOf('help:') === 0) {
    emit(doc._id.substring(5), doc.title);
  }
}
