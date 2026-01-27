function (doc) {
  var _emit = function(tasks) {
    tasks.forEach(function(task) {
      if (!task.messages || !task.gateway_ref) {
        return;
      }

      task.messages.forEach(function(msg) {
        if (msg.uuid && msg.to && msg.message) {
          var value = {
            id: msg.uuid,
            gateway_ref: task.gateway_ref,
          };
          emit(task.state, value);

        }
      });
    });
  };
  _emit(doc.tasks || []);
  _emit(doc.scheduled_tasks || []);
}
