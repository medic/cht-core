const Factory = require('rosie').Factory;
const uuid = require('uuid');
const householdSurveyFactory = require('./brac-household-survey');
const familydSurveyFactory = require('./brac-family-household-survey');
const pregnancyFactory = require('./brac-pregnancy');

const bracSurvey = () => {
  return new Factory()
    .sequence('_id', uuid.v4)
    .option('patient', '')
    .option('contact', '')
    .attr('form', '') //household_survey | pregnancy | family_survey | ...
    .attr('type', 'data_record')
    .attr('content_type', 'xml')
    .attr('reported_date', () => Date.now())
    .attr('contact', '')
    .attr('from', '') //user phone number
    .attr('fields', ['form', 'contact', 'patient'], (form, contact, patient) => {
      if (form === 'household_survey') {
        return householdSurveyFactory.build({}, { contact: contact });
      }
      if (form === 'family_survey') {
        return familydSurveyFactory.build({}, { contact: contact });
      }
      if (form === 'pregnancy') {
        return pregnancyFactory.build({}, { patient: patient, contact: contact });
      }
      //TODO continue with other kinds of reports
    })
    .attr('geolocation_log', '')
    .attr('geolocation', '');
};

const generateBracSurvey = (form, parentPlace, place, patient) => {
  const contactParent = {
    _id: parentPlace.contact._id,
    parent: place.parent
  };

  return bracSurvey().build({
    form: form,
    contact: contactParent,
    from: parentPlace.contact.phone
  }, {
    patient: patient,
    contact: place
  });
};

module.exports = {
  generateBracSurvey,
  bracSurvey
};
