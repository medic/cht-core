db = require('../db')
_ = require('underscore')

module.exports =
  getClinicPhone: (doc) ->
    doc?.related_entities?.clinic?.contact?.phone
  getClinicName: (doc) ->
    doc?.related_entities?.clinic?.name or 'health volunteer'
  getParentPhone: (doc) ->
    doc?.related_entities?.clinic?.parent?.contact?.phone
  # fetches the registration and then calls the callback with (err, registration)
  getOHWRegistration: (patient_id, callback) ->
    db.view('kujua-sentinel', 'ohw_registered_patients', key: patient_id, include_docs: true, limit: 1, (err, data) =>
      if err
        callback(err)
      else
        registration = _.first(data.rows)?.doc
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
  addMessage: (doc, options = {}) ->
    { phone, message } = options
    doc.tasks ?= []

    task =
      messages: [ ]
      state: 'pending'

    task.messages.push(
      to: phone
      message: message
    )
    _.extend(task, _.omit(options, 'phone', 'message'))

    doc.tasks.push(task)
  updateScheduledMessage: (doc, options = {}) ->
    { message, type } = options
    msg = _.find(doc.scheduled_tasks, (task) ->
      task.type is type
    )
    target = _.first(msg?.messages)
    target?.message = message
  addScheduledMessage: (doc, options = {}) ->
    doc.scheduled_tasks ?= []

    { due, message, phone } = options

    due = due.getTime() if due instanceof Date

    delete options.message
    delete options.due
    delete options.phone

    task =
      due: due
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
    doc.scheduled_tasks = _.filter(doc.scheduled_tasks, (task) ->
      if task.state is 'muted'
        task.state = 'scheduled'
      new Date(task.due) > Date.now()
    )
  muteScheduledMessages: (doc) ->
    doc.scheduled_tasks ?= []
    doc.scheduled_tasks = _.map(doc.scheduled_tasks, (task) ->
      task.state = 'muted'
      task
    )
