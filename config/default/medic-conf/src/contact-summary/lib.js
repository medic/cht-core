var contactSummary = require('contact-summary.templated.js');
var contactSummaryEmitter = require('./contact-summary-emitter');

module.exports = contactSummaryEmitter(contactSummary, contact, reports);
