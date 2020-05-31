function (doc) {
  var _emit = function(tasks) {
    tasks.forEach(function(task) {
      if (task.messages) {
        task.messages.forEach(function(msg) {
          if (msg.uuid) {
            emit(msg.uuid);
          }
        });
      }
    });
  };
  _emit(doc.tasks || []);
  _emit(doc.scheduled_tasks || []);
}
