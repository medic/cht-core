function(doc) {
  var getPosition = function(facility) {
    if (facility) {
      var nameParts = [];
      while (facility) {
        if (facility.name) {
          nameParts.push(facility.name);
        }
        facility = facility.parent;
      }
      if (nameParts.length) {
        return nameParts;
      }
    }
  };
  var emitContact = function(key, date, value) {
    if (key) {
      emit([key, date], value);
    }
  };

  var message,
      facility,
      contactName,
      key,
      position;
  if (doc.type === 'data_record' && !doc.form) {
    if (doc.kujua_message) {
      // outgoing
      doc.tasks.forEach(function(task) {
        message = task.messages[0];
        facility = message.contact;
        key = (facility && facility._id) || message.to;
        if (!facility) {
          contactName = message.to;
          position = undefined;
        } else {
          position = getPosition(facility.parent);
          contactName = facility.name;
        }
        emitContact(key, doc.reported_date, {
          date: doc.reported_date,
          read: doc.read,
          facility: facility,
          message: message.message,
          contact: {
              name: contactName,
              parent: position
          }
        });
      });
    } else if (doc.sms_message) {
      // incoming
      facility = doc.contact;
      message = doc.sms_message;
      position = facility && getPosition(facility.parent) || doc.from;
      contactName = (facility && facility.name) || doc.from;
      key = (facility && facility._id) || doc.from;
      emitContact(key, doc.reported_date, {
        date: doc.reported_date,
        read: doc.read,
        facility: facility,
        message: message.message,
        contact: {
          name: contactName,
          parent: position
        }
      });
    }
  }
}
