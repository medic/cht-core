const africasTalking = require('africastalking')({
  apiKey: '9892f0a4fa88c9ce03ed6b5500e820afa99090caa6eb74e8351bccd961215140',
  username: 'sandbox'
  /*, sandbox: true*/
});

// Map from Africa's Talking status codes to ours
// https://build.at-labs.io/docs/sms%2Fnotifications
// https://github.com/medic/medic-docs/blob/master/user/message-states.md
const STATUS_CODES = {
  // Sent: The message has successfully been sent by our network.
  Sent: 'forwarded-by-gateway',

  // Submitted: The message has successfully been submitted to the MSP (Mobile Service Provider).
  Submitted: 'sent',

  // Buffered: The message has been queued by the MSP.
  Buffered: 'sent',

  // Rejected: The message has been rejected by the MSP. This is a final status.
  Rejected: 'failed',

  // Success: The message has successfully been delivered to the receiver's handset. This is a final status.
  Success: 'delivered',

  // Failed: The message could not be delivered to the receiver's handset. This is a final status.
  Failed: 'failed'
};

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
        console.log(JSON.stringify(res, null, 2));
        return {
          success: true,
          gateway_ref: 'TODO',
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
