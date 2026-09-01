import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { ContactGeolocationService, GeolocationEditState } from '@mm-services/contact-geolocation.service';

describe('ContactGeolocationService', () => {
  let service: ContactGeolocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContactGeolocationService);
  });

  const buildFormHtml = (attrs: {
    value?: string; context?: string; name?: string; original?: any; originalLog?: any; hasLocation?: boolean;
  } = {}) => {
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
    if (attrs.original !== undefined) {
      captureInput.dataset.geoOriginal = JSON.stringify(attrs.original);
    }
    if (attrs.originalLog !== undefined) {
      captureInput.dataset.geoOriginalLog = JSON.stringify(attrs.originalLog);
    }
    if (attrs.hasLocation) {
      captureInput.dataset.geoHasLocation = 'true';
    }
    const captureWrapper = document.createElement('div');
    captureWrapper.classList.add('or-appearance-geolocation-capture');
    captureWrapper.appendChild(captureInput);
    const formHtml = document.createElement('div');
    formHtml.appendChild(captureWrapper);
    return { formHtml, captureInput };
  };

  const stateFor = (context?: string, value?: string, original?: any, originalLog?: any) => service.readCaptureState(
    buildFormHtml({ context, value, original, originalLog }).formHtml
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

    it('sets data-geo-has-location when latitude and longitude are at the extreme valid bounds', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, {
        _id: 'contact1',
        geolocation: { latitude: 90, longitude: -180 },
      });
      expect(captureInput.dataset.geoHasLocation).to.equal('true');
    });

    it('does not set data-geo-has-location when longitude is missing', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, {
        _id: 'contact1',
        geolocation: { latitude: 1.23 },
      });
      expect(captureInput.dataset.geoHasLocation).to.be.undefined;
    });

    it('does not set data-geo-has-location when longitude is not a number', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, {
        _id: 'contact1',
        geolocation: { latitude: 1.23, longitude: 'not-a-number' },
      });
      expect(captureInput.dataset.geoHasLocation).to.be.undefined;
    });

    it('does not set data-geo-has-location when latitude is out of range', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, {
        _id: 'contact1',
        geolocation: { latitude: 200, longitude: 36.8 },
      });
      expect(captureInput.dataset.geoHasLocation).to.be.undefined;
    });

    it('does not set data-geo-has-location when longitude is out of range', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, {
        _id: 'contact1',
        geolocation: { latitude: 1.23, longitude: -200 },
      });
      expect(captureInput.dataset.geoHasLocation).to.be.undefined;
    });

    it('does not set data-geo-has-location when latitude is NaN', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, {
        _id: 'contact1',
        geolocation: { latitude: NaN, longitude: 36.8 },
      });
      expect(captureInput.dataset.geoHasLocation).to.be.undefined;
    });

    it('does not set data-geo-has-location when longitude is Infinity', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, {
        _id: 'contact1',
        geolocation: { latitude: 1.23, longitude: Infinity },
      });
      expect(captureInput.dataset.geoHasLocation).to.be.undefined;
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

    it('sets data-geo-original to the JSON-stringified original geolocation when a valid location exists', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, {
        _id: 'contact1',
        geolocation: { latitude: 1.23, longitude: 36.8 },
      });
      expect(JSON.parse(captureInput.dataset.geoOriginal!)).to.deep.equal({ latitude: 1.23, longitude: 36.8 });
    });

    it('does not set data-geo-original when geolocation is invalid', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, { _id: 'contact1' });
      expect(captureInput.dataset.geoOriginal).to.be.undefined;
    });

    it('does not set data-geo-original when contact is undefined', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, undefined);
      expect(captureInput.dataset.geoOriginal).to.be.undefined;
    });

    it('sets data-geo-original-log to the JSON-stringified original geolocation_log when a valid location exists',
      () => {
        const { formHtml, captureInput } = buildFormHtml();
        service.injectEditContext(formHtml, {
          _id: 'contact1',
          geolocation: { latitude: 1.23, longitude: 36.8 },
          geolocation_log: [
            { timestamp: EARLIER_CAPTURE_TS, recording: { latitude: 1.23, longitude: 36.8 }, is_home: true }
          ],
        });
        expect(JSON.parse(captureInput.dataset.geoOriginalLog!)).to.deep.equal([
          { timestamp: EARLIER_CAPTURE_TS, recording: { latitude: 1.23, longitude: 36.8 }, is_home: true }
        ]);
      });

    it('sets data-geo-original-log to "null" when geolocation_log is absent but geolocation is valid', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, {
        _id: 'contact1',
        geolocation: { latitude: 1.23, longitude: 36.8 },
      });
      expect(JSON.parse(captureInput.dataset.geoOriginalLog!)).to.be.null;
    });

    it('does not set data-geo-original-log when geolocation is invalid', () => {
      const { formHtml, captureInput } = buildFormHtml();
      service.injectEditContext(formHtml, { _id: 'contact1' });
      expect(captureInput.dataset.geoOriginalLog).to.be.undefined;
    });
  });

  describe('applyGeolocation', () => {
    const original = { latitude: 1, longitude: 2 };
    const originalLog = [{ timestamp: 111, recording: original, is_home: true }];

    describe('when kept', () => {
      it('restores geolocation and geolocation_log from the state, without calling geoHandle', async () => {
        const geoHandle = sinon.stub();
        const docs: any[] = [{ _id: 'doc1', geolocation: 'stale', geolocation_log: ['stale-log'] }];

        await service.applyGeolocation(geoHandle, docs, stateFor('home', 'kept', original, originalLog));

        expect(geoHandle.callCount).to.equal(0);
        expect(docs[0].geolocation).to.deep.equal(original);
        expect(docs[0].geolocation_log).to.deep.equal(originalLog);
      });

      it('applies to every doc passed in', async () => {
        const docs: any[] = [{ _id: 'doc1' }, { _id: 'doc2' }];

        await service.applyGeolocation(undefined, docs, stateFor('home', 'kept', original, originalLog));

        expect(docs[0].geolocation).to.deep.equal(original);
        expect(docs[1].geolocation).to.deep.equal(original);
      });
    });

    describe('when skipped', () => {
      const stateForSkipped = (hasLocation: boolean) => service.readCaptureState(
        buildFormHtml({ value: 'skipped', hasLocation }).formHtml
      );

      describe('and a location already exists ("Remove household location")', () => {
        it('deletes geolocation without calling geoHandle', async () => {
          const geoHandle = sinon.stub();
          const docs: any[] = [{ _id: 'doc1', geolocation: 'stale' }];

          await service.applyGeolocation(geoHandle, docs, stateForSkipped(true));

          expect(geoHandle.callCount).to.equal(0);
          expect(docs[0]).to.not.have.property('geolocation');
        });

        it('does not touch geolocation_log', async () => {
          const geoHandle = sinon.stub();
          const docs: any[] = [{ _id: 'doc1', geolocation_log: ['untouched'] }];

          await service.applyGeolocation(geoHandle, docs, stateForSkipped(true));

          expect(docs[0].geolocation_log).to.deep.equal(['untouched']);
        });

        it('applies to every doc passed in', async () => {
          const docs: any[] = [{ _id: 'doc1', geolocation: 'stale' }, { _id: 'doc2', geolocation: 'stale' }];

          await service.applyGeolocation(undefined, docs, stateForSkipped(true));

          expect(docs[0]).to.not.have.property('geolocation');
          expect(docs[1]).to.not.have.property('geolocation');
        });
      });

      describe('and no location exists yet ("save without location")', () => {
        it('still logs a successful late capture even though geolocation is not recorded', async () => {
          const geoData = { latitude: 1, longitude: 2, accuracy: 4 };
          const geoHandle = () => Promise.resolve(geoData);
          const docs: any[] = [{ _id: 'doc1' }];

          await service.applyGeolocation(geoHandle, docs, stateForSkipped(false));

          expect(docs[0]).to.not.have.property('geolocation');
          expect(docs[0].geolocation_log).to.have.lengthOf(1);
          expect(docs[0].geolocation_log[0].recording).to.deep.equal(geoData);
          expect(docs[0].geolocation_log[0]).to.not.have.property('is_home');
        });

        it('logs a permission-denied/failed capture the same way', async () => {
          const geoError = { code: 1, message: 'User denied Geolocation' };
          const geoHandle = () => Promise.resolve(geoError);
          const docs: any[] = [{ _id: 'doc1' }];

          await service.applyGeolocation(geoHandle, docs, stateForSkipped(false));

          expect(docs[0]).to.not.have.property('geolocation');
          expect(docs[0].geolocation_log[0].recording).to.deep.equal(geoError);
        });

        it('appends to an existing geolocation_log rather than replacing it', async () => {
          const geoData = { latitude: 1, longitude: 2 };
          const geoHandle = () => Promise.resolve(geoData);
          const docs: any[] = [{ _id: 'doc1', geolocation_log: ['existing-entry'] }];

          await service.applyGeolocation(geoHandle, docs, stateForSkipped(false));

          expect(docs[0].geolocation_log).to.have.lengthOf(2);
          expect(docs[0].geolocation_log[0]).to.equal('existing-entry');
        });

        it('does not call geoHandle when none is provided, and still deletes geolocation', async () => {
          const docs: any[] = [{ _id: 'doc1', geolocation: 'stale' }];

          await service.applyGeolocation(undefined, docs, stateForSkipped(false));

          expect(docs[0]).to.not.have.property('geolocation');
          expect(docs[0]).to.not.have.property('geolocation_log');
        });

        it('applies to every doc passed in', async () => {
          const geoData = { latitude: 1, longitude: 2 };
          const geoHandle = () => Promise.resolve(geoData);
          const docs: any[] = [{ _id: 'doc1' }, { _id: 'doc2' }];

          await service.applyGeolocation(geoHandle, docs, stateForSkipped(false));

          expect(docs[0].geolocation_log).to.have.lengthOf(1);
          expect(docs[1].geolocation_log).to.have.lengthOf(1);
        });
      });
    });

    describe('when captured and home', () => {
      it('writes the captured geolocation and logs it with is_home: true on success', async () => {
        const geoData = { latitude: 5, longitude: 6, accuracy: 4 };
        const geoHandle = () => Promise.resolve(geoData);
        const docs: any[] = [{ _id: 'doc1' }];

        await service.applyGeolocation(geoHandle, docs, stateFor('home', 'captured', original, originalLog));

        expect(docs[0].geolocation).to.deep.equal(geoData);
        expect(docs[0].geolocation_log).to.have.lengthOf(1);
        expect(docs[0].geolocation_log[0].is_home).to.be.true;
        expect(docs[0].geolocation_log[0].recording).to.deep.equal(geoData);
      });

      it('falls back to the original geolocation and still logs the failure when capture fails', async () => {
        const geoError = { code: 2, message: 'Position unavailable' };
        const geoHandle = () => Promise.resolve(geoError);
        const docs: any[] = [{ _id: 'doc1' }];

        await service.applyGeolocation(geoHandle, docs, stateFor('home', 'captured', original, originalLog));

        expect(docs[0].geolocation).to.deep.equal(original);
        expect(docs[0].geolocation_log[0].recording).to.deep.equal(geoError);
        expect(docs[0].geolocation_log[0].is_home).to.be.true;
      });
    });

    describe('when captured and not home', () => {
      it('leaves geolocation as the original regardless of capture outcome, but still logs the attempt',
        async () => {
          const geoData = { latitude: 5, longitude: 6, accuracy: 4 };
          const geoHandle = () => Promise.resolve(geoData);
          const docs: any[] = [{ _id: 'doc1' }];

          await service.applyGeolocation(geoHandle, docs, stateFor('other', 'captured', original, originalLog));

          expect(docs[0].geolocation).to.deep.equal(original);
          expect(docs[0].geolocation_log[0].is_home).to.be.false;
          expect(docs[0].geolocation_log[0].recording).to.deep.equal(geoData);
        });
    });

    describe('when captured with no context', () => {
      it('omits is_home from the log entry and treats it as not home', async () => {
        const geoData = { latitude: 5, longitude: 6, accuracy: 4 };
        const geoHandle = () => Promise.resolve(geoData);
        const docs: any[] = [{ _id: 'doc1' }];

        await service.applyGeolocation(geoHandle, docs, stateFor(undefined, 'captured', original, originalLog));

        expect(docs[0].geolocation_log[0]).to.not.have.property('is_home');
        expect(docs[0].geolocation).to.deep.equal(original);
      });
    });

    it('records the same capture onto every doc passed in', async () => {
      const geoData = { latitude: 5, longitude: 6, accuracy: 4 };
      const geoHandle = () => Promise.resolve(geoData);
      const docs: any[] = [{ _id: 'doc1' }, { _id: 'doc2' }];

      await service.applyGeolocation(geoHandle, docs, stateFor('home', 'captured'));

      expect(docs[0].geolocation).to.deep.equal(geoData);
      expect(docs[1].geolocation).to.deep.equal(geoData);
    });

    it('records a rejected geoHandle as the log entry recording', async () => {
      const geoHandle = () => Promise.reject(new Error('boom'));
      const docs: any[] = [{ _id: 'doc1' }];

      await service.applyGeolocation(geoHandle, docs, stateFor('other', 'captured', original, originalLog));

      expect(docs[0].geolocation_log[0].recording).to.be.instanceOf(Error);
      expect(docs[0].geolocation).to.deep.equal(original);
    });

    it('returns the docs unchanged when captured but there is no geoHandle', async () => {
      const docs = [{ _id: 'doc1' }];

      const result = await service.applyGeolocation(undefined, docs, stateFor('home', 'captured'));

      expect(result).to.equal(docs);
      expect(docs[0]).to.not.have.property('geolocation');
    });
  });

  describe('stripCaptureField', () => {
    const stateWithFieldName = (name?: string) => service.readCaptureState(buildFormHtml({ name }).formHtml);

    it('does nothing when fieldName is undefined', () => {
      const doc = { geo_capture: 'captured' };
      service.stripCaptureField(doc, stateWithFieldName());
      expect(doc.geo_capture).to.equal('captured');
    });

    it('deletes the field directly on the doc (contact shape)', () => {
      const doc: any = { geo_capture: 'captured' };
      service.stripCaptureField(doc, stateWithFieldName('geo_capture'));
      expect(doc).to.not.have.property('geo_capture');
    });

    it('deletes the field from doc.fields (report shape)', () => {
      const doc: any = { fields: { geo_capture: 'captured' } };
      service.stripCaptureField(doc, stateWithFieldName('geo_capture'));
      expect(doc.fields).to.not.have.property('geo_capture');
    });

    it('deletes from both locations if both happen to be present', () => {
      const doc: any = { geo_capture: 'captured', fields: { geo_capture: 'captured' } };
      service.stripCaptureField(doc, stateWithFieldName('geo_capture'));
      expect(doc).to.not.have.property('geo_capture');
      expect(doc.fields).to.not.have.property('geo_capture');
    });

    it('does not throw when the field is absent from both locations', () => {
      const doc: any = { fields: {} };
      expect(() => service.stripCaptureField(doc, stateWithFieldName('geo_capture'))).to.not.throw();
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
    original?: string;
    originalLog?: string;
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
    if (attrs.original !== undefined) {
      input.dataset.geoOriginal = attrs.original;
    }
    if (attrs.originalLog !== undefined) {
      input.dataset.geoOriginalLog = attrs.originalLog;
    }
    return input;
  };

  describe('when no capture input is provided', () => {
    it('defaults hasLocation and isEdit to false', () => {
      const state = new GeolocationEditState();
      expect(state.hasLocation).to.be.false;
      expect(state.isEdit).to.be.false;
    });

    it('defaults context, captureValue, fieldName, originalGeolocation, and originalGeolocationLog to undefined',
      () => {
        const state = new GeolocationEditState();
        expect(state.context).to.be.undefined;
        expect(state.captureValue).to.be.undefined;
        expect(state.fieldName).to.be.undefined;
        expect(state.originalGeolocation).to.be.undefined;
        expect(state.originalGeolocationLog).to.be.undefined;
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

  describe('originalGeolocation', () => {
    it('parses data-geo-original as JSON when present', () => {
      const original = JSON.stringify({ latitude: 1.23, longitude: 36.8 });
      const state = new GeolocationEditState(buildCaptureInput({ original }));
      expect(state.originalGeolocation).to.deep.equal({ latitude: 1.23, longitude: 36.8 });
    });

    it('is undefined when data-geo-original is absent', () => {
      const state = new GeolocationEditState(buildCaptureInput());
      expect(state.originalGeolocation).to.be.undefined;
    });

    it('is undefined when data-geo-original is not valid JSON', () => {
      const state = new GeolocationEditState(buildCaptureInput({ original: 'not-json' }));
      expect(state.originalGeolocation).to.be.undefined;
    });
  });

  describe('originalGeolocationLog', () => {
    it('parses data-geo-original-log as JSON when present', () => {
      const originalLog = JSON.stringify([{ timestamp: 1, recording: { latitude: 1.23, longitude: 36.8 } }]);
      const state = new GeolocationEditState(buildCaptureInput({ originalLog }));
      expect(state.originalGeolocationLog).to.deep.equal([
        { timestamp: 1, recording: { latitude: 1.23, longitude: 36.8 } }
      ]);
    });

    it('is undefined when data-geo-original-log is absent', () => {
      const state = new GeolocationEditState(buildCaptureInput());
      expect(state.originalGeolocationLog).to.be.undefined;
    });

    it('is undefined when data-geo-original-log is not valid JSON', () => {
      const state = new GeolocationEditState(buildCaptureInput({ originalLog: 'not-json' }));
      expect(state.originalGeolocationLog).to.be.undefined;
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

  describe('isSkipped', () => {
    it('is true when captureValue is "skipped"', () => {
      const state = new GeolocationEditState(buildCaptureInput({ value: 'skipped' }));
      expect(state.isSkipped).to.be.true;
    });

    it('is false otherwise', () => {
      const state = new GeolocationEditState(buildCaptureInput({ value: 'captured' }));
      expect(state.isSkipped).to.be.false;
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

describe('getDistanceInMeters', () => {
  it('should return 0 for the same point', () => {
    const point = { latitude: -1.2921, longitude: 36.8219 };
    expect(getDistanceInMeters(point, point)).to.equal(0);
  });

  it('should be symmetric', () => {
    const a = { latitude: -1.2921, longitude: 36.8219 };
    const b = { latitude: -1.31, longitude: 36.79 };
    expect(getDistanceInMeters(a, b)).to.equal(getDistanceInMeters(b, a));
  });

  it('should match known distances', () => {
    // one degree of latitude along a meridian is ~111.2km
    expect(getDistanceInMeters({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).to.be.closeTo(111195, 1);
    // Nairobi to Mombasa
    const nairobi = { latitude: -1.2921, longitude: 36.8219 };
    const mombasa = { latitude: -4.0435, longitude: 39.6682 };
    expect(getDistanceInMeters(nairobi, mombasa)).to.be.closeTo(440000, 2000);
    // antipodes are half the circumference apart
    const antipode = { latitude: 0, longitude: 180 };
    expect(getDistanceInMeters({ latitude: 0, longitude: 0 }, antipode)).to.be.closeTo(20015087, 1);
  });
});
