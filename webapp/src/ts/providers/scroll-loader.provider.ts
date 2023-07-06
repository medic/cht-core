import { Injectable, NgZone } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ScrollLoaderProvider {
  constructor(
    private ngZone:NgZone,
  ) { }

  init(callback, selector='.inbox-items .items-container') {
    const _check = (event) => {
      const element = event.target;
      if (element.scrollHeight - element.scrollTop - 10 < element.clientHeight) {
        this.ngZone.run(callback);
      }
    };
    this.ngZone.runOutsideAngular(() => {
      $(selector)
        .off('scroll', _check)
        .on('scroll', _check);
    });
  }
}
