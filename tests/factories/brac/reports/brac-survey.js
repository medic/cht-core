const Factory = require('rosie').Factory;
const uuid = require('uuid');
const assesmentFactory = require('./brac-assessment');
const pregnancyFactory = require('./brac-pregnancy');
const assesmentFollowUpFactory = require('./brac-assessment-follow-up');

const bracSurvey = new Factory()
  .sequence('_id', uuid.v4)
  .option('patient', '')
  .option('contact', '')
  .attr('form', '')
  .attr('type', 'data_record')
  .attr('content_type', 'xml')
  .attr('reported_date', () => Date.now())
  .attr('contact', '')
  .attr('from', '')
  .attr('fields', ['form', 'contact', 'patient'], (form, contact, patient) => {
    if (form === 'assesment') {
      return assesmentFactory.build({}, { patient: patient, contact: contact });
    }
    if (form === 'pregnancy') {
      return pregnancyFactory.build({}, { patient: patient, contact: contact });
    }
    if (form === 'assesment_follow_up') {
      return assesmentFollowUpFactory.build({}, { patient: patient, contact: contact });
    }
  })
  .attr('geolocation_log', '')
  .attr('geolocation', '');

const generateBracSurvey = (form, parent, patient) => {
  const contact = {
    _id: parent.contact._id,
    parent: { _id: parent._id, parent: parent.parent },
  };

  return bracSurvey.build({ form, contact, from: parent.contact.phone }, { patient, contact });
};

module.exports = {
  generateBracSurvey,
  bracSurvey
};
