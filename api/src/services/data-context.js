const { getLocalDataContext } = require('@medic/cht-datasource');
const db = require('../db');
const config = require('../config');

module.exports = getLocalDataContext(config, db);
