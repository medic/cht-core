const Factory = require('rosie').Factory;
const uuid = require('uuid');

const parent = { 
  _id: 'hc1',
  parent: {
    _id: 'dist1'
  } 
};

Factory.define('chtClinic')
  .sequence('_id',uuid.v4)
  .attr('parent', parent)
  .attr('type', 'clinic')
  .attr('is_name_generated', 'true')
  .attr('name', 'Househould 1')
  .attr('external_id', '')
  .attr('notes', '')
  .attr('place_id', '19770')
  .attr('reported_date', () => new Date());
