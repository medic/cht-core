// TODO Compare with actual app.module...
import { TranslateCompiler, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { DbService } from '@mm-services/db.service';
import { TranslationLoaderProvider } from '@mm-providers/translation-loader.provider';
import { TranslateMessageFormatCompilerProvider } from '@mm-providers/translate-messageformat-compiler.provider';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule, Injector } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { AppComponent } from './app.component';
import { StoreModule } from '@ngrx/store';
import { reducers } from '../../../src/ts/reducers';

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
    StoreModule.forRoot(reducers, { metaReducers: [] }),
  ],
  providers: [],
  // entryComponents: [AppComponent]
})
export class AppModule {
  constructor(injector: Injector) {
    const el = createCustomElement(AppComponent, { injector });
    customElements.define('cht-form', el);
  }

  ngDoBootstrap() {}
}
