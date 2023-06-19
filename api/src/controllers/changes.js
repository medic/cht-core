const serverUtils = require('../server-utils');
const db = require('../db');

const processRequest = async (req, res) => {
  const docIds = [
    'service-worker-meta',
    '_design/medic-client',
    'settings'
  ];

  const changes = await db.medic.changes({ doc_ids: docIds });
  res.json(changes);
};

const request = (req, res) => {
  res.type('json');
  return processRequest(req, res).catch(err => serverUtils.error(err, req, res));
};

module.exports = {
  request,
};
