var _ = require('underscore');

angular.module('inboxServices').factory('ChildFacility',
  function(DB) {

    'use strict';
    'ngInject';

    var query = function(parent) {
      var params = {
        include_docs: true
      };
      if (parent.type === 'district_hospital') {
        // filter on district
        params.startkey = [ parent._id ];
        params.endkey = [ parent._id, {} ];
      } else if (parent.type === 'health_center') {
        // filter on health center
        params.startkey = [ parent.parent._id, parent._id ];
        params.endkey = [ parent.parent._id, parent._id, {} ];
      } else {
        throw new Error('Doc not currently supported.');
      }
      return DB().query('medic-client/total_clinics_by_facility', params);
    };

    var groupByClinicId = function(results) {
      return _.values(_.groupBy(results.rows, function(row) {
        return row.id;
      }));
    };

    var getById = function(group, id) {
      var found = _.find(group, function(contact) {
        return contact.doc && contact.doc._id === id;
      });
      return found && found.doc;
    };

    var getClinicName = function(clinic, contact) {
      if (clinic.name) {
        return clinic.name;
      }
      var placeId = clinic.place_id || (contact && contact.rc_code);
      var contactName = contact && contact.name;
      if (!contactName) {
        return placeId;
      }
      return contactName + ' ' + placeId;
    };

    // Ugly format to match what's expected by the old reporting rates code
    var format = function(groups) {
      return groups.map(function(group) {
        var districtId = group[0].key[0];
        var healthCenterId = group[0].key[1];
        var clinicId = group[0].key[2];
        var clinic = getById(group, clinicId);
        var contact = getById(group, clinic && clinic.contact && clinic.contact._id);
        var healthCenter = getById(group, healthCenterId);
        var district = getById(group, districtId);
        return {
          id: clinicId,
          key: [
            districtId,
            healthCenterId,
            clinicId,
            district && district.name,
            healthCenter && healthCenter.name,
            getClinicName(clinic, contact),
            contact && contact.phone
          ]
        };
      });
    };

    return function(parent) {
      return query(parent)
        .then(groupByClinicId)
        .then(format);
    };

  }
);
