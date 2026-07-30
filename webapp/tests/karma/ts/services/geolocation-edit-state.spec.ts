import { expect } from 'chai';

import { GeolocationEditState } from '@mm-services/geolocation-edit-state';

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
