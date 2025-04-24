import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

import * as chai from 'chai';
import chaiExclude from 'chai-exclude';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiExclude);
chai.use(chaiAsPromised);
chai.config.truncateThreshold = 0;

 
 

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
  {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true
  }
);

// Override console.error for icon-related errors
const originalConsoleError = console.error;
console.error = function(...args) {
  // Filter out all icon-related error messages with more aggressive filtering
  if (args.length > 0 && 
      (typeof args[0] === 'string' && 
       (args[0].includes('icon') || 
        args[0].includes('Icon') || 
        args[0].includes('Unable to find') ||
        (args[0] === 'ERROR' && args[1] && args[1].toString().includes('icon'))))) {
    return;
  }
  return originalConsoleError.apply(console, args);
};
