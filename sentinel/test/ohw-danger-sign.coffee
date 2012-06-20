vows = require('vows')
should = require('should')

{ transitions, Transition } = require('../transitions')

getTransition = (test_registration = false) ->
  transition = new Transition('ohw_danger_sign', transitions.ohw_danger_sign)
  transition.db =
    saveDoc: (registration, callback) ->
      if test_registration
        registration.danger_signs.length.should.eql(1)
        registration.danger_signs[0].should.eql('808')
        registration.scheduled_tasks[0].messages[0].message.should.not.eql('x')
      callback(null)

  transition.getOHWRegistration = (patient_id, callback) ->
    if patient_id is 'AA'
      callback(null,
        patient_name: 'Patient'
        scheduled_tasks: [
          messages: [
            message: 'x'
          ]
          type: 'upcoming_delivery'
        ]
      )
    else
      callback(null, false)
  transition

vows.describe('test receiving pnc reports').addBatch(
  'filter generated from transition':
    topic: ->
      filter = undefined
      eval("""filter = #{getTransition().filter} """)
    'filter should work with right form patient_id and clinic': (filter) ->
      filter(
        form: 'ODGR'
        related_entities:
          clinic: {}
        patient_id: 'AA'
      ).should.eql(true)
    'filter should require right form': (filter) ->
      filter(
        related_entities:
          clinic: {}
        patient_id: 'AA'
      ).should.eql(false)
    'filter should require clinic': (filter) ->
      filter(
        form: 'ODGR'
      ).should.eql(false)
      filter(
        form: 'ODGR'
        related_entities:
          clinic: null
      ).should.eql(false)
  'updates registration':
    topic: ->
      getTransition(true)
    'report to parent phone': (transition) ->
      transition.complete = (err, doc) ->
        tasks = doc.tasks
        tasks.length.should.eql(2)
        to = tasks[1].messages[0].to.should.eql('345')
      transition.onMatch(
        doc:
          related_entities:
            clinic:
              contact:
                phone: '234'
              parent:
                contact:
                  phone: '345'
          patient_id: 'AA'
          danger_sign: '808'
      )
  'onMatch should add acknowledgement':
    topic: getTransition
    'add message': (transition) ->
      transition.complete = (err, doc) ->
        tasks = doc.tasks
        tasks.length.should.eql(1)
        message = tasks[0].messages[0].message
        message.should.eql('Thank you. Danger sign 808 has been recorded for Patient.')
      transition.onMatch(
        doc:
          patient_id: 'AA'
          danger_sign: '808'
      )
    'respond to invalid patient': (transition) ->
      transition.complete = (err, doc) ->
        tasks = doc.tasks
        tasks.length.should.eql(1)
        message = tasks[0].messages[0].message
        message.should.eql("No patient with id 'QQ' found.")
      transition.onMatch(
        doc:
          patient_id: 'QQ'
          danger_sign: '808'
      )
).export(module)
