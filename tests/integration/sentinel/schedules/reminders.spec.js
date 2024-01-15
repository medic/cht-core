const utils = require('@utils');
const chai = require('chai');
const moment = require('moment');

const contacts = [
  {
    _id: 'PARENT',
    name: 'PARENT',
    type: 'contact',
    contact_type: 'tier1',
    contact: { _id: 'contact1', parent: { _id: 'PARENT' } },
  },
  {
    _id: 'contact1',
    type: 'contact',
    contact_type: 'tier5',
    name: 'contact1',
    phone: 'phone1',
    parent: { _id: 'PARENT' },
  },
  {
    _id: 'leaf1', // will have reminder
    name: 'leaf1',
    type: 'contact',
    contact_type: 'tier2',
    parent: { _id: 'PARENT' },
    contact: { _id: 'contact2', parent: { _id: 'leaf1', parent: { _id: 'PARENT' } } },
  },
  {
    _id: 'contact2',
    type: 'contact',
    contact_type: 'tier5',
    name: 'contact2',
    phone: 'phone2',
    parent: { _id: 'leaf1', parent: { _id: 'PARENT' } },
  },
  {
    _id: 'leaf2', // no reminder because no contact
    name: 'leaf2',
    type: 'contact',
    contact_type: 'tier2',
    parent: { _id: 'PARENT' },
  },
  {
    _id: 'notleaf1', // no reminder because not a leaf
    name: 'notleaf1',
    type: 'contact',
    contact_type: 'tier3',
    parent: { _id: 'PARENT' },
    contact: { _id: 'contact4', parent: { _id: 'notleaf1', parent: { _id: 'PARENT' } } },
  },
  {
    _id: 'contact4',
    type: 'contact',
    contact_type: 'tier5',
    name: 'contact4',
    phone: 'phone4',
    parent: { _id: 'notleaf1', parent: { _id: 'PARENT' } },
  },
  {
    _id: 'notleaf2', // no reminder because not a leaf
    name: 'notleaf2',
    type: 'contact',
    contact_type: 'tier3',
    parent: { _id: 'PARENT' },
    contact: { _id: 'contact5', parent: { _id: 'notleaf2', parent: { _id: 'PARENT' } } },
  },
  {
    _id: 'contact5',
    type: 'contact',
    contact_type: 'tier5',
    name: 'contact5',
    phone: 'phone5',
    parent: { _id: 'notleaf2', parent: { _id: 'PARENT' } },
  },
  {
    _id: 'leaf3', // has reminder
    name: 'leaf3',
    type: 'contact',
    contact_type: 'tier4',
    parent: { _id: 'notleaf1', parent: { _id: 'PARENT' } },
    contact: { _id: 'contact6', parent: { _id: 'leaf3', parent: { _id: 'notleaf1', parent: { _id: 'PARENT' } } } },
  },
  {
    _id: 'contact6',
    contact_type: 'tier5',
    type: 'contact',
    name: 'contact6',
    phone: 'phone6',
    parent: { _id: 'leaf3', parent: { _id: 'notleaf1', parent: { _id: 'PARENT' } } },
  },
  {
    _id: 'leaf4', // no reminder because muted
    name: 'leaf4',
    contact_type: 'tier4',
    type: 'contact',
    muted: 'sometime last week',
    parent: { _id: 'notleaf2', parent: { _id: 'PARENT' } },
    contact: { _id: 'contact7', parent: { _id: 'leaf4', parent: { _id: 'notleaf2', parent: { _id: 'PARENT' } } } },
  },
  {
    _id: 'contact7',
    contact_type: 'tier5',
    type: 'contact',
    name: 'contact7',
    phone: 'phone7',
    parent: { _id: 'leaf4', parent: { _id: 'notleaf2', parent: { _id: 'PARENT' } } },
  },
  {
    _id: 'person1',
    name: 'person1',
    contact_type: 'tier5',
    type: 'contact',
    parent: { _id: 'leaf4', parent: { _id: 'notleaf2', parent: { _id: 'PARENT' } } }
  },
];
const contactTypes = [
  { id: 'tier1' },
  { id: 'tier2', parents: ['tier1'] }, // leaf
  { id: 'tier3', parents: ['tier1'] },
  { id: 'tier4', parents: ['tier3'] }, // leaf
  { id: 'tier5', parents: ['tier2', 'tier1', 'tier3', 'tier4'], person: true },
];

const start = moment().utc();
// because the later.schedule results are dependent on when the test runs, we can't use "every x seconds" expressions
// and expect the same results
const momentToTextExpression = date => `at ${date.format('HH:mm')} on ${date.format('ddd')}`;

const remindersConfig = [
  {
    form: 'FORM1',
    text_expression: momentToTextExpression(start.clone().subtract(1, 'hour')),
    message: '{{name}} should do something'
  },
  {
    form: 'FORM2',
    text_expression: momentToTextExpression(start.clone().subtract(5, 'minute')),
    mute_after_form_for: '2 days',
    message: 'something do should {{name}}'
  },
];
const forms = {
  FORM1: {
    meta: { code: 'FORM1' },
    fields: { param: { position: 0, type: 'string' } }
  },
  FORM2: {
    meta: { code: 'FORM2' },
    fields: { param: { position: 0, type: 'string' } }
  },
};
const transitions = { update_clinics: true };

const getReminderLogs = (expectedLogs) => {
  const opts = {
    startkey: 'reminderlog:',
    endkey: 'reminderlog:\ufff0',
    include_docs: true
  };
  return utils.sentinelDb.allDocs(opts).then(result => {
    if (result.rows.length >= expectedLogs) {
      return result;
    }

    return new Promise(resolve => setTimeout(resolve, 200)).then(() => getReminderLogs(expectedLogs));
  });
};

const getReminderDocs = () => {
  const opts = {
    startkey: 'reminder:',
    endkey: 'reminder:\ufff0',
    include_docs: true
  };

  return utils.db.allDocs(opts);
};

const leaf1 = contacts[2];
const leaf3 = contacts[9];

const assertReminder = ({ form, reminder, place, message }) => {
  chai.expect(reminder).to.deep.include({
    contact: place.contact,
    place: { _id: place._id, parent: place.parent },
    form: form,
    type: 'reminder'
  });
  chai.expect(reminder.tasks).to.have.lengthOf(1);
  chai.expect(reminder.tasks[0]).to.deep.include({
    state: 'pending',
    form: form,
    type: 'reminder'
  });
  const contact = contacts.find(c => c._id === place.contact._id);
  chai.expect(reminder.tasks[0].messages[0]).to.deep.include({
    to: contact.phone,
    message: message
  });
};

const restartSentinel = () => utils.stopSentinel().then(() => utils.startSentinel());

describe('reminders', () => {
  before(() => {
    return utils
      .updateSettings({ transitions, forms, 'contact_types': contactTypes, reminders: remindersConfig }, 'sentinel')
      .then(() => utils.saveDocs(contacts));
  });

  after(() => utils.revertDb([], true));

  it('should create reminders', () => {
    let reminder1Date;
    let reminder2Date;
    let reminder2Date2;
    let reminder2Date3;
    return restartSentinel()
      .then(() => getReminderLogs(2))
      .then(({ rows: reminderLogs }) => {
        chai.expect(reminderLogs[0].id.startsWith('reminderlog:FORM1:')).to.be.true;
        chai.expect(reminderLogs[0].doc.reminder).to.deep.equal(remindersConfig[0]);
        chai.expect(reminderLogs[1].id.startsWith('reminderlog:FORM2:')).to.be.true;
        chai.expect(reminderLogs[1].doc.reminder).to.deep.equal(remindersConfig[1]);

        reminder1Date = reminderLogs[0].id.split(':')[2];
        reminder2Date = reminderLogs[1].id.split(':')[2];
      })
      .then(() => getReminderDocs())
      .then(result => {
        const reminderDocs = result.rows.map(row => row.doc);
        const reminderDocIds = reminderDocs.map(doc => doc._id);

        chai.expect(reminderDocIds).to.have.members([
          `reminder:FORM1:${reminder1Date}:leaf1`,
          `reminder:FORM2:${reminder2Date}:leaf1`,
          `reminder:FORM1:${reminder1Date}:leaf3`,
          `reminder:FORM2:${reminder2Date}:leaf3`,
        ]);

        assertReminder({
          form: 'FORM1',
          reminder: result.rows.find(row => row.id === `reminder:FORM1:${reminder1Date}:leaf1`).doc,
          place: leaf1,
          message: 'leaf1 should do something'
        });

        assertReminder({
          form: 'FORM2',
          reminder: result.rows.find(row => row.id === `reminder:FORM2:${reminder2Date}:leaf1`).doc,
          place: leaf1,
          message: 'something do should leaf1'
        });

        assertReminder({
          form: 'FORM1',
          reminder: result.rows.find(row => row.id === `reminder:FORM1:${reminder1Date}:leaf3`).doc,
          place: leaf3,
          message: 'leaf3 should do something'
        });

        assertReminder({
          form: 'FORM2',
          reminder: result.rows.find(row => row.id === `reminder:FORM2:${reminder2Date}:leaf3`).doc,
          place: leaf3,
          message: 'something do should leaf3'
        });
      })
      .then(() => utils.revertSettings(true))
      .then(() => {
        remindersConfig[1].text_expression = momentToTextExpression(start.clone().subtract(3, 'minute'));
        return utils.updateSettings(
          { transitions, forms, 'contact_types': contactTypes, reminders: remindersConfig },
          true
        );
      })
      .then(() => restartSentinel())
      .then(() => getReminderLogs(3))
      .then(({ rows: reminderLogs }) => {
        // Only the 2nd reminder ran. Because reminders are executed in a series, we know that 1st reminder was skipped
        // once we get a log for the 2nd reminder. It's just a hack because we have no way of knowing that the
        // "scheduler" code has completed.
        chai.expect(reminderLogs).to.have.lengthOf(3);
        chai.expect(reminderLogs[0].id).to.equal(`reminderlog:FORM1:${reminder1Date}`);
        chai.expect(reminderLogs[0].value.rev.startsWith('1-')).to.be.true;
        chai.expect(reminderLogs[1].id).to.equal(`reminderlog:FORM2:${reminder2Date}`);
        chai.expect(reminderLogs[1].value.rev.startsWith('1-')).to.be.true;

        chai.expect(reminderLogs[2].id.startsWith('reminderlog:FORM2:')).to.be.true;
        chai.expect(reminderLogs[2].doc.reminder).to.deep.equal(remindersConfig[1]);
        reminder2Date2 = reminderLogs[2].id.split(':')[2];
      })
      .then(() => getReminderDocs())
      .then(result => {
        const reminderDocs = result.rows.map(row => row.doc);
        const reminderDocIds = reminderDocs.map(doc => doc._id);

        chai.expect(reminderDocIds).to.have.members([
          `reminder:FORM1:${reminder1Date}:leaf1`,
          `reminder:FORM2:${reminder2Date}:leaf1`,
          `reminder:FORM1:${reminder1Date}:leaf3`,
          `reminder:FORM2:${reminder2Date}:leaf3`,
          // and the 2 new reminders
          `reminder:FORM2:${reminder2Date2}:leaf1`,
          `reminder:FORM2:${reminder2Date2}:leaf3`,
        ]);

        // we are asserting that the messages are "pending", even if they're exact duplicates
        // lists of duplicates are saved in memory in Sentinel, by restarting we effectively lose track of them
        assertReminder({
          form: 'FORM2',
          reminder: result.rows.find(row => row.id === `reminder:FORM2:${reminder2Date2}:leaf1`).doc,
          place: leaf1,
          message: 'something do should leaf1'
        });
        assertReminder({
          form: 'FORM2',
          reminder: result.rows.find(row => row.id === `reminder:FORM2:${reminder2Date2}:leaf3`).doc,
          place: leaf3,
          message: 'something do should leaf3'
        });

        // all reminders are on 1st rev
        chai.expect(reminderDocs.every(doc => doc._rev.startsWith('1-'))).to.be.true;
      })
      .then(() => utils.request({ path: '/api/sms', method: 'POST', headers: { 'Content-Type': 'application/json' } }))
      .then(smsMessages => {
        // 6 reminders have 6 messages
        chai.expect(smsMessages.messages).to.have.lengthOf(6);
        const messagesByPhone = {};
        smsMessages.messages.forEach(message => {
          messagesByPhone[message.to] = messagesByPhone[message.to] || [];
          messagesByPhone[message.to].push(message.content);
        });
        Object.keys(messagesByPhone).forEach(phone => {
          const contact = contacts.find(c => c.phone === phone);
          const place = contacts.find(c => c.contact?._id === contact._id);
          chai.expect(messagesByPhone[phone]).to.have.lengthOf(3);
          chai.expect(messagesByPhone[phone]).to.have.members([
            `something do should ${place.name}`,
            `something do should ${place.name}`,
            `${place.name} should do something`
          ]);
        });
      })
      .then(() => getReminderDocs())
      .then(result => {
        const reminderDocs = result.rows.map(row => row.doc);
        // every doc should still have exactly one task
        reminderDocs.forEach(reminderDoc => {
          chai.expect(reminderDoc.tasks).to.have.lengthOf(1);
          chai.expect(reminderDoc._rev.startsWith('2-')).to.be.true;
          chai.expect(reminderDoc.tasks[0].state).to.equal('forwarded-to-gateway');
          chai.expect(reminderDoc.tasks[0].state_history).to.have.lengthOf(2);
        });
      })
      .then(() => {
        // submit a "form" that would silence one of the contacts for next reminder
        const leaf3Contact = contacts.find(c => c._id === leaf3.contact._id);
        const message = {
          content: 'FORM2 whatever',
          from: leaf3Contact.phone,
          id: 'random gateway uuid'
        };
        return utils.request({
          path: '/api/sms',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { messages: [message] }
        });
      })
      .then(() => utils.revertSettings(true))
      .then(() => {
        remindersConfig[1].text_expression = momentToTextExpression(start.clone().subtract(1, 'minute'));
        return utils.updateSettings(
          { transitions, forms, 'contact_types': contactTypes, reminders: remindersConfig },
          true
        );
      })
      .then(() => restartSentinel())
      .then(() => getReminderLogs(4))
      .then(({ rows: reminderLogs }) => {
        chai.expect(reminderLogs).to.have.lengthOf(4);
        reminderLogs.forEach(log => chai.expect(log.doc._rev.startsWith('1-')).to.be.true);
        chai.expect(reminderLogs.filter(log => log.id.startsWith('reminderlog:FORM2:'))).to.have.lengthOf(3);
        chai.expect(reminderLogs[3].doc.reminder).to.deep.equal(remindersConfig[1]);
        reminder2Date3 = reminderLogs[3].id.split(':')[2];
      })
      .then(() => getReminderDocs())
      .then(result => {
        // we expect only one new reminder, since leaf3 has a sent_form for FORM2
        const reminderDocs = result.rows.map(row => row.doc);
        const reminderDocIds = reminderDocs.map(doc => doc._id);

        chai.expect(reminderDocIds).to.have.members([
          `reminder:FORM1:${reminder1Date}:leaf1`,
          `reminder:FORM2:${reminder2Date}:leaf1`,
          `reminder:FORM1:${reminder1Date}:leaf3`,
          `reminder:FORM2:${reminder2Date}:leaf3`,
          `reminder:FORM2:${reminder2Date2}:leaf1`,
          `reminder:FORM2:${reminder2Date2}:leaf3`,
          // the one new reminder
          `reminder:FORM2:${reminder2Date3}:leaf1`,
        ]);

        // we are asserting that the messages are "pending", even if they're exact duplicates
        // lists of duplicates are saved in memory in Sentinel, by restarting we effectively lose track of them
        assertReminder({
          form: 'FORM2',
          reminder: result.rows.find(row => row.id === `reminder:FORM2:${reminder2Date3}:leaf1`).doc,
          place: leaf1,
          message: 'something do should leaf1'
        });
      });
  });
});
