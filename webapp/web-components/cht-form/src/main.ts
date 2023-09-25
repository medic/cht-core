import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app.module';

window.$ = window.jQuery = require('jquery');
require(`../../../src/js/enketo/main.js`);
platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .then(() => {
    window.CHTCore = {
      Language: { get: async () => 'en' },
      Select2Search: { init: async () => {} },
      Translate: { instant: (key) => key },
    };
  })
  .catch(err => console.error(err));
