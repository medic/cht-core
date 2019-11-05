const getConfig = config => config && config.get && config.get('contact_types') || [];

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

const isParentOf = (parentType, childType) => {
  if (!parentType || !childType) {
    return false;
  }

  const parentTypeId = typeof parentType === 'string' ? parentType : parentType.id;
  return !!(childType && childType.parents && childType.parents.includes(parentTypeId));
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
