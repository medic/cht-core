function(doc) {
  if (doc.type === 'task') {
    var isTerminalState = ['Cancelled', 'Completed', 'Failed'].indexOf(doc.state) >= 0;
    var owner = (doc.owner || '_unassigned');

    if (!isTerminalState) {
      emit('owner-' + owner);
    }

    if (doc.requester) {
      emit('requester-' + doc.requester);
    }

    emit(['owner', 'all', owner], { state: doc.state });
  }
}
