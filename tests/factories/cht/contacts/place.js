const Factory = require('rosie').Factory;
const uuid = require('uuid');

Factory.define('place')
  .sequence('_id', uuid.v4)
  .attr('parent', '')
  .attr('type', '')
  .attr('is_name_generated', 'true')
  .attr('name', 'A Place 1')
  .attr('external_id', '')
  .attr('notes', '')
  .attr('place_id', uuid.v4)
  .attr('reported_date', () => new Date());


const generateHierarchy = (types = ['district_hospital', 'health_center', 'clinic']) => {
  const places = [];

  types.forEach((type, index) => {
    const parent = places[index - 1] ? {
      _id: places[index - 1]._id,
      parent: {
        _id: places[index - 1].parent._id || ''
      }
    } : '';
    places.push(Factory.build('place', {
      name: `${type.replace('_', ' ')}${index}`,
      type: type,
      parent: parent
    }));
  });
  return places;
};


module.exports = {
  generateHierarchy
};
