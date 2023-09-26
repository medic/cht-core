import { TranslateCompiler, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { DbService } from '@mm-services/db.service';
import { TranslationLoaderProvider } from '@mm-providers/translation-loader.provider';
import { TranslateMessageFormatCompilerProvider } from '@mm-providers/translate-messageformat-compiler.provider';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule, Injector } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { AppComponent } from './app.component';

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
export class AppModule {
  constructor(injector: Injector) {
    const chtForm = createCustomElement(AppComponent, { injector });
    customElements.define('cht-form', chtForm);
  }

  ngDoBootstrap() {
    // For some reason, this is required for Angular Elements to work
  }
}
