vows = require('vows')
should = require('should')
_ = require('underscore')

{ transitions, Transition } = require('../transitions')

getTransition = (properties, task_count = 0) ->
  transition = new Transition('ohw_birth_report', transitions.ohw_birth_report)
  transition.db =
    saveDoc: (registration, callback) ->
      _.each(properties, (property, key) ->
        should.exist(registration[key])
        registration[key].should.eql(property)
      )
      unless task_count is 0
        transition.filterScheduledMessages(registration, 'pnc_visit').length.should.eql(task_count)
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
        form: 'OBIR'
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
        form: 'OBIR'
      ).should.eql(false)
      filter(
        form: 'OBIR'
        related_entities:
          clinic: null
      ).should.eql(false)
  'onMatch should add acknowlegement for notnormal weight':
    topic: ->
      birth_date = new Date()
      birth_date.setHours(0,0,0,0)
      birth_date.setDate(birth_date.getDate() - 2)
      getTransition(child_outcome: 'Alive but sick', child_birth_weight: 'Low - Yellow', child_birth_date: birth_date.getTime(), 5)
    'normal weight': (transition) ->
      transition.complete = (err, doc) ->
        tasks = doc.tasks
        tasks.length.should.eql(2)
        /low birth weight/.test(tasks[0].messages[0].message).should.be.ok
        /Low - Yellow birth weight/.test(tasks[1].messages[0].message).should.be.ok
      transition.onMatch(
        doc:
          outcome_child: 'Alive but sick'
          patient_id: 'AA'
          days_since_delivery: 2
          reported_date: new Date().getTime()
          birth_weight: 'Low - Yellow'
      )
  'onMatch should add normal acknowledgement and reminders':
    topic: ->
      birth_date = new Date()
      birth_date.setHours(0,0,0,0)
      birth_date.setDate(birth_date.getDate() - 2)
      getTransition(child_outcome: 'Alive but sick', child_birth_weight: 'Normal', child_birth_date: birth_date.getTime(), 2)
    'normal weight': (transition) ->
      transition.complete = (err, doc) ->
        tasks = doc.tasks
        tasks.length.should.eql(1)
        /Thank you, foo/.test(tasks[0].messages[0].message).should.be.ok
      transition.onMatch(
        doc:
          outcome_child: 'Alive but sick'
          patient_id: 'AA'
          days_since_delivery: 2
          reported_date: new Date().getTime()
          birth_weight: 'Normal'
      )
  'onMatch should add deceased acknowledgement':
    topic: getTransition(child_outcome: 'Deceased')
    'for deceased': (transition) ->
      transition.complete = (err, doc) ->
        tasks = doc.tasks
        tasks.length.should.eql(2)
        message = tasks[0].messages[0]
        message.message.should.eql('Thank you for your report.')
        message.to.should.eql('123')
        parent_message = tasks[1].messages[0]
        parent_message.message.should.eql('foo has reported the child of Patient as deceased.')
        parent_message.to.should.eql('234')
      transition.onMatch(
        doc:
          outcome_child: 'Deceased'
          patient_id: 'AA'
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
      )
).export(module)
