module.exports.map = function(doc) {
  if (doc.type === 'task') {
    const isTerminalState = ['Cancelled', 'Completed', 'Failed'].includes(doc.state);
    const owner = (doc.owner || '_unassigned');

    if (!isTerminalState) {
      emit('owner-' + owner);
    }

    if (doc.requester) {
      emit('requester-' + doc.requester);
    }

    emit(['owner', 'all', owner], { state: doc.state });
  }
};
