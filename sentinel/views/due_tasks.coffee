module.exports =
  map: (doc) ->
    tasks = doc.scheduled_tasks or []
    tasks.forEach((task, index) ->
      if task.due
        { _id, _rev } = doc
        emit(task.due, { _id: _id, _rev: _rev, index: index })
    )
