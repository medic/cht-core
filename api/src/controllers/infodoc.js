const db = require('../db');
const infodoc = require('@medic/infodoc');
infodoc.initLib(db.medic, db.sentinel);

module.exports = {
  mark: (req, res, next) => {
    req.triggerInfoDocUpdate = true;
    next();
  },
  // Requires that the request has been parsed into JSON via the jsonParser in the route
  update: (proxyRes, req) => {
    if (req.triggerInfoDocUpdate) {
      let body = Buffer.from('');
      proxyRes.on('data', data => (body = Buffer.concat([body, data])));
      proxyRes.on('end', () => {
        body = JSON.parse(body.toString());

        if (body.id && body.ok && !req.body._deleted) {
          // Single successful write
          infodoc.recordDocumentWrite(body.id);
        } else if (Array.isArray(body)) {
          // Bulk docs write that may be have been completely or partially successful
          const { writeAttempts, deleteAttempts } = req.body.docs.reduce(
            (acc, r) => {
              if (r._deleted) {
                acc.deleteAttempts.push(r._id);
              } else if (r._id) {
                acc.writeAttempts.push(r._id);
              }

              return acc;
            },
            { writeAttempts: [], deleteAttempts: [] }
          );

          let successfulWrites;
          if (req.body.new_edits === false) {
            // This flag specifically set to false means that CouchDB will ignore conflicts and is
            // effectively guaranteeing the writes that you passed in.
            //
            // NB: if someone is force-writing a document and not passing a specific _id there is
            // literally no way to know what the resulting _id was, becuase CouchDB returns [] when
            // you pass set new_edits to false. It's not clear this should ever happen.
            successfulWrites = writeAttempts;
          } else {
            // Filter out writes that were not successful via the result object, and that were
            // deletes via the request object
            successfulWrites = body
              .filter(r => r.ok && !deleteAttempts.includes(r.id))
              .map(r => r.id);
          }

          if (successfulWrites && successfulWrites.length) {
            infodoc.recordDocumentWrites(successfulWrites);
          }
        }
      });
    }
  },
};
