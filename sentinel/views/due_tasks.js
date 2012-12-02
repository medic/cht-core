module.exports = {
  map: function(doc) {
    var tasks = doc.scheduled_tasks || [];
    tasks.forEach(function(task, index) {
      if (task.due)
        emit(task.due, index);
    });
  }
};
