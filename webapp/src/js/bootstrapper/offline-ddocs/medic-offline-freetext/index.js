const contactByFreetext = require('./contacts_by_freetext');

const packageView = ({ map }) => ({ map: map.toString() });

module.exports = {
  _id: '_design/medic-offline-freetext',
  views: {
    contacts_by_freetext: packageView(contactByFreetext),
  }
};
