#!/usr/bin/env node
const serviceManager = require('../tests/protractor/service-manager');

serviceManager.startAll()
  .then(() => console.log('[e2e] ALL SERVICES STARTED.'))
  .then(() => console.log('[e2e] READY TO RUN TESTS ONCE OUTPUT HAS CALMED DOWN.'));
