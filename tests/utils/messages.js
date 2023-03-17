const utils = require('../utils');

const getQueuedMessages = () => utils.db
  .query('medic-admin/message_queue', { reduce: false, include_docs: true })
  .then(response => response.rows.map(row => row.doc));

const getTextedLoginLink = async (newUserSettings) => {
  const queuedMsgs = await getQueuedMessages();
  expect(queuedMsgs).to.have.lengthOf(1);
  const [queuedMsg] = queuedMsgs;
  expect(queuedMsg).to.deep.include({
    type: 'token_login', user: newUserSettings._id
  });
  const [{ to, message }] = queuedMsg.tasks[1].messages;
  expect(to).to.equal(newUserSettings.phone);
  return message;
};

module.exports = {
  getQueuedMessages,
  getTextedLoginLink,
};
