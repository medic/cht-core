const Factory = require('rosie').Factory;
const uuid = require('uuid');

module.exports = new Factory()
  .sequence('_id', uuid.v4)
  .attr('type', 'district_hospital')
  .attr('is_name_generated', 'true')
  .attr('name', 'A Place 1')
  .attr('phone', '+1123123133')
  .attr('external_id', 'DH-01')
  .attr('address', '35 Lindor ST, Emery Town, NY. 10001')
  .attr('notes', 'Built in 1980')
  .attr('place_id', uuid.v4)
  .attr('contact', '');
