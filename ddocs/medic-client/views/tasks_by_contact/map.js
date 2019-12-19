function(doc) {
  if (doc.type === 'task') {
    if (doc.owner) {
      var isTerminalState = ['Cancelled', 'Completed', 'Failed'].indexOf(doc.state) >= 0;
      if (!isTerminalState) {
        emit('owner-' + doc.owner);
      }
    }

    if (doc.requester) {
      emit('requester-' + doc.requester);
    }
  }
}