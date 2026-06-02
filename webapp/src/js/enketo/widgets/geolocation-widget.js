'use strict';
const Widget = require('enketo-core/src/js/widget').default;

class GeolocationWidget extends Widget {
  static get selector() {
    return '.or-appearance-geolocation-capture input';
  }

  _init() {
    if (this._isPermissionDenied()) {
      const el = document.createElement('p');
      el.className = 'geolocation-permission-denied';
      this.question.appendChild(el);
      return window.CHTCore.Translate.get('geolocation.permission.denied')
        .then(text => { el.textContent = text; });
    } else if (!this._isGeolocationAvailable()) {
      const el = document.createElement('p');
      el.className = 'geolocation-unavailable';
      this.question.appendChild(el);
      return window.CHTCore.Translate.get('geolocation.unavailable')
        .then(text => { el.textContent = text; });
    } else {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'geolocation-capture-btn';
      button.addEventListener('click', () => this._startCapture());
      this.question.appendChild(button);
      return window.CHTCore.Translate.get('geolocation.capture')
        .then(text => { button.textContent = text; });
    }
  }

  _startCapture() {
    [
      '.geolocation-capture-btn',
      '.geolocation-progress-bar',
      '.geolocation-retry-btn',
      '.geolocation-skip-btn',
      '.geolocation-success-msg',
    ].forEach(sel => this.question.querySelector(sel)?.remove());

    const bar = document.createElement('div');
    bar.className = 'geolocation-progress-bar';
    this.question.appendChild(bar);

    window.CHTCore.Geolocation.currentPromise.then(result => {
      if ('code' in result) {
        bar.classList.add('geolocation-progress-failure');

        const retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.className = 'geolocation-retry-btn';
        retryBtn.addEventListener('click', () => {
          window.CHTCore.Geolocation.retry();
          this._startCapture();
        });
        this.question.appendChild(retryBtn);
        window.CHTCore.Translate.get('geolocation.retry')
          .then(text => { retryBtn.textContent = text; });

        const skipBtn = document.createElement('button');
        skipBtn.type = 'button';
        skipBtn.className = 'geolocation-skip-btn';
        this.question.appendChild(skipBtn);
        window.CHTCore.Translate.get('geolocation.skip')
          .then(text => { skipBtn.textContent = text; });

        this.element.value = 'not_captured';
        this.element.dispatchEvent(new Event('change'));
      } else {
        bar.classList.add('geolocation-progress-success');

        const msg = document.createElement('p');
        msg.className = 'geolocation-success-msg';
        this.question.appendChild(msg);
        window.CHTCore.Translate.get('geolocation.success')
          .then(text => { msg.textContent = text; });

        this.element.value = 'captured';
        this.element.dispatchEvent(new Event('change'));
      }
    });
  }

  _isGeolocationAvailable() {
    return !!window.navigator.geolocation;
  }

  _isPermissionDenied() {
    try {
      if (!window.medicmobile_android || typeof window.medicmobile_android.getLocationPermissions !== 'function') {
        return false;
      }
      return !window.medicmobile_android.getLocationPermissions();
    } catch (err) {
      return false;
    }
  }
}

module.exports = GeolocationWidget;
