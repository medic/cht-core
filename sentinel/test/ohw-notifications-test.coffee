vows = require('vows')
should = require('should')
_ = require('underscore')

{ transitions, Transition } = require('../transitions')

getTransition = (muted = false, task_state = 'scheduled') ->
  transition = new Transition('ohw_notifications', transitions.ohw_notifications)
  transition.db =
    saveDoc: (registration, callback) ->
      registration.muted.should.eql(muted)
      _.each(registration.scheduled_tasks, (task) ->
        task.state.should.eql(task_state)
      )
      callback(null)

  transition.getOHWRegistration = (patient_id, callback) ->
    if patient_id is 'AA'
      callback(null,
        related_entities:
          clinic:
            name: 'foo'
            contact:
              phone: '123'
            parent:
              contact:
                phone: '234'
        patient_name: 'Patient'
        scheduled_tasks: [
          {
            due: new Date().getTime()
            messages: [
              to: '123'
              message: 'what'
            ]
            state: 'scheduled'
          }
          {
            due: new Date().getTime()
            messages: [
              to: '123'
              message: 'gives'
            ]
            state: 'scheduled'
          }
        ]
      )
    else
      callback(null, false)
  transition

vows.describe('test receiving birth reports').addBatch(
  'filter generated from transition':
    topic: ->
      filter = undefined
      eval("""filter = #{getTransition().filter} """)
    'filter should work with right patient_id form clinic': (filter) ->
      filter(
        form: 'ONOT'
        related_entities:
          clinic: {}
        patient_id: 'AA'
      ).should.eql(true)
    'filter should require patient_id': (filter) ->
      filter(
        form: 'ONOT'
        related_entities:
          clinic: {}
      ).should.eql(false)
    'filter should require right form': (filter) ->
      filter(
        related_entities:
          clinic: {}
        patient_id: 'AA'
      ).should.eql(false)
    'filter should require clinic': (filter) ->
      filter(
        form: 'ONOT'
      ).should.eql(false)
      filter(
        form: 'ONOT'
        related_entities:
          clinic: null
      ).should.eql(false)
  'onMatch unmuting':
    topic: ->
      getTransition(false, 'scheduled')
    'turn off messages': (transition) ->
      transition.complete = (err, doc) ->
        tasks = doc.tasks
        tasks.length.should.eql(1)
        /turned on/.test(tasks[0].messages[0].message).should.be.ok
      transition.onMatch(
        doc:
          patient_id: 'AA'
          notifications: true
      )
  'onMatch muting':
    topic: ->
      getTransition(true, 'muted')
    'turn off messages': (transition) ->
      transition.complete = (err, doc) ->
        tasks = doc.tasks
        tasks.length.should.eql(1)
        /turned off/.test(tasks[0].messages[0].message).should.be.ok
      transition.onMatch(
        doc:
          patient_id: 'AA'
          notifications: false
      )
).export(module)

