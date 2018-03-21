function (doc) {
  /*
   * Required fields for message to be processed:
   *  task `state` value must be 'pending'
   *  message needs the `to` and `message` properties
   */
  function hasPending(tasks) {
    return tasks && tasks.some(function(task) {
      if (task && task.state === 'pending') {
        return task.messages && task.messages.some(function(msg) {
          if (msg && msg.to && msg.message) {
            return true;
          }
        });
      }
    });
  }

  // check tasks
  var pending = hasPending(doc.tasks);

  // if still not pending check scheduled_tasks too.  also, only process
  // scheduled tasks if doc has no errors.
  if (!pending && (!doc.errors || doc.errors.length === 0)) {
    pending = hasPending(doc.scheduled_tasks);
  }

  if (pending) {
    emit([doc.reported_date, doc.refid]);
  }
}
