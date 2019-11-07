const HARDCODED_PERSON_TYPE = 'person';

const getContactTypes = config => {
  return config && config['contact_types'] || [];
};

const getTypeId = (doc) => {
  if (!doc) {
    return;
  }
  return doc.type === 'contact' ? doc.contact_type : doc.type;
};

const getTypeById = (config, typeId) => {
  const contactTypes = getContactTypes(config);
  return contactTypes.find(type => type.id === typeId);
};

const isPersonType = (type) => {
  return type && (type.person || type.id === HARDCODED_PERSON_TYPE);
};

const isPlaceType = (type) => {
  return type && !type.person && type.id !== HARDCODED_PERSON_TYPE;
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
  const types = getContactTypes(config);
  const placeTypes = types.filter(type => !type.person);
  return placeTypes.filter(type => {
    return placeTypes.every(inner => !inner.parents || !inner.parents.includes(type.id));
  });
};

const getContactType = (config, contact) => {
  const typeId = getTypeId(contact);
  return typeId && getTypeById(config, typeId);
};

// returns true if contact's type exists and is a person type OR if contact's type is the hardcoded person type
const isPerson = (config, contact) => {
  const typeId = getTypeId(contact);
  const type = getTypeById(config, typeId) || { id: typeId };
  return isPersonType(type);
};

const isPlace = (config, contact) => {
  const type = getContactType(config, contact);
  return isPlaceType(type);
};

module.exports = {
  getTypeId,
  getTypeById,
  isPersonType,
  isPlaceType,
  hasParents,
  isParentOf,
  getLeafPlaceTypes,
  getContactType,
  isPerson,
  isPlace,
};
