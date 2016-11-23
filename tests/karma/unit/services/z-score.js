describe('ZScore service', function() {
  'use strict';

  var service,
      dbGet;

  beforeEach(function() {
    module('inboxApp');
    dbGet = sinon.stub();
    module(function($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ get: dbGet }));
    });
    inject(function(_ZScore_) {
      service = _ZScore_;
    });
  });

  describe('weightForAge calculation', function() {

    var CONFIG_DOC = {
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

    it('returns undefined for unconfigured chart', function() {
      var options = {
        sex: 'male',
        weight: 10,
        age: 150
      };
      var configDoc = {
        charts: []
      };
      dbGet.returns(KarmaUtils.mockPromise(null, configDoc));
      return service(options).then(function(scores) {
        chai.expect(scores.weightForAge).to.equal(undefined);
      });
    });

    it('returns undefined when not given sex', function() {
      var options = {
        weight: 10,
        age: 150
      };
      var configDoc = {
        charts: [{
          id: 'weight-for-age',
          data: {}
        }]
      };
      dbGet.returns(KarmaUtils.mockPromise(null, configDoc));
      return service(options).then(function(scores) {
        chai.expect(scores.weightForAge).to.equal(undefined);
      });
    });

    it('returns undefined when not given weight', function() {
      var options = {
        sex: 'male',
        age: 150
      };
      var configDoc = {
        charts: [{
          id: 'weight-for-age',
          data: {}
        }]
      };
      dbGet.returns(KarmaUtils.mockPromise(null, configDoc));
      return service(options).then(function(scores) {
        chai.expect(scores.weightForAge).to.equal(undefined);
      });
    });

    it('returns undefined when not given age', function() {
      var options = {
        sex: 'male',
        weight: 10
      };
      var configDoc = {
        charts: [{
          id: 'weight-for-age',
          data: {}
        }]
      };
      dbGet.returns(KarmaUtils.mockPromise(null, configDoc));
      return service(options).then(function(scores) {
        chai.expect(scores.weightForAge).to.equal(undefined);
      });
    });

    it('returns zscore', function() {
      var options = {
        sex: 'male',
        weight: 25,
        age: 1
      };
      dbGet.returns(KarmaUtils.mockPromise(null, CONFIG_DOC));
      return service(options).then(function(scores) {
        chai.expect(scores.weightForAge).to.equal(1);
        chai.expect(dbGet.callCount).to.equal(1);
        chai.expect(dbGet.args[0][0]).to.equal('zscore-charts');
      });
    });

    it('approximates zscore when weight is between data points', function() {
      var options = {
        sex: 'male',
        weight: 25.753,
        age: 1
      };
      dbGet.returns(KarmaUtils.mockPromise(null, CONFIG_DOC));
      return service(options).then(function(scores) {
        // round to 3dp to ignore tiny errors caused by floats
        var actual = (scores.weightForAge * 1000) / 1000;
        chai.expect(actual).to.equal(1.753);
      });
    });

    it('returns undefined when requested sex not configured', function() {
      var options = {
        sex: 'female',
        weight: 25.7,
        age: 1
      };
      dbGet.returns(KarmaUtils.mockPromise(null, CONFIG_DOC));
      return service(options).then(function(scores) {
        chai.expect(scores.weightForAge).to.equal(undefined);
      });
    });

    it('returns undefined when age is below data range', function() {
      var options = {
        sex: 'male',
        weight: 25.7,
        age: 1
      };
      var configDoc = {
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
      dbGet.returns(KarmaUtils.mockPromise(null, configDoc));
      return service(options).then(function(scores) {
        chai.expect(scores.weightForAge).to.equal(undefined);
      });
    });

    it('returns undefined when age is above data range', function() {
      var options = {
        sex: 'male',
        weight: 25.7,
        age: 5
      };
      dbGet.returns(KarmaUtils.mockPromise(null, CONFIG_DOC));
      return service(options).then(function(scores) {
        chai.expect(scores.weightForAge).to.equal(undefined);
      });
    });

    it('returns -4 when weight is below data range', function() {
      var options = {
        sex: 'male',
        weight: 19,
        age: 1
      };
      dbGet.returns(KarmaUtils.mockPromise(null, CONFIG_DOC));
      return service(options).then(function(scores) {
        chai.expect(scores.weightForAge).to.equal(-4);
      });
    });

    it('returns 4 when weight is above data range', function() {
      var options = {
        sex: 'male',
        weight: 29,
        age: 1
      };
      dbGet.returns(KarmaUtils.mockPromise(null, CONFIG_DOC));
      return service(options).then(function(scores) {
        chai.expect(scores.weightForAge).to.equal(4);
      });
    });

  });

  describe('heightForAge calculation', function() {

    var CONFIG_DOC = {
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

    it('returns zscore', function() {
      var options = {
        sex: 'male',
        height: 56.1,
        age: 1
      };
      dbGet.returns(KarmaUtils.mockPromise(null, CONFIG_DOC));
      return service(options).then(function(scores) {
        chai.expect(scores.heightForAge).to.equal(1.5);
        chai.expect(dbGet.callCount).to.equal(1);
        chai.expect(dbGet.args[0][0]).to.equal('zscore-charts');
      });
    });
  });

  describe('weightForHeight calculation', function() {

    var CONFIG_DOC = {
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

    it('returns zscore', function() {
      var options = {
        sex: 'male',
        height: 45.1,
        weight: 26.5
      };
      dbGet.returns(KarmaUtils.mockPromise(null, CONFIG_DOC));
      return service(options).then(function(scores) {
        chai.expect(scores.weightForHeight).to.equal(2.5);
        chai.expect(dbGet.callCount).to.equal(1);
        chai.expect(dbGet.args[0][0]).to.equal('zscore-charts');
      });
    });
  });

  describe('cic test cases', function() {

    var CONFIG_DOC = {
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

    it('#563', function() {
      var options = {
        sex: 'male',
        age: 1072,
        height: 83,
        weight: 11.704545
      };
      dbGet.returns(KarmaUtils.mockPromise(null, CONFIG_DOC));
      return service(options).then(function(scores) {
        chai.expect(scores.heightForAge).to.equal(-3.424135113048216);
        chai.expect(scores.weightForAge).to.equal(-1.6321967559943587);
        chai.expect(scores.weightForHeight).to.equal(0.6880010384215982);
      });
    });
  });

});
