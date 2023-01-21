import { Injectable } from '@angular/core';
import * as Bowser from 'bowser';
import { Store } from '@ngrx/store';
import { Selectors } from '@mm-selectors/index';

type VersionSuffix = `` | `-${string}`;
type VersionNumber = 'SNAPSHOT' | `v${string}.${string}.${string}${VersionSuffix}`;

@Injectable({
  providedIn: 'root'
})
export class BrowserDetectorService {
  private _parser: Bowser.Parser.Parser;
  private androidAppVersion: VersionNumber | undefined;

  public constructor(private store: Store) {
    this.store.select(Selectors.getAndroidAppVersion).subscribe(androidAppVersion => {
      this.androidAppVersion = androidAppVersion;
    });
  }

  private get parser() {
    // lazy initialization to allow unit tests to use a different user agent
    if (typeof this._parser === 'undefined') {
      this._parser = Bowser.getParser(window.navigator.userAgent);
    }

    return this._parser;
  }

  public detect() {
    return this.parser.getBrowser();
  }

  public isUsingSupportedBrowser() {
    return this.parser.satisfies({
      chrome: '>=80', // Chrome 80 was released on February 4, 2020; for desktop and Android.
      firefox: '>=98', // Firefox 93 was released on October 5, 2021; for desktop and Android.
    });
  }

  public isUsingChtAndroid() {
    return typeof this.androidAppVersion !== 'undefined';
  }

  public isUsingChtAndroidV1() {
    if (!this.isUsingChtAndroid()) {
      return false;
    }

    return this.androidAppVersion.startsWith('v1.');
  }
}
