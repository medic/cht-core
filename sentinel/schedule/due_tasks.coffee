_ = require('underscore')
db = require('../db')
date = require('../date')

module.exports = ->
  now = date.getDate()
  overdue = new Date(now.getTime())
  overdue.setDate(overdue.getDate() - 7)

  db.view('kujua-sentinel', 'due_tasks', startkey: overdue.getTime(), endkey: now.getTime(), (err, data) ->
    throw JSON.stringify(err) if err
    _.each(data.rows, (row) ->
      due = row.key
      { _id, _rev, index } = row.value
      db.getDoc(_id, _rev, (err, doc) ->
        { scheduled_tasks, tasks } = doc
        [ to_do ] = scheduled_tasks.splice(index, 1)
        if to_do and to_do.due is due
          tasks.push(
            messages: to_do.messages
            state: 'pending'
          )
          db.saveDoc(doc)
      )
    )
  )
