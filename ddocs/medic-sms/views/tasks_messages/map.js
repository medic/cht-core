function (doc) {
  var _emit = function(tasks) {
    tasks.forEach(function(task) {
      if(task.messages) {
        task.messages.forEach(function(msg) {
          /*
          * uuid, to and message properties are required for message
          * to be processed/valid.
          */
          if (msg.uuid && msg.to && msg.message) {
            var sendingDueDate = task.due || task.timestamp || // for scheduled_message
                doc.reported_date; // for immediate reply to form submission
            var val = {
              message: msg.message,
              to: msg.to,
              id: msg.uuid,
              state: task.state,
              state_details: task.state_details,
              state_history: task.state_history,
              due: task.due,
              timestamp: task.timestamp,
              _record_id: doc._id,
              _record_reported_date: doc.reported_date,
              sending_due_date: sendingDueDate
            };
            // used for fetching a specific message based on uuid
            emit(msg.uuid, val);
            // used for querying latest tasks in a specific state
            emit(task.state, val);
          }
        });
      }
    });
  };
  _emit(doc.tasks || []);
  _emit(doc.scheduled_tasks || []);
}
