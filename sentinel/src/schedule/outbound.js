const configService = require('../config');
const db = require('../db');
const logger = require('../lib/logger');
const lineage = require('@medic/lineage')(Promise, db.medic);
const outbound = require('@medic/outbound')(logger);

const CONFIGURED_PUSHES = 'outbound';
const BATCH_SIZE = 1000;

//
// Loads all queued tasks and splits them into valid tasks we can work on, and invalid tasks that
// should be deleted (eg because they are about a document that doesn't exist anymore)
//
// @return     {<object>}  {validTasks, invalidTasks}, where a validTask is {task doc} and invalid
//                         tasks are {task row}
//
const queuedTasks = () => {
  return db.sentinel.allDocs({
    startkey: 'task:outbound:',
    endkey: 'task:outbound:\ufff0',
    include_docs: true,
    limit: BATCH_SIZE,
  })
    .then(taskResults => {
      const outboundTaskDocs = taskResults.rows.map(r => r.doc);
      const associatedDocIds = outboundTaskDocs.map(q => q.doc_id);

      return db.medic.allDocs({
        keys: associatedDocIds,
        include_docs: true
      }).then(docResults => {
        const { validTasks, invalidTasks } = docResults.rows.reduce((acc, r, idx) => {
          const task = outboundTaskDocs[idx];
          if (r.doc) {
            acc.validTasks.push({
              task: task,
              doc: r.doc
            });
          } else if (r.error === 'not_found' || (r.value && r.value.deleted)) {
            acc.invalidTasks.push({
              task: task,
              row: r
            });
          } else {
            throw Error(`Unexpected error retrieving a document: ${JSON.stringify(r)}`);
          }

          return acc;
        }, {validTasks: [], invalidTasks: []});

        if (validTasks.length) {
          return lineage.hydrateDocs(validTasks.map(t => t.doc))
            .then(hydratedDocs => {
              validTasks.forEach((t, idx) => {
                t.doc = hydratedDocs[idx];
              });

              return { validTasks, invalidTasks };
            });
        } else {
          return { validTasks, invalidTasks };
        }
      });
    });
};

// Collects push configs to attempt out of the task's queue, given a global config
const getConfigurationsToPush = (config, taskDoc) => {
  return taskDoc.queue.map(pushName => ([pushName, config[pushName]]));
};

// Remove the push task from the task's queue
const removeConfigKeyFromTask = (taskDoc, key) => {
  taskDoc.queue.splice(key, 1);
  if (taskDoc.queue.length === 0) {
    // Done with this queue completely
    taskDoc._deleted = true;
  }

  return db.sentinel.put(taskDoc)
    .then(({rev}) => {
      // This works because we are running a single push one at a time and we're passing a
      // shared reference around (so the next singlePush to run against the same task will have
      // a reference to this same doc with the updated rev). If we refactor this code to be more
      // efficient we need to be careful to not cause conflicts against the task document.
      taskDoc._rev = rev;
    });
};

/**
 * Push a payload, cleanup afterwards if successful
 *
 */
const singlePush = (taskDoc, medicDoc, infoDoc, config, key) => Promise.resolve()
  .then(() => {
    if (!config) {
      // The outbound config entry has been deleted / renamed / something!
      logger.warn(
        `Unable to push ${medicDoc._id} for ${key} because this outbound config no longer exists, clearing task`
      );
      return removeConfigKeyFromTask(taskDoc, key);
    }

    if (outbound.alreadySent(key, infoDoc)) {
      // Don't send "duplicate" outbound pushes
      logger.debug(`Skipping ${medicDoc._id} for ${key} because we've pushed this combination before`);
      return removeConfigKeyFromTask(taskDoc, key);
    }

    return outbound.send(config, key, medicDoc, infoDoc)
      .then(() => {
        // Worked, remove entry from queue and store infodoc that outbound service has updated
        return removeConfigKeyFromTask(taskDoc, key)
          .then(() => db.sentinel.put(infoDoc))
          .catch(err => {
            if (err.status !== 409) {
              logger.error('Failed to save infodoc');
              logger.error(err);
              throw err;
            }

            // While we held the infodoc open something else wrote to it. Presume it wasn't
            // anything task related, load a fresh version and overwrite
            return db.sentinel.get(infoDoc._id)
              .then(freshInfoDoc => {
                freshInfoDoc.completed_tasks = infoDoc.completed_tasks;
                return db.sentinel.put(freshInfoDoc);
              });
          });
      });
  }).catch(() => {
    // Failed!
    // Don't remove the entry from the task's queue so it will be tried again next time
  });

const removeInvalidTasks = invalidTasks => {
  logger.warn(`Found ${invalidTasks.length} tasks that could not have their associated records loaded:`);

  const toDelete = [];

  invalidTasks.forEach(({task, row}) => {
    logger.warn(`Task ${task._id} failed to load ${task.doc_id} because:`);
    logger.warn(JSON.stringify(row, null, 2));

    task._deleted = true;
    toDelete.push(task);
  });

  logger.warn('Deleting invalid tasks');

  return db.sentinel.bulkDocs(toDelete);
};

//
// Load and attach info docs for the records attached to the tasks
//
// @param      {<array>}  tasks array of {task, doc}
// @return     {<array>}  { task, doc, info }
//
const attachInfoDocs = tasks => {
  return db.sentinel.allDocs({
    keys: tasks.map(({doc}) => `${doc._id}-info`),
    include_docs: true
  }).then(results => {
    results.rows.forEach((row, idx) => tasks[idx].info = row.doc);

    return tasks;
  });
};

// Coordinates the attempted pushing of documents that need it
const execute = () => {
  const configuredPushes = configService.get(CONFIGURED_PUSHES) || {};
  if (!Object.keys(configuredPushes).length) {
    return Promise.resolve();
  }

  return queuedTasks()
    .then(({validTasks, invalidTasks}) => {
      if (invalidTasks.length) {
        return removeInvalidTasks(invalidTasks).then(() => validTasks);
      } else {
        return validTasks;
      }
    })
    .then(validTasks => attachInfoDocs(validTasks))
    .then(validTasks => {
      const pushes = validTasks.reduce((acc, {task, doc, info}) => {
        const pushesForDoc =
          getConfigurationsToPush(configuredPushes, task)
            .map(([key, config]) => ({task, doc, info, config, key}));

        return acc.concat(pushesForDoc);
      }, []);

      // Attempts each push one by one. Written to be simple not efficient.
      // There are lots of things we could do to make this faster / less fragile,
      // such as scoping pushes by domain, as well as writing out successes before
      // all pushes are complete
      // For now we presume we aren't going to get much traffic against this and
      // will probably only be doing one push per schedule call
      return pushes.reduce(
        (p, {task, doc, info, config, key}) => p.then(() => singlePush(task, doc, info, config, key)),
        Promise.resolve()
      );
    });
};

module.exports = {
  execute: cb => execute().then(() => cb()).catch(cb)
};
