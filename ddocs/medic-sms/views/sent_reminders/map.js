function(doc) {
  if (Array.isArray(doc.tasks)) {
    doc.tasks.forEach(function(task) {
      if (task.form && task.timestamp) {
        emit([task.form, task.timestamp]);
      }
    });
  }
}
