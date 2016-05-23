var db = require('pouchdb')('http://demo:medic@localhost:5984/medic'),
    _ = require('underscore');

function usersThatCanSeeThisDoc(doc) {
  // XYZ
  var ALL = "all",
      UNASSIGNED = "unassigned",
      ADMIN = "admin";

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

  if (doc._id.indexOf('org.couchdb.user:') === 0) {
    return [doc.facility_id];
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
// XYZ

function revNum(rev) {
  return parseInt(rev.substring(0, rev.indexOf('-')));
}


function getResultToDoneDocs(getResult) {
  console.log('converting');

  var toReturn = getResult.results.map(function(docWrapper) {
    var doc = docWrapper.docs[0].ok;
    try {
      doc.whoCanSeeThisDoc = usersThatCanSeeThisDoc(doc);
      return doc;
    } catch (e) {
      console.log('Not storing', e);
    }
  }).filter(function(doc) {
    return doc; // get rid of undefined
  });

  console.log('done converting');

  return toReturn;
}

function doTheDew(docs) {
  db.bulkGet({
    docs: docs
  }).then(function(result) {
    console.log('Got 10k docs');

    db.bulkDocs(
      getResultToDoneDocs(result)
    ).then(function(result) {
      console.log('worked, with successes: ', result.length);
    }).catch(function(err) {
      console.log('pooped up', err);
    });
  }).catch(function(err) {
    console.log('butted up', err);
  });
}

// Get 10k documents
function theTimesTheyAreAChanging(since, limit) {
  console.log('The times', since, limit);

  var docs = [];
  db.changes({
    since: since,
    limit: limit
  }).on('change', function(change) {
    if (!change.deleted) {
      docs.push({
        id: change.id,
        rev: change.changes[change.changes.length - 1].rev
      });
    }
  }).on('complete', function() {
    console.log('Got all 10k docids', docs.length);

    // reduce to only the latest versions of each doc
    var latestDocs = _.reduce(docs, function(memo, potential) {
      if (!_.find(memo, function(doc) {
        return doc.id === potential.id &&
        revNum(doc.rev) < revNum(potential.rev)
      })) {
        memo.push(potential);
        return memo;
      }
    }, []);

    console.log('reduced to', latestDocs.length);

    doTheDew(latestDocs);
  });
}

// var start = 28488;
var start = 38488;

theTimesTheyAreAChanging(start, 1000);
