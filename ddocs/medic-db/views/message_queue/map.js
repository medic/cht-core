function (doc) {
  var mutedStatuses = ['muted', 'cleared', 'denied', 'duplicate'];
  var scheduledStatus = 'scheduled';
  var successStatuses = ['delivered', 'sent'];
  var failureStatuses = ['failed'];

  var _emitValue = function(keys, value) {
    keys.forEach(function(key) {
      if (key && key[0]) {
        emit(key, value);
      }
    })
  }

  var _emit = function(tasks) {
    tasks.forEach(function(task) {
      var due = new Date(task.due || task.timestamp || doc.reported_date).getTime();
      var dueMutedKey = ['due', due];
      var deliveredFailureKey = [undefined, due];
      var keys = [dueMutedKey, deliveredFailureKey];

      if (task.state === scheduledStatus) {
        dueMutedKey[0] = 'scheduled';
      } else if (mutedStatuses.indexOf(task.state) > -1) {
        dueMutedKey[0] = 'muted';
      }
      if (successStatuses.indexOf(task.state) > -1) {
        deliveredFailureKey[0] = 'delivered';
      }
      if (failureStatuses.indexOf(task.state) > -1) {
        deliveredFailureKey[0] = 'failed';
      }

      var taskData = {
        state_history: task.state_history && task.state_history[task.state_history.length - 1],
        state: task.state,
        group: task.group,
        translation_key: task.translation_key,
        type: task.type
      };

      if(task.messages) {
        task.messages.forEach(function(msg) {
          if (msg.uuid && msg.to && msg.message) {
            var value = {
              sms: {
                message: msg.message,
                to: msg.to
              },
              task: taskData,
              due: due
            };

            _emitValue(keys, value);
          }
        });
      } else {
        // generate the messages before displaying them in the admin console
        var value = {
          scheduled_sms: {
            translation_key: task.message_key,
            recipient: task.recipient,
            content: task.message
          },
          task: taskData,
          due: due
        };

        _emitValue(keys, value);
      }

    });
  };
  _emit(doc.tasks || []);
  _emit(doc.scheduled_tasks || []);
}
