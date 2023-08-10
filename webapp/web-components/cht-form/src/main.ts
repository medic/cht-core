import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app.module';

window.$ = window.jQuery = require('jquery');

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .then(() => {
    window.CHTCore = { Select2Search: { init: async () => {} } };
    require(`../../../src/js/enketo/main.js`);
  })
  .catch(err => console.error(err));
