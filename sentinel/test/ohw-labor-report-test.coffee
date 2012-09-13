vows = require('vows')
should = require('should')
_ = require('underscore')

{ transitions, Transition } = require('../transitions')

getTransition = (danger_signs = []) ->
  transition = new Transition('ohw_labor_report', transitions.ohw_labor_report)
  transition.db =
    saveDoc: (registration, callback) ->
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
        danger_signs: danger_signs
      )
    else
      callback(null, false)
  transition

vows.describe('test receiving birth reports').addBatch(
  'filter generated from transition':
    topic: ->
      filter = undefined
      eval("""filter = #{getTransition().filter} """)
    'filter should work with right form patient_id and clinic': (filter) ->
      filter(
        form: 'OLAB'
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
        form: 'OLAB'
      ).should.eql(false)
      filter(
        form: 'OLAB'
        related_entities:
          clinic: null
      ).should.eql(false)
    'filter should not run if transition already applied': (filter) ->
      filter(
        form: 'OLAB'
        related_entities:
          clinic: {}
        patient_id: 'AA'
        transitions: [ 'ohw_labor_reporter' ]
      ).should.eql(true)
      filter(
        form: 'OLAB'
        related_entities:
          clinic: {}
        patient_id: 'AA'
        transitions: [ 'ohw_labor_report' ]
      ).should.eql(false)
  'onMatch no danger':
    topic: ->
      getTransition()
    'adds messages': (transition) ->
      transition.complete = (err, doc) ->
        { tasks } = doc
        tasks.length.should.eql(1)
        message = tasks[0].messages[0].message
        /after baby/.test(message).should.be.ok
      transition.onMatch(
        doc:
          patient_id: 'AA'
      )
    'invalid patient': (transition) ->
      transition.complete = (err, doc) ->
        { tasks } = doc
        tasks.length.should.eql(1)
        message = tasks[0].messages[0].message
        message.should.eql("No patient with id 'QQ' found.")
      transition.onMatch(
        doc:
          patient_id: 'QQ'
      )
  'onMatch with danger signs':
    topic: ->
      getTransition([55])
    'adds messages': (transition) ->
      transition.complete = (err, doc) ->
        { tasks } = doc
        tasks.length.should.eql(2)
        /high-risk/.test(tasks[0].messages[0].message).should.be.ok
        tasks[0].messages[0].to.should.eql('123')
        /high-risk/.test(tasks[1].messages[0].message).should.be.ok
        /has reported/.test(tasks[1].messages[0].message).should.be.ok
        tasks[1].messages[0].to.should.eql('234')
      transition.onMatch(
        doc:
          patient_id: 'AA'
      )
).export(module)
