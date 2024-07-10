import { Injectable } from '@angular/core';
import * as Bowser from 'bowser';
import { Store } from '@ngrx/store';
import { Selectors } from '@mm-selectors/index';
const OUTDATED_BROWSER_VERSION_MIN = '74';
const OUTDATED_BROWSER_VERSION_MAX = '90';

type VersionSuffix = `` | `-${string}`;
type VersionNumber = 'SNAPSHOT' | `v${string}.${string}.${string}${VersionSuffix}`;

@Injectable({
  providedIn: 'root'
})
export class BrowserDetectorService {
  private _parser?: Bowser.Parser.Parser;
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
      chrome: '>=90', // Chrome 90 was released on April 14, 2021; for desktop and Android.
      firefox: '>=98', // Firefox 98 was released on March 8, 2022; for desktop and Android.
    });
  }

  public isUsingOutdatedBrowser() {
    return (
      this.parser.satisfies({ chrome: `>${OUTDATED_BROWSER_VERSION_MIN}` }) &&
      this.parser.satisfies({ chrome: `<${OUTDATED_BROWSER_VERSION_MAX}` })
    );
  }

  public isUsingChtAndroid() {
    return typeof this.androidAppVersion !== 'undefined';
  }

  public isUsingChtAndroidV1() {
    if (!this.isUsingChtAndroid()) {
      return false;
    }

    return this.androidAppVersion?.startsWith('v1.');
  }
}
