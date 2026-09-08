import { expect } from 'chai';

import { MapPipe } from '@mm-pipes/map.pipe';

describe('MapPipe', () => {
  const pipe = new MapPipe();

  it('should return undefined when no geolocation', () => {
    expect(pipe.transform(undefined)).to.equal(undefined);
    expect(pipe.transform(null)).to.equal(undefined);
    expect(pipe.transform('')).to.equal(undefined);
    expect(pipe.transform({})).to.equal(undefined);
  });

  it('should return undefined when geolocation is invalid', () => {
    expect(pipe.transform({ latitude: 10 })).to.equal(undefined);
    expect(pipe.transform({ longitude: 10 })).to.equal(undefined);
    expect(pipe.transform({ latitude: '10', longitude: '20' })).to.equal(undefined);
    expect(pipe.transform({ latitude: 91, longitude: 20 })).to.equal(undefined);
    expect(pipe.transform({ latitude: 10, longitude: -181 })).to.equal(undefined);
    expect(pipe.transform({ latitude: NaN, longitude: 20 })).to.equal(undefined);
  });

  it('should return the geolocation when valid', () => {
    const geolocation = { latitude: -1.2921, longitude: 36.8219, accuracy: 10 };
    expect(pipe.transform(geolocation)).to.equal(geolocation);
    expect(pipe.transform({ latitude: 0, longitude: 0 })).to.deep.equal({ latitude: 0, longitude: 0 });
  });
});
