const Factory = require('rosie').Factory;


Factory.define('cht_health_center')
  .attr('_id','hc1')
  .attr('parent', { _id: 'dist1' })
  .attr('type', 'health_center')
  .attr('is_name_generated', 'true')
  .attr('name', 'Health Center 1')
  .attr('external_id', '')
  .attr('notes', '')
  .attr('place_id', '03645')
  .attr('reported_date', Date.now());

