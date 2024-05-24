const { getLocalDataContext } = require('@medic/cht-datasource');
const db = require('../db');
const config = require('../config');

const dataContext = getLocalDataContext(config, db);

Object.assign(module.exports, dataContext);
