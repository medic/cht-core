const Factory = require('rosie').Factory;
const uuid = require('uuid');

const place = () => {
  return new Factory()
    .sequence('_id', uuid.v4)
    .attr('parent', '')
    .attr('type', '')
    .attr('is_name_generated', 'true')
    .attr('name', 'A Place 1')
    .attr('external_id', '')
    .attr('notes', '')
    .attr('place_id', uuid.v4)
    .attr('reported_date', () => new Date())
    .attr('contact');
};


const generatePlaces = (types = ['district_hospital', 'health_center', 'clinic']) => {
  return types.map((type, index) => {
    return place().build({
      name: `${type.replace('_', ' ')}${index}`,
      type: type,
    });
  });
};

const linkPlaces = (places) => {
  const linkedPlaces = new Map();
  places.forEach((place, index) => {
    const parent = places[index - 1] ? {
      _id: places[index - 1]._id,
      parent: {
        _id: places[index - 1].parent._id || ''
      }
    } : '';
    place.parent = parent;
    linkedPlaces.set(place.type, place);
  });
  return linkedPlaces;
};

const generateHierarchy = (types) => {
  const places = generatePlaces(types);
  const linkedPlaces = linkPlaces(places);
  return linkedPlaces;
};


module.exports = {
  generateHierarchy,
  place
};
