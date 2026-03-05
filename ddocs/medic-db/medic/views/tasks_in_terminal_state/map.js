function(doc) {
  if (doc.type === DOC_TYPES.TASK) {
    var isTerminalState = ['Cancelled', 'Completed', 'Failed'].indexOf(doc.state) >= 0;
    if (isTerminalState && doc.emission) {
      emit(doc.emission.endDate);
    }
  }
}
