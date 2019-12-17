const MAX_REPLICATION_RETRY_COUNT = 3;

angular
  .module('inboxServices')
  .factory('DBSyncRetry', function(
    $log,
    $q,
    DB
  ) {
    'use strict';
    'ngInject';

    const getPreviousRev = doc => {
      const revisions = doc._revisions;
      if (!revisions) {
        return;
      }

      if (revisions.start <= 1 || revisions.ids.length <= 1) {
        return;
      }

      return `${revisions.start - 1}-${revisions.ids[1]}`;
    };

    const getMedicDoc = (id) => {
      return DB().get(id, { revs: true });
    };

    const saveMedicDoc = (doc) => {
      delete doc._revisions;
      return DB().put(doc).catch(err => {
        if (err.status !== 409) {
          throw err;
        }
      });
    };

    const getLocalDoc = (id) => {
      return DB({ meta: true })
        .get(`_local/${id}`)
        .catch(err => {
          if (err.status !== 404) {
            throw err;
          }

          return { _id: `_local/${id}` };
        })
        .then(doc => {
          doc.replication_retry = doc.replication_retry || {};
          doc.replication_retry.count = doc.replication_retry.count || 1;

          return doc;
        });
    };

    const saveLocalDoc = (local) => DB({ meta: true }).put(local);

    // Retry replication for every "real" rev X times
    // we enable retrying by "touching" the doc, pushing it to the end of the changes feed
    // we store the rev of the doc we touch and we only increase the replication_retry if the calculated previous
    // rev matches the previous retry rev. This ensures that external updates (for example user updates) would reset
    // the retry counter.
    const retryForbiddenFailure = err => {
      if (!err || !err.id) {
        return;
      }

      return $q
        .all([
          getMedicDoc(err.id),
          getLocalDoc(err.id),
        ])
        .then(([ doc, local ]) => {
          if (local.replication_retry.rev) {
            const previousRev = getPreviousRev(doc);
            const consecutiveAttempts = previousRev && previousRev === local.replication_retry.rev;
            local.replication_retry.count = consecutiveAttempts ? local.replication_retry.count + 1 : 1;
          }

          if (local.replication_retry.count > MAX_REPLICATION_RETRY_COUNT) {
            return;
          }

          local.replication_retry.rev = doc._rev;
          // only save local doc if touching was successful: we catch conflicts when saving the medic doc
          return saveMedicDoc(doc).then(result => result && result.ok && saveLocalDoc(local));
        })
        .catch(err => {
          $log.error(`Error when retrying replication for forbidden doc`, err);
        });
    };

    return retryForbiddenFailure;
  });
