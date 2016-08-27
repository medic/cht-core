function(doc) {
  var emitRead = function(doc, type, dh) {
    emit(['_total', type, dh]);
    if (doc.read) {
      doc.read.forEach(function(user) {
        if (user) {
          emit([user, type, dh]);
        }
      });
    }
  };

  var getDistrictId = function(facility, type) {
    while (facility && facility.type !== 'district_hospital') {
      facility = facility.parent;
    }
    return facility && facility._id;
  };

  if (doc.type === 'data_record') {
    var type = doc.form ? 'forms' : 'messages';
    var dh = getDistrictId(doc.contact);
    if (dh) {
      emitRead(doc, type, dh);
    } else if (doc.tasks) {
      doc.tasks.forEach(function(task) {
        dh = getDistrictId(task.messages[0].contact);
        emitRead(doc, type, dh);
      });
    } else {
      emitRead(doc, type);
    }
  }
}
