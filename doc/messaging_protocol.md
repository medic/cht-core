# SMS message sending

## Interaction between medic-webapp and medic-gateway
[Medic-webapp](https://github.com/medic/medic-webapp) uses [medic-gateway](https://github.com/medic/medic-gateway)
to send SMS messages.

When a report comes in, [medic-sentinel](https://github.com/medic/medic-sentinel) adds the appropriate list of
scheduled messages (to be sent at a future date) to the report doc.

Periodically, sentinel checks for messages that need to be sent, and [sets their status to `pending`](https://github.com/medic/medic-sentinel/blob/master/schedule/due_tasks.js).

Periodically, the gateway pings the webapp over HTTP to get any messages that need to be sent.
and report on the status of the messages it's trying to send.
Webapp looks for messages with status `pending` and passes them along to gateway, and stores new statuses for messages based on gateway's status updates.

## Message statuses

Both webapp and gateway store statuses of the messages to keep track of the exchange.
They each have their set of statuses, which sometimes are called the same but do not mean the same thing. Watch out.

### Message statuses in medic-gateway
See [https://github.com/medic/medic-gateway#messages](https://github.com/medic/medic-gateway#messages)

### Message statuses in medic-webapp

Status           | Description
-----------------|-------------------
scheduled | The message will be sent, later. Nothing to do.
pending | The date at which the message should be sent has passed. The message status is [changed by sentinel](https://github.com/medic/medic-sentinel/blob/master/schedule/due_tasks.js) automatically.
forwarded-to-gateway | The message has been forwarded to medic-gateway.
received-by-gateway | medic-gateway has acked that it will send the message.
sent | medic-gateway has confirmed having sent the message.
delivered | medic-gateway has confirmed the message has been received by the recipient.

## Timeline of the protocol
Event | webapp status | gateway status
------|---------------|---------------
Report comes in | scheduled | ---
Due date to send the message passes | pending | ---
Gateway pings webapp and gets the message | forwarded-to-gateway | pending
Gateway confirms it got the message from webapp | received-by-gateway | pending
Gateway sends the message | received-by-gateway | sent
Gateway reports having sent the message | sent | sent
Gateway gets report that message is received by recipient | sent | delivered
Gateway reports to webapp that message is received by recipient | delivered | delivered


Todo : what happens on failure?
