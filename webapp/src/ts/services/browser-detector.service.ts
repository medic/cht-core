import { Injectable } from '@angular/core';
import * as Bowser from 'bowser';

@Injectable({
  providedIn: 'root'
})
export class BrowserDetectorService {
  private parser = Bowser.getParser(window.navigator.userAgent);

  public detect() {
    return this.parser.getBrowser();
  }

  public isUsingSupportedBrowser() {
    return this.parser.satisfies({
      chrome: '>=53',
      firefox: '>=98', // latest at the time
    });
  }
}
