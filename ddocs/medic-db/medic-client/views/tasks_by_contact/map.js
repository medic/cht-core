function(doc) {
  if (doc.type === 'task') {
    var isTerminalState = ['Cancelled', 'Completed', 'Failed'].indexOf(doc.state) >= 0;
    if (!isTerminalState) {
      emit('owner-' + (doc.owner || '_unassigned'));
    }

    if (doc.requester) {
      emit('requester-' + doc.requester);
    }
  }
}
