import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { environment } from '@admin-tool-environments/environment';
import { AppComponent } from './app.component';
import { appConfig } from './app.config';

window.$ = window.jQuery = require('jquery');

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error('Error bootstrapping admin-tool', err));
