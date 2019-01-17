#!/usr/bin/env node
console.log(`
Before running this script, don't forget to start webdriver:

	npm run webdriver

To see log files:

	tail -f logs/api.e2e.log
	tail -f logs/sentinel.e2e.log

Starting e2e test services…`);

const serviceManager = require('./service-manager');
serviceManager.startAll().then(() => console.log('[e2e] All services started.'));
