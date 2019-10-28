const getConfig = config => config.get('contact_types') || [];

const getTypeId = (doc) => doc && ((doc.type === 'contact' && doc.contact_type) || doc.type);

const getTypeById = (config, typeId) => getConfig(config).find(type => type.id === typeId);

const isPersonType = (config, typeId) => {
  const type = getTypeById(config, typeId);
  return type && type.person || typeId === 'person';
};

const isPlaceType = (config, typeId) => {
  const type = getTypeById(config, typeId);
  return type && !type.person;
};

const hasParents = (type) => !!(type && type.parents && type.parents.length);

const isParentOf = (config, parent, child) => {
  const parentType = getTypeById(config, getTypeId(parent));
  const childType = getTypeById(config, getTypeId(child));
  if (!parentType || !childType) {
    return false;
  }
  return !!(childType && childType.parents && childType.parents.includes(parentType.id));
};

// A leaf place type is a contact type that does not have any child place types, but can have child person types
const getLeafPlaceTypes = (config) => {
  const types = getConfig(config);
  const placeTypes = types.filter(type => !type.person);
  return placeTypes.filter(type => {
    return placeTypes.every(inner => !inner.parents || !inner.parents.includes(type.id));
  });
};

module.exports = {
  getTypeId,
  getTypeById,
  isPersonType,
  isPlaceType,
  hasParents,
  isParentOf,
  getLeafPlaceTypes,
};
