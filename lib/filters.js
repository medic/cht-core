/**
 * Filter functions to be exported from the design doc.
 */
exports.data_records = function(doc) {
  return doc.type === 'data_record';
};

exports.design_doc = function(doc) {
  return doc._id === '_design/medic';
};

exports.tasks_by_id = function(doc, req) {
  return Array.isArray(doc.tasks) && doc._id === req.query.id;
};

exports.doc_by_place = function(doc, req) {
  var ALL = "all",
      UNASSIGNED = "unassigned",
      ADMIN = "admin";

  function usersThatCanSeeThisDoc(doc) {
    var ok = function(place) {
      var users = [ADMIN]; // if you get here admins can see this
                           // (do admins even use this!?!?!)
      if (!place) {
        users.push(UNASSIGNED);
        return users;
      }

      while (place) {
        users.push(place._id);
        place = place.parent;
      }

      return users;
    };


    if (doc._id === '_design/medic') {
      return [];
    }

    if (doc._id === 'resources') {
      return [ALL];
    }

    if (doc._id.startsWith('org.couchdb.user:')) {
      return [doc.facility_id]; // or contact_id? supposed to be hte same as
                                // req.query.id
    }

    switch (doc.type) {
      case 'data_record':
        if (doc.kujua_message === true) {
          // outgoing message
          return ok(doc.tasks &&
                    doc.tasks[0] &&
                    doc.tasks[0].messages &&
                    doc.tasks[0].messages[0] &&
                    doc.tasks[0].messages[0].contact);
        } else {
          // incoming message
          return ok(doc.contact);
        }
        break;
      case 'form':
        return [ALL];
      case 'clinic':
      case 'district_hospital':
      case 'health_center':
      case 'person':
        return ok(doc);
      default:
        return [];
    }
  }

  var results = usersThatCanSeeThisDoc(doc);
  if (!req.query.id) {
    return results.indexOf(ALL) || results.indexOf(ADMIN);
  } else if (req.query.unassigned === 'true') {
    return results.indexOf(ALL) || results.indexOf(UNASSIGNED) || results.indexOf(req.query.id);
  } else {
    return results.indexOf(ALL) || results.indexOf(req.query.id);
  }
};


