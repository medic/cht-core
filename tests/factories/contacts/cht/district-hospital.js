const Factory = require('rosie').Factory;

Factory.define('cht_district_hospital')
  .attr('_id', 'dist1')
  .attr('type', 'district_hospital')
  .attr('is_name_generated', 'true')
  .attr('name', 'District Hospital 1')
  .attr('external_id', 'external id 1')
  .attr('notes', 'This is a note')
  .attr('place_id', '04789')
  .attr('reported_date', Date.now());

