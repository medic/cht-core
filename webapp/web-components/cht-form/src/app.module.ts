import { TranslateCompiler, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { DbService } from '@mm-services/db.service';
import { TranslationLoaderProvider } from '@mm-providers/translation-loader.provider';
import { TranslateMessageFormatCompilerProvider } from '@mm-providers/translate-messageformat-compiler.provider';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule, Injector, DoBootstrap } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { AppComponent } from './app.component';
import { TranslateService } from '@mm-services/translate.service';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (db: DbService) => new TranslationLoaderProvider(db),
        deps: [DbService],
      },
      compiler: {
        provide: TranslateCompiler,
        useClass: TranslateMessageFormatCompilerProvider,
      },
    }),
  ]
})
export class AppModule implements DoBootstrap {
  constructor(
    injector: Injector,
    private dbService: DbService,
    private translateService: TranslateService
  ) {
    const chtForm = createCustomElement(AppComponent, { injector });
    customElements.define('cht-form', chtForm);
  }

  ngDoBootstrap() {
    window.CHTCore = {
      AndroidAppLauncher: { isEnabled: () => false },
      Language: { get: async () => 'en' },
      MRDT: { enabled: () => false },
      Select2Search: {
        init: async () => {}
      },
      Settings: { get: async () => ({ default_country_code: '1' }) },
      Translate: this.translateService,
      DB: this.dbService,
    };
  }
}
