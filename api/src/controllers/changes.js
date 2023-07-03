const serverUtils = require('../server-utils');
const db = require('../db');
const authorization = require('../services/authorization');

const processRequest = async (req, res) => {
  const changes = await db.medic.changes({ doc_ids: authorization.getDefaultDocs(req?.userCtx) });
  res.json(changes);
};

const request = async (req, res) => {
  try {
    return await processRequest(req, res);
  } catch (err) {
    return serverUtils.error(err, req, res);
  }
};

module.exports = {
  request,
};
