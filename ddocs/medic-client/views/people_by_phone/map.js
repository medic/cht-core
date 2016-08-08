function(doc) {
  if (doc.type === 'person') {
    emit([doc.phone]);
  }
}
