function(doc) {
  if (Array.isArray(doc.tasks)) {
    doc.tasks.forEach(function(task) {
      if (task.code && task.ts) {
        emit([task.code, task.ts]);
      }
    });
  }
}
