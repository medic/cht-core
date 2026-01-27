function(doc) {

  var emitMessage = function(doc, contact, phone) {
    var id = (contact && contact._id) || phone || doc._id;
    emit([ id, doc.reported_date ], {
      id: doc._id,
      date: doc.reported_date,
      contact: contact && contact._id
    });
  };

  if (doc.type === 'data_record' && !doc.form) {
    if (doc.kujua_message && doc.tasks) {
      // outgoing
      doc.tasks.forEach(function(task) {
        var message = task.messages && task.messages[0];
        if(message) {
          emitMessage(doc, message.contact, message.to);
        }
      });
    } else if (doc.sms_message) {
      // incoming
      emitMessage(doc, doc.contact, doc.from);
    }
  }
}
