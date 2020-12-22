import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { ZScoreService } from '@mm-services/z-score.service';
import { DbService } from '@mm-services/db.service';
import { ChangesService } from '@mm-services/changes.service';

describe('ZScore service', () => {
  let service;
  let allDocs;
  let Changes;

  beforeEach(() => {
    allDocs = sinon.stub();
    Changes = sinon.stub();
    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: () => ({ allDocs }) } },
        { provide: ChangesService, useValue: { subscribe: Changes } },
      ],
    });
    service = TestBed.inject(ZScoreService);
  });

  afterEach(() => {
    sinon.restore();
  });

  const mockAllDocs = doc => allDocs.resolves({ rows: [ { doc: doc } ] });

  describe('weightForAge calculation', () => {

    const CONFIG_DOC = {
      charts: [{
        id: 'weight-for-age',
        data: {
          male: [
            { key: 0, points: [ 10, 11, 12, 13, 14, 15, 16, 17, 18 ] },
            { key: 1, points: [ 20, 21, 22, 23, 24, 25, 26, 27, 28 ] },
            { key: 2, points: [ 30, 31, 32, 33, 34, 35, 36, 37, 38 ] },
            { key: 3, points: [ 40, 41, 42, 43, 44, 45, 46, 47, 48 ] }
          ]
        }
      }]
    };

    it('returns undefined when no z-score doc', () => {
      allDocs.resolves({ rows: [ ] });
      return service.getScoreUtil().then(util => {
        const consoleErrorMock = sinon.stub(console, 'error');
        const actual = util('weight-for-age', 'male', 10, 150);
        expect(actual).to.equal(undefined);
        expect(consoleErrorMock.callCount).to.equal(1);
        expect(consoleErrorMock.args[0][0]).to.equal('Doc "zscore-charts" not found');
      });
    });

    it('returns undefined for unconfigured chart', () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      mockAllDocs({ charts: [] });
      return service.getScoreUtil().then(util => {
        const actual = util('weight-for-age', 'male', 10, 150);
        expect(actual).to.equal(undefined);
        expect(consoleErrorMock.callCount).to.equal(1);
        expect(consoleErrorMock.args[0][0]).to.equal('Requested z-score table not found');
      });
    });

    it('returns undefined when not given sex', () => {
      mockAllDocs({
        charts: [{
          id: 'weight-for-age',
          data: {}
        }]
      });
      return service.getScoreUtil().then(util => {
        const actual = util('weight-for-age', null, 10, 150);
        expect(actual).to.equal(undefined);
      });
    });

    it('returns undefined when not given weight', () => {
      mockAllDocs({
        charts: [{
          id: 'weight-for-age',
          data: {}
        }]
      });
      return service.getScoreUtil().then(util => {
        const actual = util('weight-for-age', 'male', null, 150);
        expect(actual).to.equal(undefined);
      });
    });

    it('returns undefined when not given age', () => {
      mockAllDocs({
        charts: [{
          id: 'weight-for-age',
          data: {}
        }]
      });
      return service.getScoreUtil().then(util => {
        const actual = util('weight-for-age', 'male', 10, null);
        expect(actual).to.equal(undefined);
      });
    });

    it('returns zscore', () => {
      mockAllDocs(CONFIG_DOC);
      return service.getScoreUtil().then(util => {
        const actual = util('weight-for-age', 'male', 1, 25);
        expect(actual).to.equal(1);
        expect(allDocs.callCount).to.equal(1);
        expect(allDocs.args[0][0].key).to.equal('zscore-charts');
      });
    });

    it('approximates zscore when weight is between data points', () => {
      mockAllDocs(CONFIG_DOC);
      return service.getScoreUtil().then(util => {
        const rough = util('weight-for-age', 'male', 1, 25.753);
        // round to 3dp to ignore tiny errors caused by floats
        const actual = (rough * 1000) / 1000;
        expect(actual).to.equal(1.753);
      });
    });

    it('returns undefined when requested sex not configured', () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      mockAllDocs(CONFIG_DOC);
      return service.getScoreUtil().then(util => {
        const actual = util('weight-for-age', 'female', 1, 25.7);
        expect(actual).to.equal(undefined);
        expect(consoleErrorMock.callCount).to.equal(1);
        expect(consoleErrorMock.args[0][0]).to.equal(
          'The weight-for-age z-score table is not configured for female children'
        );
      });
    });

    it('returns undefined when age is below data range', () => {
      const configDoc = {
        charts: [{
          id: 'weight-for-age',
          data: {
            male: [
              { key: 2, points: [ 30, 31, 32, 33, 34, 35, 36, 37, 38 ] },
              { key: 3, points: [ 40, 41, 42, 43, 44, 45, 46, 47, 48 ] }
            ]
          }
        }]
      };
      mockAllDocs(configDoc);
      return service.getScoreUtil().then(util => {
        const actual = util('weight-for-age', 'male', 1, 25.7);
        expect(actual).to.equal(undefined);
      });
    });

    it('returns undefined when age is above data range', () => {
      mockAllDocs(CONFIG_DOC);
      return service.getScoreUtil().then(util => {
        const actual = util('weight-for-age', 'male', 5, 25.7);
        expect(actual).to.equal(undefined);
      });
    });

    it('returns -4 when weight is below data range', () => {
      mockAllDocs(CONFIG_DOC);
      return service.getScoreUtil().then(util => {
        const actual = util('weight-for-age', 'male', 1, 19);
        expect(actual).to.equal(-4);
      });
    });

    it('returns 4 when weight is above data range', () => {
      mockAllDocs(CONFIG_DOC);
      return service.getScoreUtil().then(util => {
        const actual = util('weight-for-age', 'male', 1, 29);
        expect(actual).to.equal(4);
      });
    });

  });

  describe('heightForAge calculation', () => {

    const CONFIG_DOC = {
      charts: [{
        id: 'height-for-age',
        data: {
          male: [
            { key: 0, points: [ 45.1, 45.3, 45.4, 45.6, 45.8, 46.0, 46.2, 46.8, 49.9 ] },
            { key: 1, points: [ 55.1, 55.3, 55.4, 55.6, 55.8, 56.0, 56.2, 56.8, 59.9 ] },
            { key: 2, points: [ 65.1, 65.3, 65.4, 65.6, 65.8, 66.0, 66.2, 66.8, 69.9 ] },
            { key: 3, points: [ 75.1, 75.3, 75.4, 75.6, 75.8, 76.0, 76.2, 76.8, 79.9 ] },
          ]
        }
      }]
    };

    it('returns zscore', () => {
      mockAllDocs(CONFIG_DOC);
      return service.getScoreUtil().then(util => {
        const actual = util('height-for-age', 'male', 1, 56.1);
        expect(actual).to.equal(1.5);
        expect(allDocs.callCount).to.equal(1);
        expect(allDocs.args[0][0].key).to.equal('zscore-charts');
      });
    });
  });

  describe('weightForHeight calculation', () => {

    const CONFIG_DOC = {
      charts: [{
        id: 'weight-for-height',
        data: {
          male: [
            { key: 45.0, points: [ 10, 11, 12, 13, 14, 15, 16, 17, 18 ] },
            { key: 45.1, points: [ 20, 21, 22, 23, 24, 25, 26, 27, 28 ] },
            { key: 45.2, points: [ 30, 31, 32, 33, 34, 35, 36, 37, 38 ] },
            { key: 45.3, points: [ 40, 41, 42, 43, 44, 45, 46, 47, 48 ] }
          ]
        }
      }]
    };

    it('returns zscore', () => {
      mockAllDocs(CONFIG_DOC);
      return service.getScoreUtil().then(util => {
        const actual = util('weight-for-height', 'male', 45.1, 26.5);
        expect(actual).to.equal(2.5);
        expect(allDocs.callCount).to.equal(1);
        expect(allDocs.args[0][0].key).to.equal('zscore-charts');
      });
    });
  });

  describe('cic test cases', () => {

    const CONFIG_DOC = {
      charts: [{
        id: 'height-for-age',
        data: {
          male: [
            { key: 1071, points: [ 80.872, 84.541, 88.21, 91.879, 95.548, 99.217, 102.886, 106.555, 110.224 ] },
            { key: 1072, points: [ 80.886, 84.557, 88.228, 91.899, 95.57, 99.24, 102.911, 106.582, 110.253 ] },
            { key: 1073, points: [ 80.901, 84.573, 88.246, 91.919, 95.591, 99.264, 102.937, 106.609, 110.282 ] }
          ]
        }
      }, {
        id: 'weight-for-age',
        data: {
          male: [
            { key: 1071, points: [ 8.683, 9.931, 11.179, 12.596, 14.205, 16.036, 18.12, 20.495, 22.87 ] },
            { key: 1072, points: [ 8.686, 9.935, 11.183, 12.601, 14.211, 16.042, 18.127, 20.504, 22.88 ] },
            { key: 1073, points: [ 8.689, 9.938, 11.187, 12.605, 14.216, 16.049, 18.135, 20.513, 22.891 ] }
          ]
        }
      }, {
        id: 'weight-for-height',
        data: {
          male: [
            { key: 82.9, points: [ 7.997, 8.692, 9.387, 10.159, 11.02, 11.982, 13.061, 14.277, 15.492 ] },
            { key: 83, points: [ 8.014, 8.71, 9.406, 10.179, 11.042, 12.005, 13.086, 14.303, 15.52 ] },
            { key: 83.1, points: [ 8.03, 8.728, 9.425, 10.2, 11.063, 12.029, 13.111, 14.33, 15.549 ] }
          ]
        }
      }]
    };

    it('#563', () => {
      const sex = 'male';
      const age = 1072;
      const height = 83;
      const weight = 11.704545;
      mockAllDocs(CONFIG_DOC);
      return service.getScoreUtil().then(util => {
        expect(util('height-for-age',    sex, age,    height)).to.equal(-3.424135113048216);
        expect(util('weight-for-age',    sex, age,    weight)).to.equal(-1.6321967559943587);
        expect(util('weight-for-height', sex, height, weight)).to.equal(0.6880010384215982);
      });
    });
  });

});
