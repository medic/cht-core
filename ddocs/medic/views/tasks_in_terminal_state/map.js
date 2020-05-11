function(doc) {
  if (doc.type === 'task') {
    var isTerminalState = ['Cancelled', 'Completed', 'Failed'].indexOf(doc.state) >= 0;
    if (isTerminalState && doc.emission) {
      emit(doc.emission.endDate);
    }
  }
}
