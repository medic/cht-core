const Factory = require('rosie').Factory;
const uuid = require('uuid');

require('../users/offline');
require('./district-hospital');
require('./health-center');
require('./clinic');
require('./person');

const districtId = uuid.v4();
const healthCenterID = uuid.v4();
const clinicId = uuid.v4();
const personId = uuid.v4();

const patientParent = {
  _id: personId,
  parent: {
    '_id': clinicId,
    parent: {
      _id: healthCenterID,
      parent: {
        _id: districtId
      }
    }
  }
};

const clinic = {
  '_id': clinicId,
  'parent': {
    '_id': healthCenterID,
    parent: {
      _id: districtId
    }
  }
};

const healthCenter = {
  '_id': healthCenterID,
  'parent': {
    '_id': districtId
  }
};

Factory.define('clinic').extend('chtClinic')
  .attrs(clinic);

Factory.define('districtHospital').extend('cht_district_hospital')
  .attr('_id', districtId);

Factory.define('healthCenter').extend('cht_health_center')
  .attrs(healthCenter);

Factory.define('woman').extend('person')
  .attrs(patientParent);

Factory.define('user').extend('offlineUser')
  .attr('place', healthCenterID);
