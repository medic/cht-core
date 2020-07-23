let totalPurged;
let emit;

module.exports.shouldPurge = (localDb) => {
  return localDb.get('settings')
    .then(settings => {
      if (!settings || !settings.settings || !settings.settings.purge_tasks || !settings.settings.purge_tasks.length) {
        return  false;
      }
      return true;
    })
    .catch(() => false);
};

module.exports.purge = (localDb, userCtx) => {
  totalPurged = 0;
  const handlers = [];

  emit = (name, event) => {
    console.debug(`Emitting '${name}' event with:`, event);
    (handlers[name] || []).forEach(callback => callback(event));
  };

  const promise = Promise
    .resolve()
    .then(() => localDb.get('settings'))
    .then(settings => {
      let promiseChain = Promise.resolve();
      emit('start');

      settings.settings.purge_tasks.forEach(purgeSetting => {
        if (!purgeSetting.event_name) {
          return;
        }

        promiseChain = promiseChain.then(() => purgeTasks(localDb, userCtx, purgeSetting));
      });

      return promiseChain;
    });

  promise.on = (type, callback) => {
    handlers[type] = handlers[type] || [];
    handlers[type].push(callback);
    return promise;
  };

  return promise;
};

const purgeTasks = (localDb, userCtx, { event_name, all_contacts }) => {
  if (!all_contacts) {
    return getUserContactId(localDb, userCtx)
      .then(contactId => purgeTasksForContact(localDb, event_name, contactId, userCtx));
  }

  return getAllContactsIds(localDb).then(contactIds => {
    let promise = Promise.resolve();
    contactIds.forEach(contactId => {
      promise = promise.then(() => purgeTasksForContact(localDb, event_name, contactId, userCtx));
    });
    return promise;
  });
};

const getAllContactsIds = localDb => {
  return localDb
    .query('medic-client/contacts_by_type')
    .then(result => result.rows.map(row => row.id));
};

const getUserContactId = (localDb, userCtx) => {
  return localDb
    .get(`org.couchdb.user:${userCtx.name}`)
    .then(userSettings => userSettings.contact_id);
};

const purgeTasksForContact = (localDb, eventName, contactId, userCtx) => {
  const searchKey = `task~org.couchdb.user:${userCtx.name}~${contactId}~${eventName}`;
  return localDb
    .allDocs({ start_key: searchKey, end_key: searchKey + '\ufff0', limit: 100 })
    .then(result => {
      if (!result.rows || !result.rows.length) {
        // we're done!
        return;
      }

      const deleteStubs = result.rows
        .filter(row => !row.error)
        .map(row => ({ _id: row.id, _rev: row.value.rev, _deleted: true, purged: true }));

      return localDb.bulkDocs(deleteStubs).then(results => {
        let errors = '';
        results.forEach(result => {
          if (!result.ok) {
            errors += result.id + ' with ' + result.message + '; ';
          }
        });
        if (errors) {
          throw new Error(`Not all documents purged successfully: ${errors}`);
        }

        totalPurged += deleteStubs.length;
        emit('progress', { purged: totalPurged });
        return purgeTasksForContact(localDb, eventName, contactId, userCtx);
      });
    });
};
