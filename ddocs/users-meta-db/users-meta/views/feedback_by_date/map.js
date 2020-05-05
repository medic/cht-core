function(doc) {
  if (doc.type === 'feedback') {
    emit(doc.meta.time);
  }
}
