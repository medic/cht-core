const Factory = require('rosie').Factory;
const uuid = require('uuid');
const assesmentFactory = require('./assessment');
const pregnancyFactory = require('./pregnancy');
const assesmentFollowUpFactory = require('./assessment-follow-up');

const survey = () => {
  return new Factory()
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
};

const generateSurvey = (form, parentPlace, place, patient) => {
  const contactParent = {
    _id: parentPlace.contact._id,
    parent: place.parent
  };

  return survey().build({
    form: form,
    contact: contactParent,
    from: parentPlace.contact.phone
  }, {
    patient: patient,
    contact: place
  });
};

module.exports = {
  generateSurvey,
  survey
};
