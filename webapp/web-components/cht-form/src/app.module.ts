// import { Injector, NgModule } from '@angular/core';
// import { BrowserModule } from '@angular/platform-browser';
// import { createCustomElement } from '@angular/elements';
// // import { TrainingCardsService } from './stubs/training-cards.service';
//
// // import { AppComponent } from './app.component';
// import { AppComponent } from './app.component';
// import { TranslateCompiler, TranslateLoader, TranslateModule } from '@ngx-translate/core';
// import { DbService } from '@mm-services/db.service';
// import { TranslationLoaderProvider } from '@mm-providers/translation-loader.provider';
// import { TranslateMessageFormatCompilerProvider } from '@mm-providers/translate-messageformat-compiler.provider';
// // import { MissingTranslationHandlerLog } from '../../../../src/ts/app.module';
// // import { APP_BASE_HREF } from '@angular/common';
//
// @NgModule({
//   declarations: [
//     AppComponent
//   ],
//   imports: [
//     BrowserModule,
//     TranslateModule.forRoot({
//       loader: {
//         provide: TranslateLoader,
//         useFactory: (db: DbService) => new TranslationLoaderProvider(db),
//         deps: [DbService],
//       },
//       // missingTranslationHandler: {
//       //   provide: MissingTranslationHandler,
//       //   useClass: MissingTranslationHandlerLog
//       // },
//       compiler: {
//         provide: TranslateCompiler,
//         useClass: TranslateMessageFormatCompilerProvider,
//       },
//     }),
//   ],
//   providers: [
//     // TrainingCardsService
//   ],
//   // bootstrap: [AppComponent]
//   entryComponents: [
//     AppComponent,
//   ],
// })
// export class AppModule {
//   constructor(private injector: Injector) {
//     const enketoComponent = createCustomElement(AppComponent, {injector});
//     customElements.define('cht-form', enketoComponent);
//   }
// }
import { BrowserModule } from '@angular/platform-browser';
import { NgModule, Injector } from '@angular/core';
import { createCustomElement } from '@angular/elements';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule],
  providers: [],
  entryComponents: [AppComponent]
})
export class AppModule {
  constructor(injector: Injector) {
    const el = createCustomElement(AppComponent, { injector });
    customElements.define('cht-form', el);
  }

  ngDoBootstrap() {}
}
