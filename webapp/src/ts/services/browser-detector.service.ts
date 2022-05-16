import { Injectable } from '@angular/core';
import * as Bowser from 'bowser';
import { Store } from '@ngrx/store';
import { Selectors } from '@mm-selectors/index';

@Injectable({
  providedIn: 'root'
})
export class BrowserDetectorService {
  private readonly parser = Bowser.getParser(window.navigator.userAgent);
  private androidAppVersion: VersionNumber | undefined;

  public constructor(private store: Store) {
    this.store.select(Selectors.getAndroidAppVersion).subscribe(androidAppVersion => {
      this.androidAppVersion = androidAppVersion;
    });
  }

  public detect() {
    return this.parser.getBrowser();
  }

  public isUsingSupportedBrowser() {
    return this.parser.satisfies({
      chrome: '>=53',
      firefox: '>=98', // latest at the time
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

type VersionSuffix = `` | `-${string}`;
type VersionNumber = 'SNAPSHOT' | `v${string}.${string}.${string}${VersionSuffix}`;
