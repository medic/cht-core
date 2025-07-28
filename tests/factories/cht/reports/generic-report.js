const Factory = require('rosie').Factory;
const uuid = require('uuid');

const minify = parent => {
  if (!parent || !parent._id) {
    return parent;
  }

  const result = { _id: parent._id };
  let minified = result;
  while (parent && parent.parent) {
    minified.parent = { _id: parent.parent._id };
    minified = minified.parent;
    parent = parent.parent;
  }

  return result;
};

const report = () => {
  return new Factory()
    .option('patient', null)
    .option('place', null)
    .option('submitter', null)
    .sequence('_id', uuid.v4)
    .attrs({
      type: 'data_record',
      reported_date: () => new Date().getTime(),
    })
    .attr('contact', ['submitter'], submitter => {
      if (!submitter) {
        return;
      }
      return minify(submitter);
    })
    .attr('fields', ['patient', 'place', 'fields'], (patient, place, fields) => {
      fields = fields || {};
      if (patient) {
        fields.patient_id = patient.patient_id;
        fields.patient_uuid = patient._id;
      }
      if (place) {
        fields.place_id = place.place_id || place._id;
      }

      return fields;
    });
};

const reportWithTasks = () => {
  return new Factory()
    .sequence('_id', uuid.v4)
    .attr('type', 'data_record')
    .attr('form', 'a')
    .attr('reported_date', () => Date.now())
    .attr('errors', [])
    .attr('tasks', [{
      messages: [{ to: 'phone', message: 'Test message', uuid: 'uuid' }],
      gateway_ref: 'gateway_ref',
      state: 'received-by-gateway',
    }]);
};

module.exports = {
  report,
  reportWithTasks,
};
