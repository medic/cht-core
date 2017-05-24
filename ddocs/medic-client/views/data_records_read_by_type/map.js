function(doc) {
  if (doc.type === 'data_record') {
    var type = doc.form ? 'forms' : 'messages';
    emit(['_total', type]);
    if (doc.read) {
      doc.read.forEach(function(user) {
        if (user) {
          emit([user, type]);
        }
      });
    }
  }
}
