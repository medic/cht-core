const _ = require('lodash');

angular.module('inboxServices').factory('ChildFacility',
  function(DB) {

    'use strict';
    'ngInject';

    const query = function(parent) {
      const params = {
        include_docs: true
      };
      if (parent.parent) {
        params.startkey = [ parent.parent._id, parent._id ];
        params.endkey = [ parent.parent._id, parent._id, {} ];
      } else {
        params.startkey = [ parent._id ];
        params.endkey = [ parent._id, {} ];
      }
      return DB().query('medic-client/total_clinics_by_facility', params);
    };

    const groupByClinicId = function(results) {
      return _.values(_.groupBy(results.rows, function(row) {
        return row.id;
      }));
    };

    const getById = function(group, id) {
      const found = _.find(group, function(contact) {
        return contact.doc && contact.doc._id === id;
      });
      return found && found.doc;
    };

    const getClinicName = function(clinic, contact) {
      if (clinic.name) {
        return clinic.name;
      }
      const placeId = clinic.place_id || (contact && contact.rc_code);
      const contactName = contact && contact.name;
      if (!contactName) {
        return placeId;
      }
      return contactName + ' ' + placeId;
    };

    // Ugly format to match what's expected by the old reporting rates code
    const format = function(groups) {
      return groups.map(function(group) {
        const districtId = group[0].key[0];
        const healthCenterId = group[0].key[1];
        const clinicId = group[0].key[2];
        const clinic = getById(group, clinicId);
        const contact = getById(group, clinic && clinic.contact && clinic.contact._id);
        const healthCenter = getById(group, healthCenterId);
        const district = getById(group, districtId);
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
