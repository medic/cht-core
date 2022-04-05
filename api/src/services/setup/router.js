const express = require('express');
const router = express.Router();
const logger = require('../../logger');

const { wantsJSON } = require('../../middleware/wantsJSON');
const STATUS = 503;

const startupProgress = [];
const logProgress = (action) => {
  logger.info(action);
  startupProgress.push({
    action,
    date: new Date().getTime(),
  });
};

router.all('*', wantsJSON, (req, res) => {
  res.status(STATUS);
  res.json({ error: 'Service unavailable' });
});
router.all('*', (req, res) => {
  res.status(STATUS);
  res.send('<html><title>APi booting</title><body>API not available yet</body></html>');
});

module.exports = {
  router,
  logProgress,
};
