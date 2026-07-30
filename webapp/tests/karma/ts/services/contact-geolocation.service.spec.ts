import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';

import { ContactGeolocationService } from '@mm-services/contact-geolocation.service';

describe('ContactGeolocationService', () => {
  let service: ContactGeolocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContactGeolocationService);
  });

  const buildFormHtml = (attrs: { value?: string; context?: string; name?: string } = {}) => {
    const captureInput = document.createElement('input');
    captureInput.type = 'hidden';
    if (attrs.value !== undefined) {
      captureInput.value = attrs.value;
    }
    if (attrs.context !== undefined) {
      captureInput.dataset.geoContext = attrs.context;
    }
    if (attrs.name !== undefined) {
      captureInput.setAttribute('name', attrs.name);
    }
    const captureWrapper = document.createElement('div');
    captureWrapper.classList.add('or-appearance-geolocation-capture');
    captureWrapper.appendChild(captureInput);
    const formHtml = document.createElement('div');
    formHtml.appendChild(captureWrapper);
    return { formHtml, captureInput };
  };

  describe('readCaptureState', () => {
    it('returns a GeolocationEditState with defaults when formHtml is undefined', () => {
      const state = service.readCaptureState(undefined);
      expect(state.captureValue).to.be.undefined;
      expect(state.context).to.be.undefined;
      expect(state.fieldName).to.be.undefined;
    });

    it('returns a GeolocationEditState with defaults when formHtml has no capture input', () => {
      const formHtml = document.createElement('div');
      const state = service.readCaptureState(formHtml);
      expect(state.captureValue).to.be.undefined;
    });

    it('reads captureValue from the capture input', () => {
      const { formHtml } = buildFormHtml({ value: 'captured' });
      expect(service.readCaptureState(formHtml).captureValue).to.equal('captured');
    });

    it('reads context from the capture input', () => {
      const { formHtml } = buildFormHtml({ context: 'home' });
      expect(service.readCaptureState(formHtml).context).to.equal('home');
    });

    it('reads fieldName from the capture input', () => {
      const { formHtml } = buildFormHtml({ name: '/data/geolocation/geo_capture' });
      expect(service.readCaptureState(formHtml).fieldName).to.equal('geo_capture');
    });
  });

  describe('injectEditContext', () => {
    const EARLIER_CAPTURE_TS = 1749168000000; // 2025-06-06T00:00:00.000Z
    const LATER_CAPTURE_TS   = 1749600000000; // 2025-06-11T00:00:00.000Z

    it('does nothing when formHtml is undefined', () => {
      const fn = () => service.injectEditContext(
        undefined,
        { geolocation_log: [{ timestamp: EARLIER_CAPTURE_TS }] }
      );
      expect(fn).not.to.throw();
    });

    it('does nothing when contact is undefined', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, undefined);
      expect(captureInput.dataset.geoHasLocation).to.be.undefined;
      expect(captureInput.dataset.geoIsEdit).to.be.undefined;
    });

    it('does nothing when contact has no geolocation data', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, { _id: 'contact1' });
      expect(captureInput.dataset.geoHasLocation).to.be.undefined;
    });

    it('sets data-geo-is-edit when contact is present even without geolocation data', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, { _id: 'contact1' });
      expect(captureInput.dataset.geoIsEdit).to.equal('true');
    });

    it('sets data-geo-is-edit when contact has geolocation data', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, {
        _id: 'contact1',
        geolocation_log: [
          { timestamp: EARLIER_CAPTURE_TS, recording: { latitude: 1.23, longitude: 36.8 }, is_home: true }
        ],
      });
      expect(captureInput.dataset.geoIsEdit).to.equal('true');
    });

    it('does nothing when contact has empty geolocation_log and no geolocation', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, { _id: 'contact1', geolocation_log: [] });
      expect(captureInput.dataset.geoHasLocation).to.be.undefined;
    });

    it('does nothing when geolocation_log contains only failed recordings and no geolocation', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, {
        _id: 'contact1',
        geolocation: '',
        geolocation_log: [
          { timestamp: EARLIER_CAPTURE_TS, recording: { code: 1, message: 'User denied Geolocation' }, is_home: true }
        ],
      });
      expect(captureInput.dataset.geoHasLocation).to.be.undefined;
    });

    it('does not throw when a log entry has a null recording', () => {
      const { formHtml, captureInput } = buildFormHtml();
      expect(() => service.injectEditContext(formHtml, {
        _id: 'contact1',
        geolocation_log: [
          { timestamp: EARLIER_CAPTURE_TS, recording: null, is_home: false },
          { timestamp: LATER_CAPTURE_TS, recording: { latitude: 1.23, longitude: 36.8 }, is_home: true },
        ],
      })).to.not.throw();
      expect(captureInput.dataset.geoHasLocation).to.be.undefined;
    });

    it('does not set data-geo-has-location when geolocation_log is non-empty but geolocation field is absent', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, {
        _id: 'contact1',
        geolocation_log: [
          { timestamp: EARLIER_CAPTURE_TS, recording: { latitude: 1.23, longitude: 36.8 }, is_home: true }
        ],
      });
      expect(captureInput.dataset.geoHasLocation).to.be.undefined;
    });

    it('sets data-geo-has-location when geolocation exists but log is empty (defensive)', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, {
        _id: 'contact1',
        geolocation_log: [],
        geolocation: { latitude: 1.23, longitude: 36.8 },
      });
      expect(captureInput.dataset.geoHasLocation).to.equal('true');
    });

    it('sets data-geo-has-location when geolocation exists and log field is absent (defensive)', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, {
        _id: 'contact1', geolocation: { latitude: 1.23, longitude: 36.8 }
      });
      expect(captureInput.dataset.geoHasLocation).to.equal('true');
    });

    it('sets data-geo-has-location when latitude is exactly 0 (equator)', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, {
        _id: 'contact1',
        geolocation: { latitude: 0, longitude: 36.8 },
        geolocation_log: [
          { timestamp: EARLIER_CAPTURE_TS, recording: { latitude: 0, longitude: 36.8 }, is_home: true }
        ],
      });
      expect(captureInput.dataset.geoHasLocation).to.equal('true');
    });

    it('does not set data-geo-has-location when only non-home log entries exist and geolocation field is absent',
      () => {
        const { formHtml, captureInput } = buildFormHtml();
        service.injectEditContext(formHtml, {
          _id: 'contact1',
          geolocation_log: [
            { timestamp: EARLIER_CAPTURE_TS, recording: { latitude: 1.23, longitude: 36.8 }, is_home: false },
            { timestamp: LATER_CAPTURE_TS, recording: { latitude: 1.30, longitude: 36.9 }, is_home: false },
          ],
        });
        expect(captureInput.dataset.geoHasLocation).to.be.undefined;
      });

    it('does nothing when geolocation field is absent even if log entries contain past successes', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, {
        _id: 'contact1',
        geolocation_log: [
          { timestamp: EARLIER_CAPTURE_TS, recording: { latitude: 1.23, longitude: 36.8 }, is_home: false },
          { timestamp: LATER_CAPTURE_TS, recording: { code: 2, message: 'Position unavailable' }, is_home: true },
        ],
      });
      expect(captureInput.dataset.geoHasLocation).to.be.undefined;
    });

    it('does nothing when home was removed (geolocation is empty string and last log entry is a failure)', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, {
        _id: 'contact1',
        geolocation: '',
        geolocation_log: [
          { timestamp: EARLIER_CAPTURE_TS, recording: { latitude: 1.23, longitude: 36.8 }, is_home: true },
          { timestamp: LATER_CAPTURE_TS, recording: { code: 2, message: 'Position unavailable' }, is_home: true },
        ],
      });
      expect(captureInput.dataset.geoHasLocation).to.be.undefined;
    });
  });
});
