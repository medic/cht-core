function(doc) {

  var getLineage = function(contact) {
    var lineage = [];
    while (contact) {
      if (contact._id) {
        lineage.push(contact._id);
      }
      contact = contact.parent;
    }
    return lineage;
  };

  var emitMessage = function(doc, contact, phone, message) {
    var from = (contact && contact._id) || phone;
    var id = from || doc._id;
    emit([ id, doc.reported_date ], {
      from: from,
      date: doc.reported_date,
      message: message,
      contact: contact && contact._id,
      lineage: getLineage(contact && contact.parent)
    });
  };

  if (doc.type === 'data_record' && !doc.form) {
    if (doc.kujua_message) {
      // outgoing
      doc.tasks.forEach(function(task) {
        var message = task.messages[0];
        emitMessage(doc, message.contact, message.to, message.message);
      });
    } else if (doc.sms_message) {
      // incoming
      emitMessage(doc, doc.contact, doc.from, doc.sms_message.message);
    }
  }
}
