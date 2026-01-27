function (doc) {
  var finalStatuses = ['sent', 'delivered', 'failed'];
  var mutedStatuses = ['muted', 'cleared', 'denied', 'duplicate'];
  var scheduledStatus = 'scheduled';

  var _emit = function(tasks) {
    tasks.forEach(function(task) {
      var history = task.state_history && task.state_history[task.state_history.length - 1];
      var lastUpdated = new Date(history && history.timestamp || task.timestamp || doc.reported_date).getTime();

      var statusGroup = 'pending';
      if (task.state === scheduledStatus) {
        statusGroup = scheduledStatus;
      } else if (finalStatuses.indexOf(task.state) > -1) {
        statusGroup = 'final';
      } else if (mutedStatuses.indexOf(task.state) > -1) {
        statusGroup = 'muted';
      }

      emit([statusGroup, lastUpdated, task.state]);
    });
  };
  _emit(doc.tasks || []);
  _emit(doc.scheduled_tasks || []);
}
