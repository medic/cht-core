const messaging = require('./messaging');
const ID = 'africas-talking';

const africasTalking = require('africastalking')({
  apiKey: 'XXXXXXXXXXX',
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

// TODO if enabled set up a changes listener so we can be really uber responsive

module.exports = {
  send: () => {
    if (!messaging.isEnabled(ID)) {
      return Promise.reject(`Africa's talking is not the configured SMS sender`);
    }
    return africasTalking.SMS.send({
      to: [ 'xxx' ],
      message: 'hello'
    })
    .then(res => {
      // TODO update message gateway_ref and status to "received-by-gateway"
      console.log(JSON.stringify(res, null, 2));
    });
  }
};
