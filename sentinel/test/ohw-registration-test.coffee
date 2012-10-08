vows = require('vows')
should = require('should')
_ = require('underscore')
utils = require('../lib/utils')

{ transitions, Transition } = require('../transitions')

getTransition = (properties, task_count = 0) ->
  transition = new Transition('ohw_registration', transitions.ohw_registration)
  transition.db =
    saveDoc: (registration, callback) ->
      callback(null)
  transition

vows.describe('test receiving registrations').addBatch(
  'filter generated from transition':
    topic: ->
      filter = undefined
      eval("""filter = #{getTransition().filter} """)
    'filter should work with right form clinic': (filter) ->
      filter(
        form: 'ORPT'
        related_entities:
          clinic: {}
      ).should.eql(true)
    'filter should require right form': (filter) ->
      filter(
        related_entities:
          clinic: {}
      ).should.eql(false)
    'filter should require clinic': (filter) ->
      filter(
        form: 'ORPT'
      ).should.eql(false)
      filter(
        form: 'ORPT'
        related_entities:
          clinic: null
      ).should.eql(false)
    'filter should not run if transition already applied': (filter) ->
      filter(
        form: 'ORPT'
        related_entities:
          clinic: {}
        transitions: [ 'ohw_registrationer' ]
      ).should.eql(true)
      filter(
        form: 'OLAB'
        related_entities:
          clinic: {}
        transitions: [ 'ohw_registration' ]
      ).should.eql(false)
  'onMatch should add identifiers':
    topic: ->
      getTransition()
    'adds patient id': (transition) ->
      transition.complete = (err, doc) ->
        { patient_identifiers } = doc
        patient_identifiers.should.be.ok
        patient_identifiers.length.should.eql(1)
        /\d{7}/.test(patient_identifiers[0]).should.be.ok
      transition.onMatch(
        doc: {}
      )
    'adds lmp data': (transition) ->
      transition.complete = (err, doc) ->
        { expected_date, lmp_date } = doc
        lmp = new Date()
        lmp.setHours(0, 0, 0, 0)
        lmp.setDate(lmp.getDate() - (15 * 7))
        lmp_date.should.eql(lmp.getTime())

        expected = new Date(lmp.getTime())
        expected.setDate(expected.getDate() + (7 * 40))
        expected_date.should.eql(expected.getTime())

      transition.onMatch(
        doc:
          last_menstrual_period: 15
      )
    'adds anc visits for 17 weeks': (transition) ->
      transition.complete = (err, doc) ->
        utils.filterScheduledMessages(doc, 'anc_visit').length.should.eql(3)
      transition.onMatch(
        doc:
          last_menstrual_period: 17
      )
    'adds anc visits for 15 weeks': (transition) ->
      transition.complete = (err, doc) ->
        utils.filterScheduledMessages(doc, 'anc_visit').length.should.eql(4)
      transition.onMatch(
        doc:
          last_menstrual_period: 15
      )
    'adds other messages': (transition) ->
      transition.complete = (err, doc) ->
        utils.filterScheduledMessages(doc, 'miso_reminder').length.should.eql(1)
        utils.filterScheduledMessages(doc, 'upcoming_delivery').length.should.eql(1)
        utils.filterScheduledMessages(doc, 'outcome_request').length.should.eql(1)
        doc.tasks.length.should.eql(1)
      transition.onMatch(
        doc:
          last_menstrual_period: 15
      )
).export(module)

