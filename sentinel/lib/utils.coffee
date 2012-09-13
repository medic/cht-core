db = require('../db')
_ = require('underscore')

module.exports =
  getClinicPhone: (doc) ->
    doc.related_entities?.clinic?.contact?.phone
  getClinicName: (doc) ->
    doc.related_entities?.clinic?.name or 'health volunteer'
  getParentPhone: (doc) ->
    doc.related_entities?.clinic?.parent?.contact?.phone
  # fetches the registration and then calls the callback with (err, registration)
  getOHWRegistration: (patient_id, callback) ->
    db.view('kujua-sentinel', 'ohw_registered_patients', key: patient_id, limit: 1, (err, data) =>
      if err
        callback(err, null)
      else
        registration = data.rows?[0]?.value
        callback(null, registration)
    )
  filterScheduledMessages: (doc, type) ->
    { scheduled_tasks } = doc
    _.filter(scheduled_tasks, (task) ->
      task.type is type
    )
  findScheduledMessage: (doc, type) ->
    { scheduled_tasks } = doc
    _.find(scheduled_tasks, (task) ->
      task.type is type
    )
  addMessage: (doc, phone, message, options = {}) ->
    doc.tasks ?= []
    task =
      messages: [
        {
          to: phone
          message: message
        }
      ]
      state: 'pending'

    _.extend(task, options)

    doc.tasks.push(task)
  addScheduledMessage: (doc, options = {}) ->
    doc.scheduled_tasks ?= []

    { due, message, phone } = options

    delete options.message
    delete options.due
    delete options.phone

    task =
      due: due.getTime()
      messages: [
        to: phone
        message: message
      ]
      state: if doc.muted then 'muted' else 'scheduled'

    _.extend(task, options)
    doc.scheduled_tasks.push(task)
  obsoleteScheduledMessages: (doc, type, before) ->
    doc.scheduled_tasks ?= []
    size_before = doc.scheduled_tasks.length
    doc.scheduled_tasks = _.reject(doc.scheduled_tasks, (task) ->
      type is task.type and task.due < before
    )
    size_after = doc.scheduled_tasks.length
    size_before isnt size_after
  clearScheduledMessages: (doc, types...) ->
    doc.scheduled_tasks ?= []
    doc.scheduled_tasks = _.reject(doc.scheduled_tasks, (task) ->
      _.include(types, task.type)
    )
  unmuteScheduledMessages: (doc) ->
    doc.scheduled_tasks ?= []
    doc.scheduled_tasks = _.compact(_.map(doc.scheduled_tasks, (task) ->
      if new Date(task.due) > new Date() and task.state is 'muted'
        task.state = 'scheduled'
        task
    ))
  muteScheduledMessages: (doc) ->
    doc.scheduled_tasks ?= []
    doc.scheduled_tasks = _.map(doc.scheduled_tasks, (task) ->
      task.state = 'muted'
      task
    )
