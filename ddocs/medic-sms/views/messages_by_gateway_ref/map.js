function(doc) {
  var _emitMsg = function(msg) {
    if (msg && msg.gateway_ref) {
      emit(msg.gateway_ref, msg.uuid);
    }
  };

  // outgoing
  var _emit = function(tasks) {
    tasks.forEach(function(task) {
      if (task.messages) {
        task.messages.forEach(_emitMsg);
      }
    });
  };
  _emit(doc.tasks || []);
  _emit(doc.scheduled_tasks || []);

  // incoming
  if (doc.type === 'data_record') {
    _emitMsg(doc.sms_message);
  }
}
