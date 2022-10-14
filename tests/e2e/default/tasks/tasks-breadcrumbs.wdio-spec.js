// const moment = require('moment');

const utils = require('../../../utils');
// const commonElements = require('../../../page-objects/default/common/common.wdio.page');
// const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');
// const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
// const reportFactory = require('../../../factories/cht/reports/generic-report');

describe('Tasks tab breadcrumbs', () => {
//  const today = moment();
  const places = placeFactory.generateHierarchy();
  const clinic = places.find(p => p.type === 'clinic');
  const health_center = places.find(p => p.type === 'health_center');
  const district_hospital = places.find(p => p.type === 'district_hospital');
  const contact = {
    _id: 'fixture:user:user1',
    name: 'OfflineUser',
    phone: '+12068881234',
    place: health_center._id,
    type: 'person',
    parent: {
      _id: health_center._id,
      parent: health_center.parent
    },
  };
  const contact2 = {
    _id: 'fixture:user:user2',
    name: 'OnlineUser',
    phone: '+12068881235',
    place: district_hospital._id,
    type: 'person',
    parent: {
      _id: district_hospital._id,
    },
  };
  const offlineUser = userFactory.build({
    username: 'offlineuser',
    isOffline: true,
    place: health_center._id,
    contact: contact._id,
  });
  const onlineUser = userFactory.build({
    username: 'onlineuser',
    roles: [ 'program_officer' ],
    place: district_hospital._id,
    contact: contact2._id,
  });
  const patient = personFactory.build({
    _id: 'patient1',
    parent: { _id: clinic._id, parent: { _id: health_center._id, parent: { _id: district_hospital._id }}}
  });

  before(async () => {
    await utils.saveDocs([ ...places, contact, contact2, patient ]);
    await utils.createUsers([ onlineUser, offlineUser ]);
  });

});
