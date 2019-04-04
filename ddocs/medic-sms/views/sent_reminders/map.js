function(doc) {
  if (doc.type === 'reminder') {
    emit([doc.contact_type, doc.form, doc.timestamp], 0);
    if (doc.tasks && Array.isArray(doc.tasks)) {
      doc.tasks.forEach(function(task) {
        emit([task.contact_id, doc.form, doc.timestamp]);
      });
    }
  }
}
