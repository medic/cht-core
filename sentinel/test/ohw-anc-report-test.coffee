vows = require('vows')
should = require('should')

{ transitions, Transition } = require('../transitions')

getTransition = ->
  transition = new Transition('ohw_anc_report', transitions.ohw_anc_report)
  transition.getOHWRegistration = (patient_id, callback) ->
    obsolete_date = new Date()
    obsolete_date.setDate(obsolete_date.getDate() + 20)

    okay_date = new Date()
    okay_date.setDate(okay_date.getDate() + 22)

    if patient_id is 'AA'
      callback(null,
        patient_name: 'Patient'
        scheduled_tasks: [
          {
            due: obsolete_date.getTime()
            marker: 'obsolete'
            state: 'scheduled'
            messages: []
            type: 'anc_visit'
          }
          {
            due: okay_date.getTime()
            marker: 'okay'
            state: 'scheduled'
            messages: []
            type: 'anc_visit'
          }
          {
            due: obsolete_date.getTime()
            marker: 'other'
            state: 'scheduled'
            messages: []
            type: 'other_thing'
          }
        ]
      )
    else
      callback(null, false)
  transition

vows.describe('test receiving anc reports').addBatch(
  'filter generated for anc reports':
    topic: ->
      filter = undefined
      transition = new Transition('ohw_anc_report', transitions.ohw_anc_report)
      eval("""filter = #{transition.filter} """)
    'filter should require a clinic': (filter) ->
      filter(
        form: 'OANC'
        related_entities:
          clinic: null
      ).should.eql(false)
    'filter should require the right form': (filter) ->
      filter(
        form: 'OQT'
        related_entities:
          clinic: {}
      ).should.eql(false)
    'filter should work with right form and clinic': (filter) ->
      filter(
        form: 'OANC'
        related_entities:
          clinic: {}
      ).should.eql(true)
  'onMatch adds acknowledgement':
    topic: getTransition
    'tasks added': (transition) ->
      transition.complete = (err, doc) ->
        doc.tasks.length.should.eql(1)
        task = doc.tasks[0]
        task.messages.length.should.eql(1)
        message = task.messages[0]
        message.to.should.eql('1234')
        message.message.should.eql('Thank you, foo. ANC counseling visit for Patient has been recorded.')
      transition.onMatch(
        doc:
          patient_id: 'AA'
          related_entities:
            clinic:
              contact:
                phone: '1234'
              name: 'foo'
      )
  'onMatch obsoletes messages':
    topic: getTransition
    'removes tasks for registration': (transition) ->
      transition.complete = (err, doc) ->
      transition.onMatch(
        doc:
          patient_id: 'AA'
          related_entities:
            clinic:
              contact:
                phone: '1234'
              name: 'foo'
      )
  'onMatch errors for unknown patient':
    topic: getTransition
    'tasks added': (transition) ->
      transition.complete = (err, doc) ->
        doc.tasks.length.should.eql(1)
        task = doc.tasks[0]
        task.messages.length.should.eql(1)
        message = task.messages[0]
        message.to.should.eql('1234')
        message.message.should.eql("No patient with id 'QQ' found.")

      transition.onMatch(
        doc:
          patient_id: 'QQ'
          related_entities:
            clinic:
              contact:
                phone: '1234'
              name: 'foo'
      )
).export(module)

