const contactByFreetext = require('./contacts_by_freetext');
const contactsByTypeFreetext = require('./contacts_by_type_freetext');

const packageView = ({ map }) => ({ map: map.toString() });

module.exports = {
  _id: '_design/medic-offline-freetext',
  views: {
    contacts_by_freetext: packageView(contactByFreetext),
    contacts_by_type_freetext: packageView(contactsByTypeFreetext),
  }
};
