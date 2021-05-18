function (doc) {
  var _emit = function(tasks) {
    tasks.forEach(function(task) {
      var history = task.state_history && task.state_history[task.state_history.length - 1];
      var lastUpdated = new Date(history && history.timestamp || task.timestamp || doc.reported_date).getTime();
      emit([lastUpdated, task.state]);
    });
  };
  _emit(doc.tasks || []);
  _emit(doc.scheduled_tasks || []);
}
