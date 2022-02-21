const chai = require('chai');
const uuid = require('uuid').v4;
const utils = require('../../utils');
const apiUtils = require('./utils');

const settings = {
  transitions: {
    registration: true,
  },
  forms: {
    SICK: {
      meta: {
        code: 'SICK',
        icon: '',
        translation_key: 'Im sick',
      },
      fields: {},
      public_form: true,
    }
  },
  registrations: [{
    form: 'SICK',
    events: [],
    messages: [{
      message: 'Await further instructions',
      event_type: 'report_accepted',
      recipient: 'reporting_unit',
    }]
  }]
};

const getPostOpts = (path, body) => ({
  path: path,
  method: 'POST',
  headers: { 'Content-Type':'application/json' },
  body: body
});

const postMessages = (messages) => {
  const watchChanges = apiUtils.getApiSmsChanges(messages);
  return Promise
    .all([
      watchChanges,
      utils.request(getPostOpts('/api/sms', { messages: messages }))
    ])
    .then(([changes]) => changes.map(change => change.id));
};

const getRecipient = doc => doc.tasks[0].messages[0].to;

describe('message duplicates', () => {
  after(() => utils.revertDb([], true));
  afterEach(() => utils.revertSettings(true));

  it('should mark as duplicate after 5 retries by default', () => {
    const message1 = {
      from: 'duplicate-phone',
      content: 'SICK'
    };

    const message2 = {
      from: 'other-phone',
      content: 'SICK'
    };

    const firstMessages = [
      Object.assign({ id: uuid() }, message1),
      Object.assign({ id: uuid() }, message2),
      Object.assign({ id: uuid() }, message1),
      Object.assign({ id: uuid() }, message1),
    ];

    const secondMessages = [
      Object.assign({ id: uuid() }, message1),
      Object.assign({ id: uuid() }, message2),
      Object.assign({ id: uuid() }, message1),
    ];

    const thirdMessages = [
      Object.assign({ id: uuid() }, message1),
      Object.assign({ id: uuid() }, message2),
      Object.assign({ id: uuid() }, message1),
    ];

    return utils
      .updateSettings(settings, true)
      .then(() => postMessages(firstMessages))
      .then(ids => utils.getDocs(ids))
      .then(docs => {
        docs.forEach(doc => {
          chai.expect(doc.tasks.length).to.equal(1);
          chai.expect(doc.tasks[0].messages.length).to.equal(1);

          const task = doc.tasks[0];
          chai.expect(task.messages[0]).to.include({ message: 'Await further instructions' });
          // we have no duplicate, 3x message1 + 1x message2
          chai.expect(task.state).to.equal('forwarded-to-gateway');
          chai.expect(task.state_history.length).to.equal(2);
        });
      })
      .then(() => postMessages(secondMessages))
      .then(ids => utils.getDocs(ids))
      .then(docs => {
        docs.forEach(doc => {
          chai.expect(doc.tasks.length).to.equal(1);
          chai.expect(doc.tasks[0].messages.length).to.equal(1);

          const task = doc.tasks[0];
          chai.expect(task.messages[0]).to.include({ message: 'Await further instructions' });
          // still no duplicates, 5x message1, 2x message2
          chai.expect(task.state).to.equal('forwarded-to-gateway');
          chai.expect(task.state_history.length).to.equal(2);
        });
      })
      .then(() => postMessages(thirdMessages))
      .then(ids => utils.getDocs(ids))
      .then(docs => {
        docs.forEach(doc => {
          chai.expect(doc.tasks.length).to.equal(1);
          chai.expect(doc.tasks[0].messages.length).to.equal(1);

          const recipient = getRecipient(doc);
          const task = doc.tasks[0];
          // message1 is duplicated (7x), message2 not duplicated (3x)
          if (recipient === message1.from) {
            chai.expect(task.messages[0]).to.include({ message: 'Await further instructions' });
            chai.expect(task.state).to.equal('duplicate');
            chai.expect(task.state_history.length).to.equal(1);
          } else {
            chai.expect(task.state).to.equal('forwarded-to-gateway');
            chai.expect(task.state_history.length).to.equal(2);
          }
        });
      });
  });

  it('should mark as duplicate using configured limit', () => {
    Object.assign(settings, { sms: { duplicate_limit: 3, outgoing_service: 'medic-gateway' } });
    const message = {
      from: 'new-duplicate-phone',
      content: 'SICK'
    };

    const firstMessages = [
      Object.assign({ id: uuid() }, message),
      Object.assign({ id: uuid() }, message),
      Object.assign({ id: uuid() }, message),
    ];

    const secondMessages = [
      Object.assign({ id: uuid() }, message),
      Object.assign({ id: uuid() }, message),
    ];

    return utils
      .updateSettings(settings, true)
      .then(() => postMessages(firstMessages))
      .then(ids => utils.getDocs(ids))
      .then(docs => {
        docs.forEach(doc => {
          if (doc.tasks.length > 1) {
            // this test has been flaking on GHA only (no repro locally)
            console.log(JSON.stringify(doc, null, 2));
          }
          chai.expect(doc.tasks.length).to.equal(1);
          chai.expect(doc.tasks[0].messages.length).to.equal(1);

          const task = doc.tasks[0];
          chai.expect(task.messages[0]).to.include({ message: 'Await further instructions' });
          // we have no duplicate, 3x message1
          chai.expect(task.state).to.equal('forwarded-to-gateway');
          chai.expect(task.state_history.length).to.equal(2);
        });
      })
      .then(() => postMessages(secondMessages))
      .then(ids => utils.getDocs(ids))
      .then(docs => {
        docs.forEach(doc => {
          chai.expect(doc.tasks.length).to.equal(1);
          chai.expect(doc.tasks[0].messages.length).to.equal(1);

          const task = doc.tasks[0];
          // message1 is duplicated (5x)
          chai.expect(task.messages[0]).to.include({ message: 'Await further instructions' });
          chai.expect(task.state).to.equal('duplicate');
          chai.expect(task.state_history.length).to.equal(1);
        });
      });
  });
});
