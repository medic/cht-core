const express = require('express');
const router = express.Router();
const path = require('path');

const environment = require('../../environment');
const startupLog = require('./startup-log');

const { wantsJSON } = require('../../middleware/wants-json');
const STATUS = 503;

router.use(express.static(environment.setupPath));
router.get('/progress', (req, res) => {
  res.json(startupLog.getProgress());
});

router.all('*', wantsJSON, (req, res) => {
  res.status(STATUS);
  res.json({ error: 'Service unavailable' });
});
router.all('*', (req, res) => {
  res.sendFile(path.resolve(environment.setupPath, 'setup.html'));
});

module.exports = {
  router,
};
