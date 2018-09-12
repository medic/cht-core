function (doc) {
  var mutedStatuses = ['muted', 'cleared', 'denied', 'duplicate'];
  var scheduledStatus = 'scheduled';

  var dataRecordData = {
    id: doc._id,
    reported_date: doc.reported_date,
    contact: doc.contact,
    patient_id: doc.patient_id || (doc.fields && doc.fields.patient_id),
    patient_uuid: doc.fields && doc.fields.patient_uuid,
    form: doc.form,
    fields: doc.fields,
    locale: doc.locale || (doc.sms_message && doc.sms_message.locale)
  };

  var _emit = function(tasks) {
    tasks.forEach(function(task) {
      var due = new Date(task.due || task.timestamp || doc.reported_date).getTime();
      var key = ['due', due];
      if (task.state === scheduledStatus) {
        key[0] = 'scheduled';
      } else if (mutedStatuses.indexOf(task.state) > -1) {
        key[0] = 'muted';
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
              record: dataRecordData,
              due: due
            };

            emit(key, value);
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
          record: dataRecordData,
          due: due
        };

        emit(key, value);
      }

    });
  };
  _emit(doc.tasks || []);
  _emit(doc.scheduled_tasks || []);
}
