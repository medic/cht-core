function (doc) {
  var _emit = function(tasks) {
    tasks.forEach(function(task) {
      var due = task.due || task.timestamp || // for scheduled_message
                doc.reported_date; // for immediate reply to form submission
      if (typeof due === 'string') {
        due = Date.parse(due).valueOf();
      }
      if (task.messages) {
        task.messages.forEach(function(msg) {
          if (msg.uuid && msg.to && msg.message) {
            var value = {
              content: msg.message,
              to: msg.to,
              id: msg.uuid,
            };
            emit([ task.state, due ], value);
            if (task.state === 'pending' || task.state === 'forwarded-to-gateway') {
              // emit a single state so we can sort by due date in the view
              emit([ 'pending-or-forwarded', due ], value);
            }
          }
        });
      } else {
        emit([ task.state, due ], {});
      }
    });
  };
  _emit(doc.tasks || []);
  _emit(doc.scheduled_tasks || []);
}
