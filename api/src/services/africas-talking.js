const africasTalking = require('africastalking')({
  apiKey: '9892f0a4fa88c9ce03ed6b5500e820afa99090caa6eb74e8351bccd961215140',
  username: 'sandbox'
  /*, sandbox: true*/
});

module.exports = {
  /**
   * Given an array of messages returns a promise which resolves an array
   * of responses.
   * @param messages An Array of objects with a `to` String and a `message` String.
   * @return A Promise which resolves an Array of responses with a `state` String
   *   and a `gateway_ref` String and a `success` boolean, or an `error` Object if
   *   the request errored for any reason.
   *   The responses are in the order in which the messages were recieved. 
   */
  send: messages => {
    return Promise.all(messages.map(message => {
      return africasTalking.SMS.send({
        to: [ message.to ], // TODO get international format for phone number
        message: message.content
      })
      .then(res => {
        return {
          success: true,
          gateway_ref: res.recipients[0].messageId, // TODO test
          state: 'received-by-gateway'
        };
      })
      .catch(err => {
        return {
          success: false,
          error: err
        };
      });
    }));
  }
};
