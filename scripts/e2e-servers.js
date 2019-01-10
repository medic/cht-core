#!/usr/bin/env node
console.log(`
Before running this script, don't forget to start webdriver:

	npm run webdriver

If this script is having trouble starting the servers, try running this once first:

	grunt e2e

And make sure you're running this script from the root directory, e.g.,

  ./scripts/e2e-servers.js

To see log files:

	tail -f logs/api.e2e.log
	tail -f logs/sentinel.e2e.log

Starting services…`);

const serviceManager = require('../tests/service-manager');

serviceManager.startAll()
  .then(() => console.log('[e2e] ALL SERVICES STARTED.'))
  .then(() => console.log('[e2e] READY TO RUN TESTS ONCE OUTPUT HAS CALMED DOWN.'));
