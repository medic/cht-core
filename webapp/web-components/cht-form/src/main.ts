import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app.module';

window.$ = window.jQuery = require('jquery');
require(`../../../src/js/enketo/main.js`);
console.log('jkuester - start bootstrapModule');

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .then(() => {
    console.log('jkuester - bootstrapModule');
    window.CHTCore = { Select2Search: { init: async () => {} } };

  })
  .catch(err => console.error(err));
