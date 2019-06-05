const auth = require('../auth');
const messaging = require('../services/messaging');
const serverUtils = require('../server-utils');

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

const checkAuth = req => auth.check(req, 'can_access_gateway_api');

module.exports = {
  incomingMessages: (req, res) => {
    return checkAuth(req)
      .then(() => {
        const message = {
          id: req.body.id,
          from: req.body.from,
          content: req.body.text
        };
        return messaging.processIncomingMessages([ message ]);
      })
      .then(() => res.end())
      .catch(err => serverUtils.error(err, req, res));

    // console.log('INCOMING MESSAGE');
    // console.log(req.path);
    // console.log(JSON.stringify(req.headers));
    // console.log(req.body);

/*
{
  linkId: '8485a8ef-00bd-4ee4-9ade-a9488110d3a8',
  text: 'yup',
  to: '54619',
  id: '76311226-78da-44fa-bc40-76e3cfe14aae',
  date: '2019-06-04 09:30:56',
  from: '+64274622666'
}
*/
  },
  deliveryReports: (req, res) => {
    return checkAuth(req)
      .then(() => {
        const state = STATUS_CODES[req.body.status];
        if (!state) {
          return Promise.reject({
            code: 400,
            message: `Unknown status code: "${req.body.status}", gateway message reference: "${req.body.id}"`
          });
        }
        const update = {
          messageId: 'TODO',
          state: state,
          details: req.body.failureReason,
          gateway_ref: req.body.id
        };
        return messaging.updateMessageTaskStates([ update ]);
      })
      .then(() => res.end())
      .catch(err => serverUtils.error(err, req, res));
  },
};
