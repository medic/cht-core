const Factory = require('rosie').Factory;
const uuid = require('uuid');
const person = require('../contacts/person');

const message = () => {
  return new Factory()
    .attr('to', '+64275555556')
    .attr('message', 'Thank you for registering Shannon. Their pregnancy ID is 28551, and EDD is Sun, Dec 18th, 2016')
    .sequence('uuid', uuid.v4);
};

const smsTask = () => {
  return new Factory()
    .sequence('_id', uuid.v4)
    .attr('messages', [message().build()])
    .attr('state', 'pending')
    .attr('state_history', [
      {
        state: 'pending',
        timestamp: '2016-08-04T02:24:48.578Z',
      },
    ]);
};

const smsScheduledTask = () => {
  return new Factory()
    .attr('due', '2016-08-28T21:00:00.000Z')
    .attr('group', 2)
    .attr('type', 'ANC Reminders LMP')
    .attr('messages', [message().build()])
    .attr('state', 'scheduled')
    .attr('state_history', [
      {
        state: 'scheduled',
        timestamp: '2016-08-04T02:24:48.569Z',
      }
    ]);
};

const reminderMsg = 'Please remind Shannon (28551) to visit the health facility for ANC visit this week. ' +
'When she does let us know with "V 28551". Thanks!';

const scheduled_tasks = [
  smsScheduledTask().build({
    messages: [message().build({
      message: reminderMsg
    })],
  }),
  smsScheduledTask().build({
    messages: [message().build({
      message: 'Did Shannon attend her ANC visit? When she does, respond with "V 28551". Thank you!'
    })],
    due: '2016-09-04T22:00:00.000Z',
  }),
  smsScheduledTask().build({
    group: 3,
    messages: [message().build({
      message: reminderMsg,
    })],
    due: '2016-10-23T20:00:00.000Z',
  })
];

const fields = {
  last_menstrual_period: 20,
  patient_name: 'Shannon',
};

const sms_message = {
  message_id: '4490',
  sent_timestamp: '1470277478632',
  message: '1!P!20#Shannon',
  from: '+64275555556',
  type: 'sms_message',
  form: 'P',
  locale: 'en',
};

const pregnancy = () => {
  return new Factory()
    .sequence('_id', uuid.v4)
    .attr('type', 'data_record')
    .attr('from', '+64275555556')
    .attr('form', 'P')
    .attr('tasks', [smsTask().build()])
    .attr('scheduled_tasks', scheduled_tasks)
    .attr('fields', fields)
    .attr('sms_message', sms_message)
    .attr('contact', person.build())
    .attr('errors', [])
    .attr('reported_date', () => Date.now())
    .attr('read', [])
    .attr('patient_id', '28551')
    .attr('lmp_date', '2016-03-12T11:00:00.000Z')
    .attr('expected_date', '2016-12-17T11:00:00.000Z');
};

module.exports = {
  pregnancy
};
