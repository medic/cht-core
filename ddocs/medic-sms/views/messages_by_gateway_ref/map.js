function(doc) {
  var _emitMsg = function(ref, uuid) {
    if (ref) {
      emit(ref, uuid);
    }
  };

  // outgoing
  var _emit = function(tasks) {
    tasks.forEach(function(task) {
      if (task.messages) {
        task.messages.forEach(function(msg) {
          _emitMsg(task.gateway_ref, msg.uuid)
        });
      }
    });
  };
  _emit(doc.tasks || []);
  _emit(doc.scheduled_tasks || []);

  // incoming
  if (doc.type === 'data_record' && doc.sms_message) {
    _emitMsg(doc.sms_message.gateway_ref, doc.sms_message.uuid);
  }
}
