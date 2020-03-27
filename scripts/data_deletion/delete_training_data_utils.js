/**
 * Utils for data deletion scripts.
 */

'use strict';

const _ = require('underscore');
const fs = require('fs');
const mkdirp = require('mkdirp');
const prompt = require('prompt');
const util = require('util');

// Overload console.log to log to file.
const setupLogging = function(logdir, logfile) {
  if (!mkdirp.sync(logdir)) {
    console.log('Couldnt create logdir, aborting.');
    process.exit();
  }
  const log_file = fs.createWriteStream(logdir + '/' + logfile, {flags : 'w'});
  log_file.write(''); // create file by writing in it
  const log_stdout = process.stdout;
  console.log = function(d) {
    log_file.write(util.format(d) + '\n');
    log_stdout.write(util.format(d) + '\n');
  };
};

// Useful to keep track of the last seq number, and who knows what else?
const printoutDbStats = function(db, data) {
  return db.info().then(function (result) {
    console.log('DB stats - ' + JSON.stringify(result));
    return data;
  });
};

const getDocsFromRows = function(rows) {
  return _.map(rows, function(row) {
    return row.doc;
  });
};

const getIdsFromRows = function(rows) {
  return _.map(rows, function(row) {
    return row.id;
  });
};

// Note : instead of deleting docs, we set {_deleted: true}, so that the
// deletions are replicated to clients.
const deleteDocs = function(dryrun, db, docs) {
  if (dryrun) {
    console.log('Dryrun : not deleting.');
    return docs;
  }
  const docsWithDeleteField = _.map(docs, function(doc) {
    doc._deleted = true;
    return doc;
  });

  return db.bulkDocs(docsWithDeleteField)
    .then(function (result) {
      console.log('Deleted : ' + result.length + ':');
      console.log(result);
      return result;
    })
    .catch(function() {
      console.log('Ignoring error in deleteDoc, because db times out all the time anyway.');
      return docsWithDeleteField;
    });
};

/**
 * queryFunc(skip) : queries db, returns list of docs.
 * processFunc(docs, skip) : filters docs, deletes them.
 */
const queryInBatches = function(queryFunc, processFunc) {
  let skip = 0;
  let loopCounter = 0;
  const maxLoops = 500;
  let done = false;
  let timeoutSecs = 5;
  let batchSize = 0;
  const loopFunc = function() {
    console.log(new Date());
    loopCounter++;
    console.log('loop ' + loopCounter);
    if (loopCounter > maxLoops) {
      throw 'too many loops';
    }
    return Promise.resolve()
      .then(_.partial(queryFunc, skip))
      .then(function(docs) {
        if (docs.length === 0) {
          done = true;
          throw 'No more docs!';
        }
        batchSize = docs.length;
        return docs;
      })
      .then(_.partial(processFunc, _ /* docs */, skip))
      .then(function(result) {
        skip = skip + batchSize - result.length;
        timeoutSecs = 5;
        return loopFunc();
      })
      .catch(function(err) {
        if (!done) {
          console.log(err);
          timeoutSecs = timeoutSecs * 2;
          if (timeoutSecs > 120) {
            timeoutSecs = 120;
          }
          console.log('query timed out! Wait around ' + timeoutSecs + ' seconds and then retry.\n');
          setTimeout(loopFunc, timeoutSecs * 1000);
          return;
        }
        throw err;
      });
  };

  return loopFunc()
    .catch(function(err) {
      console.log('Done!');
      console.log(err);
    });
};

// Skip : how many records to skip before outputting (~= offset)
const getContactsForPlace = function(db, placeId, skip, batchSize) {
  console.log('query with batchsize ' + batchSize + ' , skip ' + skip);
  return db.query(
    'medic-client/contacts_by_place',
    {key: [placeId], include_docs: true, limit: batchSize, skip: skip}
  ).then(function (result) {
    console.log('total_rows : ' + result.total_rows + ', offset : ' + result.offset);
    console.log('Contacts for place : ' + result.rows.length);
    const docs = getDocsFromRows(result.rows);
    return docs;
  });
};

// Skip : how many records to skip before outputting (~= offset)
const getDataRecordsForBranch = function(db, branchId, skip, batchSize) {
  console.log('query with batchsize ' + batchSize + ' , skip ' + skip);
  const params = {
    key: branchId,
    skip: skip,
    include_docs: true,
    limit: batchSize
  };
  return db.query('medic-scripts/data_records_by_ancestor', params).then(function (result) {
    console.log('total_rows : ' + result.total_rows + ', offset : ' + result.offset);
    console.log('Reports for branch : ' + result.rows.length);
    return getDocsFromRows(result.rows);
  });
};

const filterByDate = function(docsList, startTimestamp, endTimestamp) {
  const filteredList = _.filter(docsList, function(doc) {
    return doc.reported_date && doc.reported_date >= startTimestamp && doc.reported_date < endTimestamp;
  });
  console.log('Filtered by date : ' + filteredList.length);
  return filteredList;
};

const filterByType = function(docsList, type) {
  const filteredList = _.filter(docsList, function(doc) { return doc.type === type; });
  console.log('Filtered by type ' + type + ' : ' + filteredList.length);
  return filteredList;
};

// Only keep the persons that are family members.
// Avoids deleting CHP contacts and district supervisors.
const filterFamilyMembers = function(personsList, logdir) {
  if (personsList.lenth === 0) {
    console.log('Filtered for only family members : 0');
    return [];
  }
  const groups = _.groupBy(personsList, function(person) {
    if (!person.parent || person.parent.type === 'clinic') {
      return 'familyMember';
    }
    return 'other';
  });
  return Promise.resolve()
    .then(function() {
      if (!groups.other) {
        return;
      }
      console.log('Non-family members : ' + groups.other.length);
      const undated = _.filter(groups.other, function(person) {
        return !person.reported_date;
      });
      console.log('Non-family members without reported_date (should not exist!) : ' + undated.length);
      return writeDocsToFile(logdir + '/NOT_DELETED_non_family_members.json', groups.other);
    })
    .then(function() {
      if (!groups.familyMember) {
        groups.familyMember = [];
      }
      console.log('Filtered for only family members : ' + groups.familyMember.length);
      return groups.familyMember;
    });
};

// Find which facilities (if any) this person is a contact for.
const isContactFor = function(db, personId) {
  return db.query('medic-scripts/places_by_contact', {key: personId, include_docs: true})
    .then(function(result) {
      const ids = getIdsFromRows(result.rows);
      if (result.rows.length > 0) {
        console.log('Person ' + personId + ' is contact for ' + result.rows.length + ' facilities : ', ids);
      }
      return getDocsFromRows(result.rows);
    })
    .catch(function(err) {
      console.log('Error in isContactFor ' + personId);
      console.log(err);
      throw err;
    });
};

const removeContact = function(db, dryrun, person, facilitiesList) {
  _.each(facilitiesList, function(facility) {
    delete facility.contact;
  });

  if (dryrun) {
    console.log('Dryrun : not removing contact links.');
    return person;
  }

  return db.bulkDocs(facilitiesList)
    .then(function (result) {
      console.log('Removed contact ' + person._id + ' from ' + facilitiesList.length + ' facilities');
      console.log(result);
      return person;
    });
};

// If the persons are contacts for facilities, edit the facilities to remove the contact.
// Do it them one after the other, rather than concurrently, to avoid too many requests on the DB.
const cleanContactPersons = function(db, dryrun, logdir, personsList) {
  let promise = Promise.resolve();
  _.each(personsList, function(person) {
    promise = promise.then(function() { return cleanContactPerson(db, dryrun, logdir, person); });
  });
  return promise.then(function() { return personsList; });
};

const cleanContactPerson = function(db, dryrun, logdir, person) {
  return isContactFor(db, person._id)
    .then(function(facilities) {
      if (!facilities || facilities.length === 0) {
        return;
      }
      return writeDocsToFile(logdir + '/cleaned_facilities_' + person._id + '.json', facilities)
        .then(_.partial(removeContact, db, dryrun, person));
    })
    .catch(function (err) {
      console.log('Error when removing contact ' + person._id);
      console.log(err);
      throw err;
    });
};

const _writeToFile = function(filepath, text) {
  return new Promise(function(resolve,reject){
    fs.writeFile(filepath, text, {flag: 'a'}, function(err) {
      if(err) {
        return reject('Couldn\'t write to file' + filepath, err);
      }
      resolve();
    });
  });
};

const writeDocsToFile = function(filepath, docsList) {
  if (docsList.length === 0) {
    // don't write empty files.
    return docsList;
  }
  return _writeToFile(filepath, JSON.stringify(docsList))
    .then(function() {
      console.log('Wrote ' + docsList.length + ' docs to file ' + filepath);
      return docsList;
    });
};

const writeDocsIdsToFile = function(filepath, docsList) {
  if (docsList.length === 0) {
    // don't write empty files.
    return docsList;
  }
  let megaPromise = Promise.resolve();
  _.each(docsList, function(doc) {
    megaPromise = megaPromise.then(_.partial(_writeToFile, filepath, doc._id + '\n'));
  });
  return megaPromise.then(function() {
    console.log('Wrote ' + docsList.length + ' doc ids to file ' + filepath);
    return docsList;
  });
};

const writeDocsDatesToFile = function(filepath, docsList) {
  if (docsList.length === 0) {
    // don't write empty files.
    return docsList;
  }
  let megaPromise = Promise.resolve();
  _.each(docsList, function(doc) {
    const date = new Date(doc.reported_date);
    let name = '';
    if (doc.type === 'data_record' || doc.type === 'clinic') {
      name = doc.contact.name;
    }
    if (doc.type === 'person') {
      name = doc.name;
    }
    megaPromise = megaPromise.then(_.partial(_writeToFile, filepath,
      date + ' --- ' + doc.reported_date + ' --- ' + doc._id + ' --- ' + name + '\n'));
  });
  return megaPromise.then(function() {
    console.log('Wrote ' + docsList.length + ' doc dates to file ' + filepath);
    return docsList;
  });
};

const fetchBranchInfo = function(db, branchId) {
  return db.get(branchId)
    .then(function(result) {
      return { _id: result._id, name: result.name, type: result.type };
    })
    .catch(function(err) {
      console.log('Couldnt find branch ' + branchId);
      throw err;
    });
};

const fetchBranch = function(db, branchId) {
  return db.get(branchId)
    .then(function(result) {
      return [ result ];
    })
    .catch(function(err) {
      console.log('Couldnt find branch ' + branchId);
      throw err;
    });
};

const userConfirm = function(message) {
  console.log(message); // log to logfile because prompt doesn't.

  prompt.message = ''; // remove annoying pre-prompt message.
  const property = {
    name: 'yesno',
    message: message,
    validator: /y[es]*|n[o]?/,
    warning: 'Must respond yes or no',
    default: 'yes'
  };
  prompt.start();

  return new Promise(function(resolve) {
    prompt.get(property, function (err, result) {
      if (err) {
        console.log(err);
        process.exit();
      }
      if (result.yesno !== 'yes') {
        console.log('User backed out. Exiting.');
        process.exit();
      }
      resolve();
    });
  });
};

module.exports = {
  cleanContactPersons: cleanContactPersons,
  deleteDocs: deleteDocs,
  fetchBranchInfo: fetchBranchInfo,
  fetchBranch: fetchBranch,
  filterByType: filterByType,
  filterByDate: filterByDate,
  filterFamilyMembers: filterFamilyMembers,
  getContactsForPlace: getContactsForPlace,
  getDataRecordsForBranch: getDataRecordsForBranch,
  printoutDbStats: printoutDbStats,
  queryInBatches: queryInBatches,
  setupLogging: setupLogging,
  userConfirm: userConfirm,
  writeDocsIdsToFile: writeDocsIdsToFile,
  writeDocsDatesToFile: writeDocsDatesToFile,
  writeDocsToFile: writeDocsToFile
};
