module.exports = {
  map: function(doc) {
    var tasks = doc.scheduled_tasks || [];
    tasks.forEach(function(task, idx) {
      if (task.due)
        emit(task.due, { _id: doc._id, _rev: doc._rev, index: idx })
    });
  }
}
