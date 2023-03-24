import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
// import { environment } from '@app/environments/environment';
import { AppModule } from './app.module';


platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
