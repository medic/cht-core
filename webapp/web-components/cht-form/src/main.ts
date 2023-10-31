import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app.module';
import * as $ from 'jquery';

window.$ = window.jQuery = require('jquery');

// Moment additional locales
require('../../../src/js/moment-locales/tl');
require('../../../src/js/moment-locales/hil');
require('../../../src/js/moment-locales/ceb');
require('../../../src/js/moment-locales/lg');
require('moment/locale/fr');
require('moment/locale/es');
require('moment/locale/bm');
require('moment/locale/hi');
require('moment/locale/id');
require('moment/locale/ne');
require('moment/locale/sw');
require('select2');
require(`../../../src/js/enketo/main`);

// Enable jQuery support for self-closing xml tags
// https://jquery.com/upgrade-guide/3.5/
const rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi;
// eslint-disable-next-line no-import-assign
Object.defineProperties($, { // NOSONAR
  htmlPrefilter: { value: (html) => html.replace(rxhtmlTag, '<$1></$2>') }
});

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
