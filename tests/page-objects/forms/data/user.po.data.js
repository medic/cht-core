const constants = require('../../../constants');
const uuid = require('uuid').v4;

const parentId = uuid();

module.exports = {
  docs: [{
    _id: parentId,
    reported_date: Date.now(),
    notes: '',
    contact: { _id: constants.USER_CONTACT_ID },
    name: 'Number three district',
    external_id: '',
    type: 'district_hospital',
  }, {
    _id: uuid(),
    name: 'Jill',
    type: 'person',
    date_of_birth: '',
    parent: { _id: parentId },
    reported_date: Date.now(),
  }],
  userContactDoc: {
    _id: constants.USER_CONTACT_ID,
    name: 'Jack',
    date_of_birth: '',
    phone: '+64274444444',
    alternate_phone: '',
    notes: '',
    type: 'person',
    reported_date: Date.now(),
    parent: { _id: parentId },
  },
};
