import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app.module';

window.$ = window.jQuery = require('jquery');
require('select2');
require(`../../../src/js/enketo/main.js`);
platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
