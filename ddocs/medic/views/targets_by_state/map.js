function(doc) {
  if (doc.type === 'task') {
    emit(doc.state, { dueDate: doc.dueDate, startDate: doc.startDate, endDate: doc.endDate });
  }
}
