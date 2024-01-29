const testUtils = require('@utils');
const uuid = require('uuid').v4;

const CHW_CONTACT_NUMBER = '+32049832049';

const get = () => {
  return testUtils.request({
    path: '/api/sms',
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
};

const post = (body) => {
  return testUtils.request({
    path: '/api/sms',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body,
  });
};

const postMessage = (...messages) => {
  return postMessages(...messages);
};

const postMessages = (...messages) => {
  return post({ messages });
};

const postStatus = (messageId, newStatus) => {
  return postStatuses({ id: messageId, status: newStatus });
};

const postStatuses = (...updates) => {
  return post({ updates });
};

const saveWoMessage = (id, content) => {
  return saveWoMessages({ id, content });
};

const saveWoMessages = (...details) => {
  return testUtils.db.bulkDocs(details.map(d => createWoMessage(d.id, d.content)));
};

const createWoMessage = (id, content) => {
  const task = {
    messages: [
      {
        from: '+123',
        sent_by: 'some name',
        to: CHW_CONTACT_NUMBER,
        contact: {},
        message: content,
        uuid: id,
      }
    ]
  };

  const messageDoc = {
    _id: uuid(),
    errors: [],
    form: null,
    from: '+123',
    reported_date: 1520416423761,
    tasks: [ task ],
    kujua_message: true,
    type: 'data_record',
    sent_by: 'some name',
  };

  return messageDoc;
};

const getMessageStates = () => {
  return allMessageDocs()
    .then(docs => docs.reduce((acc, doc) => {
      doc.tasks.forEach(task => task.messages.forEach(m => {
        const states = task.state_history &&
                       task.state_history.map(h => h.state);
        acc.push({ id: m.uuid, states });
      }));
      return acc;
    }, []));
};

const getMessageContents = () => {
  return allMessageDocs()
    .then(docs => docs.reduce((acc, doc) => {

      if (doc.kujua_message) {
        doc.tasks.forEach(task => task.messages.forEach(m => acc.push(m.message)));
      }

      if (doc.sms_message) {
        acc.push(doc.sms_message.message);
      }

      return acc;
    }, []));
};

const allMessageDocs = () => {
  return testUtils.db.query('medic-client/messages_by_contact_date',
    { reduce: false, include_docs: true })
    .then(res => res.rows.map(row => row.doc));
};

module.exports = {
  api: {
    get: get,
    post: post,
    postMessage: postMessage,
    postMessages: postMessages,
    postStatus: postStatus,
    postStatuses: postStatuses,
  },
  db: {
    getMessageContents: getMessageContents,
    getMessageStates: getMessageStates,
  },
  setup: {
    saveWoMessage: saveWoMessage,
    saveWoMessages: saveWoMessages,
  },

  cleanUp: () => {
    // delete WO and WT messages
    return allMessageDocs()
      .then(docs => docs.map(doc => {
        doc._deleted = true;
        return doc;
      }))
      .then(docs => testUtils.db.bulkDocs(docs));
  },
};
