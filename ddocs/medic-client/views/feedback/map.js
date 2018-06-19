function(doc) {
  if (doc.type === 'feedback') {
    emit([new Date(doc.meta.time).valueOf()], 1);
  }
}
