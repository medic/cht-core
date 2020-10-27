import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ScrollLoaderProvider {
  constructor() { }

  init(callback) {
    const _check = function() {
      if (this.scrollHeight - this.scrollTop - 10 < this.clientHeight) {
        callback();
      }
    };
    window.jQuery('.inbox-items')
      .off('scroll', _check)
      .on('scroll', _check);
  }
}
