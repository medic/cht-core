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

exports.doc_by_place_live = function(doc, req) {
  var ok = function(place) {
    if (!req.query.id) {
      // admin
      return true;
    }
    if (!place) {
      return req.query.unassigned === 'true';
    }
    while (place) {
      if (place._id === req.query.id) {
        return true;
      }
      place = place.parent;
    }
    return false;
  };

  if (doc._id === '_design/medic') {
    // Never replicate the ddoc as it's too big.
    // Changes are tracked in the watchDesignDoc function of the DB service.
    return false;
  }
  if (doc._id === 'resources') {
    return true;
  }
  if (doc._id === 'org.couchdb.user:' + req.userCtx.name) {
    return true;
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
      return true;
    case 'clinic':
    case 'district_hospital':
    case 'health_center':
    case 'person':
      return ok(doc);
    default:
      return false;
  }
};

exports.doc_by_place = function(doc, req) {
  if (doc && doc.whoCanSeeThisDoc) {
    var results = doc.whoCanSeeThisDoc;

    var ALL = "all",
        UNASSIGNED = "unassigned",
        ADMIN = "admin";

    if (!req.query.id) {
      return results.indexOf(ALL) !== -1 || results.indexOf(ADMIN) !== -1;
    } else if (req.query.unassigned === 'true') {
      return results.indexOf(ALL) !== -1 || results.indexOf(UNASSIGNED) !== -1 || results.indexOf(req.query.id) !== -1;
    } else {
      return results.indexOf(ALL) !== -1 || results.indexOf(req.query.id) !== -1;
    }
  }
};

exports.doc_by_place_backup = function(doc, req) {
  if (doc && doc.whoCanSeeThisDoc) {
    var results = doc.whoCanSeeThisDoc;

    var ALL = "all",
        UNASSIGNED = "unassigned",
        ADMIN = "admin";

    if (!req.query.id) {
      return results.indexOf(ALL) !== -1 || results.indexOf(ADMIN) !== -1;
    } else if (req.query.unassigned === 'true') {
      return results.indexOf(ALL) !== -1 || results.indexOf(UNASSIGNED) !== -1 || results.indexOf(req.query.id) !== -1;
    } else {
      return results.indexOf(ALL) !== -1 || results.indexOf(req.query.id) !== -1;
    }
  }

  var ok = function(place) {
    if (!req.query.id) {
      // admin
      return true;
    }
    if (!place) {
      return req.query.unassigned === 'true';
    }
    while (place) {
      if (place._id === req.query.id) {
        return true;
      }
      place = place.parent;
    }
    return false;
  };

  if (doc._id === '_design/medic') {
    // Never replicate the ddoc as it's too big.
    // Changes are tracked in the watchDesignDoc function of the DB service.
    return false;
  }
  if (doc._id === 'resources') {
    return true;
  }
  if (doc._id === 'org.couchdb.user:' + req.userCtx.name) {
    return true;
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
      return true;
    case 'clinic':
    case 'district_hospital':
    case 'health_center':
    case 'person':
      return ok(doc);
    default:
      return false;
  }
};


