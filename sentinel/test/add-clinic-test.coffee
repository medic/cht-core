vows = require('vows')
should = require('should')

{ transitions, Transition } = require('../transitions')


vows.describe('test adding clinic details').addBatch(
  'filter generated':
    topic: ->
      filter = undefined
      transition = new Transition('add_clinic', transitions.add_clinic)
      eval("""filter = #{transition.filter} """)
    'filter should trip on doc with form and no clinic': (filter) ->
      filter(
        form: 'ORPT'
        related_entities:
          clinic: null
      ).should.eql(true)
    'filter should not trip on doc without form': (filter) ->
      filter(
        related_entities:
          clinic: null
      ).should.eql(false)
    'filter should not trip on doc with form and truthy clinic': (filter) ->
      filter(
        form: 'ZZ'
        related_entities:
          clinic: {}
      ).should.eql(false)
  'onMatch with data':
    topic: ->
      transition = new Transition('add_clinic', transitions.add_clinic)
      transition.db =
        view: (db, view, args, fn) ->
          fn(null,
            rows: [
              value:
                _id: 1
                _rev: 1
                name: 'x'
            ]
          )
      transition
    'gets clinic': (transition) ->
      transition.complete = (err, doc) ->
        doc.related_entities.clinic.name.should.eql('x')
      transition.onMatch(
        doc:
          from: '1'
          related_entities:
            clinic: null
      )
  'onMatch with no matching row':
    topic: ->
      transition = new Transition('add_clinic', transitions.add_clinic)
      transition.db =
        view: (db, view, args, fn) ->
          fn(null,
            rows: [ ]
          )
      transition
    'gets clinic': (transition) ->
      transition.complete = (err, doc) ->
        should.not.exist(err)
        doc.should.not.be.ok
      transition.onMatch(
        doc:
          from: '1'
          related_entities:
            clinic: null
      )
).export(module)
