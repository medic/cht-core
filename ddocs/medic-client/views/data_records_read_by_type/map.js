function(doc) {
  if (doc.type === 'data_record') {
    var emitRead = function(doc, type) {
      emit(['_total', type]);
      if (doc.read) {
        doc.read.forEach(function(user) {
          if (user) {
            emit([user, type]);
          }
        });
      }
    };
    var type = doc.form ? 'forms' : 'messages';
    if (doc.tasks) {
      doc.tasks.forEach(function(task) {
        emitRead(doc, type);
      });
    } else {
      emitRead(doc, type);
    }
  }
}
