import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { ContactGeolocationService, GeolocationEditState } from '@mm-services/contact-geolocation.service';
import { DbService } from '@mm-services/db.service';

describe('ContactGeolocationService', () => {
  let service: ContactGeolocationService;
  let dbGet;

  beforeEach(() => {
    dbGet = sinon.stub();
    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: () => ({ get: dbGet }) } },
      ]
    });
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

  const stateFor = (context?: string, value?: string) => service.readCaptureState(
    buildFormHtml({ context, value }).formHtml
  );

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

  describe('recordCapture', () => {
    it('returns the docs unchanged when there is no geoHandle', async () => {
      const docs = [{ _id: 'doc1' }];
      const result = await service.recordCapture(undefined, docs, stateFor('home'));
      expect(result).to.equal(docs);
    });

    it('sets is_home: true and writes geolocation when context is home and capture succeeds', async () => {
      const geoData = { latitude: 1, longitude: 2, accuracy: 4 };
      const geoHandle = () => Promise.resolve(geoData);
      const docs: any[] = [{ _id: 'doc1' }];

      await service.recordCapture(geoHandle, docs, stateFor('home'));

      expect(docs[0].geolocation_log).to.have.lengthOf(1);
      expect(docs[0].geolocation_log[0].is_home).to.be.true;
      expect(docs[0].geolocation_log[0].recording).to.deep.equal(geoData);
      expect(docs[0].geolocation).to.deep.equal(geoData);
    });

    it('sets is_home: false and does not write geolocation when context is other', async () => {
      const geoData = { latitude: 1, longitude: 2, accuracy: 4 };
      const geoHandle = () => Promise.resolve(geoData);
      const docs: any[] = [{ _id: 'doc1' }];

      await service.recordCapture(geoHandle, docs, stateFor('other'));

      expect(docs[0].geolocation_log[0].is_home).to.be.false;
      expect(docs[0].geolocation).to.be.undefined;
    });

    it('omits is_home entirely when there is no context', async () => {
      const geoData = { latitude: 1, longitude: 2, accuracy: 4 };
      const geoHandle = () => Promise.resolve(geoData);
      const docs: any[] = [{ _id: 'doc1' }];

      await service.recordCapture(geoHandle, docs, stateFor(undefined));

      expect(docs[0].geolocation_log[0]).to.not.have.property('is_home');
      expect(docs[0].geolocation).to.be.undefined;
    });

    it('does not write geolocation on a failed home capture, but still logs it', async () => {
      const geoError = { code: 2, message: 'Position unavailable' };
      const geoHandle = () => Promise.resolve(geoError);
      const docs: any[] = [{ _id: 'doc1' }];

      await service.recordCapture(geoHandle, docs, stateFor('home'));

      expect(docs[0].geolocation_log[0].recording).to.deep.equal(geoError);
      expect(docs[0].geolocation_log[0].is_home).to.be.true;
      expect(docs[0].geolocation).to.be.undefined;
    });

    it('records the same capture onto every doc passed in', async () => {
      const geoData = { latitude: 1, longitude: 2, accuracy: 4 };
      const geoHandle = () => Promise.resolve(geoData);
      const docs: any[] = [{ _id: 'doc1' }, { _id: 'doc2' }];

      await service.recordCapture(geoHandle, docs, stateFor('home'));

      expect(docs[0].geolocation).to.deep.equal(geoData);
      expect(docs[1].geolocation).to.deep.equal(geoData);
    });

    it('records a rejected geoHandle as the log entry recording', async () => {
      const geoHandle = () => Promise.reject(new Error('boom'));
      const docs: any[] = [{ _id: 'doc1' }];

      await service.recordCapture(geoHandle, docs, stateFor('other'));

      expect(docs[0].geolocation_log[0].recording).to.be.instanceOf(Error);
      expect(docs[0].geolocation).to.be.undefined;
    });
  });

  describe('restoreOriginalIfNeeded', () => {
    const originalDoc = {
      _id: 'contact1',
      geolocation: { latitude: 1, longitude: 2 },
      geolocation_log: [{ timestamp: 111, recording: { latitude: 1, longitude: 2 }, is_home: true }],
    };

    it('does nothing when there is no docId', async () => {
      const docs: any[] = [{ _id: 'contact1', geolocation: 'stale' }];
      await service.restoreOriginalIfNeeded(undefined, docs, stateFor('home', 'kept'));
      expect(dbGet.callCount).to.equal(0);
      expect(docs[0].geolocation).to.equal('stale');
    });

    it('does nothing when captureValue is "skipped"', async () => {
      const docs: any[] = [{ _id: 'contact1', geolocation: 'stale' }];
      await service.restoreOriginalIfNeeded('contact1', docs, stateFor(undefined, 'skipped'));
      expect(dbGet.callCount).to.equal(0);
      expect(docs[0].geolocation).to.equal('stale');
    });

    it('does nothing when captureValue is "captured" and context is home', async () => {
      const docs: any[] = [{ _id: 'contact1', geolocation: 'stale' }];
      await service.restoreOriginalIfNeeded('contact1', docs, stateFor('home', 'captured'));
      expect(dbGet.callCount).to.equal(0);
      expect(docs[0].geolocation).to.equal('stale');
    });

    it('restores geolocation and geolocation_log when captureValue is "kept"', async () => {
      dbGet.withArgs('contact1').resolves(originalDoc);
      const docs: any[] = [{ _id: 'contact1', geolocation: 'stale', geolocation_log: ['stale-log'] }];

      await service.restoreOriginalIfNeeded('contact1', docs, stateFor('home', 'kept'));

      expect(dbGet.callCount).to.equal(1);
      expect(docs[0].geolocation).to.deep.equal(originalDoc.geolocation);
      expect(docs[0].geolocation_log).to.deep.equal(originalDoc.geolocation_log);
    });

    it('restores only geolocation, not geolocation_log, when captured and context is not home', async () => {
      dbGet.withArgs('contact1').resolves(originalDoc);
      const docs: any[] = [{ _id: 'contact1', geolocation: 'stale', geolocation_log: ['fresh-log-entry'] }];

      await service.restoreOriginalIfNeeded('contact1', docs, stateFor('other', 'captured'));

      expect(docs[0].geolocation).to.deep.equal(originalDoc.geolocation);
      expect(docs[0].geolocation_log).to.deep.equal(['fresh-log-entry']);
    });

    it('makes only one DB fetch regardless of which restore case applies', async () => {
      dbGet.withArgs('contact1').resolves(originalDoc);
      const docs: any[] = [{ _id: 'contact1' }];

      await service.restoreOriginalIfNeeded('contact1', docs, stateFor('home', 'kept'));

      expect(dbGet.callCount).to.equal(1);
    });

    it('does not throw when the doc is not found in the docs array', async () => {
      dbGet.withArgs('contact1').resolves(originalDoc);
      const docs: any[] = [{ _id: 'someone-else' }];

      await expect(service.restoreOriginalIfNeeded('contact1', docs, stateFor('home', 'kept'))).to.not.be.rejected;
    });

    it('does not throw when the original doc is not found', async () => {
      dbGet.withArgs('contact1').resolves(undefined);
      const docs: any[] = [{ _id: 'contact1', geolocation: 'stale' }];

      await service.restoreOriginalIfNeeded('contact1', docs, stateFor('home', 'kept'));

      expect(docs[0].geolocation).to.equal('stale');
    });
  });

  describe('stripCaptureField', () => {
    it('does nothing when fieldName is undefined', () => {
      const doc = { geo_capture: 'captured' };
      service.stripCaptureField(doc, undefined);
      expect(doc.geo_capture).to.equal('captured');
    });

    it('deletes the field directly on the doc (contact shape)', () => {
      const doc: any = { geo_capture: 'captured' };
      service.stripCaptureField(doc, 'geo_capture');
      expect(doc).to.not.have.property('geo_capture');
    });

    it('deletes the field from doc.fields (report shape)', () => {
      const doc: any = { fields: { geo_capture: 'captured' } };
      service.stripCaptureField(doc, 'geo_capture');
      expect(doc.fields).to.not.have.property('geo_capture');
    });

    it('deletes from both locations if both happen to be present', () => {
      const doc: any = { geo_capture: 'captured', fields: { geo_capture: 'captured' } };
      service.stripCaptureField(doc, 'geo_capture');
      expect(doc).to.not.have.property('geo_capture');
      expect(doc.fields).to.not.have.property('geo_capture');
    });

    it('does not throw when the field is absent from both locations', () => {
      const doc: any = { fields: {} };
      expect(() => service.stripCaptureField(doc, 'geo_capture')).to.not.throw();
    });
  });
});

describe('GeolocationEditState', () => {
  const buildCaptureInput = (attrs: {
    hasLocation?: string;
    isEdit?: string;
    context?: string;
    value?: string;
    name?: string;
  } = {}) => {
    const input = document.createElement('input');
    if (attrs.hasLocation !== undefined) {
      input.dataset.geoHasLocation = attrs.hasLocation;
    }
    if (attrs.isEdit !== undefined) {
      input.dataset.geoIsEdit = attrs.isEdit;
    }
    if (attrs.context !== undefined) {
      input.dataset.geoContext = attrs.context;
    }
    if (attrs.value !== undefined) {
      input.value = attrs.value;
    }
    if (attrs.name !== undefined) {
      input.setAttribute('name', attrs.name);
    }
    return input;
  };

  describe('when no capture input is provided', () => {
    it('defaults hasLocation and isEdit to false', () => {
      const state = new GeolocationEditState();
      expect(state.hasLocation).to.be.false;
      expect(state.isEdit).to.be.false;
    });

    it('defaults context, captureValue, and fieldName to undefined', () => {
      const state = new GeolocationEditState();
      expect(state.context).to.be.undefined;
      expect(state.captureValue).to.be.undefined;
      expect(state.fieldName).to.be.undefined;
    });

    it('does not throw when given null', () => {
      expect(() => new GeolocationEditState(null)).to.not.throw();
    });
  });

  describe('hasLocation', () => {
    it('is true when data-geo-has-location is "true"', () => {
      const state = new GeolocationEditState(buildCaptureInput({ hasLocation: 'true' }));
      expect(state.hasLocation).to.be.true;
    });

    it('is false when data-geo-has-location is absent', () => {
      const state = new GeolocationEditState(buildCaptureInput());
      expect(state.hasLocation).to.be.false;
    });
  });

  describe('isEdit', () => {
    it('is true when data-geo-is-edit is "true"', () => {
      const state = new GeolocationEditState(buildCaptureInput({ isEdit: 'true' }));
      expect(state.isEdit).to.be.true;
    });

    it('is false when data-geo-is-edit is absent', () => {
      const state = new GeolocationEditState(buildCaptureInput());
      expect(state.isEdit).to.be.false;
    });
  });

  describe('context', () => {
    it('reflects data-geo-context when present', () => {
      const state = new GeolocationEditState(buildCaptureInput({ context: 'home' }));
      expect(state.context).to.equal('home');
    });

    it('is undefined when data-geo-context is absent', () => {
      const state = new GeolocationEditState(buildCaptureInput());
      expect(state.context).to.be.undefined;
    });
  });

  describe('captureValue', () => {
    it('reflects the input value when present', () => {
      const state = new GeolocationEditState(buildCaptureInput({ value: 'captured' }));
      expect(state.captureValue).to.equal('captured');
    });

    it('is undefined when the input value is empty', () => {
      const state = new GeolocationEditState(buildCaptureInput({ value: '' }));
      expect(state.captureValue).to.be.undefined;
    });
  });

  describe('fieldName', () => {
    it('derives the field name from the last segment of the name attribute', () => {
      const state = new GeolocationEditState(buildCaptureInput({ name: '/data/geolocation/geo_capture' }));
      expect(state.fieldName).to.equal('geo_capture');
    });

    it('is undefined when the name attribute is absent', () => {
      const state = new GeolocationEditState(buildCaptureInput());
      expect(state.fieldName).to.be.undefined;
    });
  });

  describe('isKept', () => {
    it('is true when captureValue is "kept"', () => {
      const state = new GeolocationEditState(buildCaptureInput({ value: 'kept' }));
      expect(state.isKept).to.be.true;
    });

    it('is false otherwise', () => {
      const state = new GeolocationEditState(buildCaptureInput({ value: 'captured' }));
      expect(state.isKept).to.be.false;
    });
  });

  describe('isCaptured', () => {
    it('is true when captureValue is "captured"', () => {
      const state = new GeolocationEditState(buildCaptureInput({ value: 'captured' }));
      expect(state.isCaptured).to.be.true;
    });

    it('is false otherwise', () => {
      const state = new GeolocationEditState(buildCaptureInput({ value: 'skipped' }));
      expect(state.isCaptured).to.be.false;
    });
  });

  describe('isHome', () => {
    it('is true when context is "home"', () => {
      const state = new GeolocationEditState(buildCaptureInput({ context: 'home' }));
      expect(state.isHome).to.be.true;
    });

    it('is false otherwise', () => {
      const state = new GeolocationEditState(buildCaptureInput({ context: 'other' }));
      expect(state.isHome).to.be.false;
    });
  });
});
