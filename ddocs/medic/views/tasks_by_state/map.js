function(doc) {
  if (doc.type === 'task') {
    var emission = doc.emission || {};
    emit(doc.state, { dueDate: emission.dueDate, startDate: emission.startDate, endDate: emission.endDate });
  }
}
