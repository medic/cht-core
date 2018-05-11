var sinon = require('sinon').sandbox.create();
require('chai').should();
var lib = require('../src/view-map-utils');
var fs = require('fs');
var path = require('path');

describe('Replication Helper Views Lib', function() {
  afterEach(function() {
    sinon.restore();
    lib.reset();
  });

  describe('loadViewMaps', function() {
    it('saves view map function from ddoc', function() {
      var ddoc = {
        _id: 'ddoc',
        views: {
          view1: { map: 'view1_map' },
          view2: { map: 'view2_map' },
          view3: { map: 'view3_map' }
        }
      };
      lib.loadViewMaps(ddoc, 'view1', 'view2');
      lib._getViewMapStrings().should.deep.equal({ ddoc : { view1: 'view1_map', view2: 'view2_map' }});
    });

    it('does not crash when view is not found', function() {
      lib.loadViewMaps({ _id: 'ddoc' }, 'view1', 'view2');
      lib._getViewMapStrings().should.deep.equal({ ddoc: { view1: false, view2: false }});

      lib.loadViewMaps({ _id: 'ddoc', views: { a: 'b'} }, 'view1', 'view2');
      lib._getViewMapStrings().should.deep.equal({ ddoc: { view1: false, view2: false }});
    });

    it('does not crash when requested views param is undefined, or ddoc Id is not set', function () {
      lib.loadViewMaps({});
      lib._getViewMapStrings().should.deep.equal({ default: {} });

      lib.loadViewMaps({ views: { view1: { map: 'aaaa' } } }, 'view1');
      lib._getViewMapStrings().should.deep.equal({default: { view1: 'aaaa' }});
    });
  });

  describe('getViewMapFn', function() {
    it('returns the correct function', function() {
      var fnString = 'function(a, b, operator) {' +
                     '  // this is a comment! ' +
                     '  \n \n \n \n\ ' +
                     '  switch (operator) { '+
                     '    case \'+\': ' +
                     '      return emit(a + b);' +
                     '    case \'-\': ' +
                     '      return emit(a - b);' +
                     '    case \'*\':' +
                     '      return emit(a * b);' +
                     '    case \'/\':' +
                     '      return emit(a / b);' +
                     '  }' +
                     '}';
      var ddoc = {
        _id: 'ddoc',
        views: {
          viewName: { map: fnString },
          viewName2: { map: ' function(a){ return emit(a + 2) } '}}
      };
      lib.loadViewMaps(ddoc, 'viewName', 'viewName2');
      var fn = lib.getViewMapFn('ddoc', 'viewName');
      fn(2, 3, '+').should.deep.equal([5]);
      fn(5, 2, '-').should.deep.equal([3]);
      fn(4, 2, '*').should.deep.equal([8]);
      fn(16, 4, '/').should.deep.equal([4]);

      var fn2 = lib.getViewMapFn('ddoc', 'viewName2');
      fn2(0).should.deep.equal([2]);
      fn2(2).should.deep.equal([4]);
      fn2(-2).should.deep.equal([0]);
    });

    it('supports multiple emits', function() {
      var fnString = 'function(a) { emit(a + 1); emit(a + 2); emit(a + 3); }';
      var ddoc = {
        _id: 'ddoc',
        views: {
          viewName: { map: fnString }
        }
      };
      lib.loadViewMaps(ddoc, 'viewName');
      var fn = lib.getViewMapFn('ddoc', 'viewName', true);
      fn(1).should.deep.equal([[2], [3], [4]]);
      fn(2).should.deep.equal([[3], [4], [5]]);
    });

    it('throws error when requested a view that does not exist ', function() {
      var ddoc = {
        _id: 'ddoc',
        views: {
          viewName2: { map: ' function(a){ return emit(a + 2) } '}
        }
      };
      lib.loadViewMaps(ddoc, 'viewName2');
      lib.getViewMapFn.bind(lib, 'ddoc', 'viewName').should.throw(Error, 'Requested view ddoc/viewName was not found');
    });
  });

  describe('getViewMapString', function() {
    it('returns correct view', function() {
      var fnStringView1 = 'function(a) { return a; }';
      var fnStringView2 = 'function(a) { return a * 2; }';
      var ddoc = {
        _id: 'ddoc',
        views: {
          view1: { map: fnStringView1 },
          view2: { map: fnStringView2 } }
      };
      lib.loadViewMaps(ddoc, 'view1', 'view2');
      lib.getViewMapString('ddoc', 'view1').should.equal('function(a) { return a; }');
    });

    it('falls back to default views when missing view or incorrect config', function() {
      var fnStringView1 = 'function(a) { return a; }';
      var ddoc = {
        _id: 'ddoc',
        views: {
          view1: { map: fnStringView1 }
        }
      };
      lib.loadViewMaps(ddoc, 'view1');

      lib.defaultViews.someview = 'sometext';
      lib.getViewMapString('someddoc', 'someview').should.equal('sometext');
      delete lib.defaultViews.someview;
    });
  });

  describe('hot reloading', function() {
    it('returns correct functions when views are reloaded', function() {
      var fnStringView1 = 'function(a) { return emit(a); }';
      var ddoc = {
        _id: 'ddoc',
        views: {
          view1: { map: fnStringView1 }
        }
      };
      lib.loadViewMaps(ddoc, 'view1');

      lib.getViewMapFn('ddoc', 'view1')(1).should.deep.equal([1]);
      lib.getViewMapFn('ddoc', 'view1')('I am a happy hippo').should.deep.equal(['I am a happy hippo']);

      fnStringView1 = 'function(a) { return emit(4); }';
      ddoc = {
        _id: 'ddoc',
        views: {
          view1: { map: fnStringView1 }
        }
      };
      lib.loadViewMaps(ddoc, 'view1');
      lib.getViewMapFn('ddoc', 'view1')(1).should.deep.equal([4]);
      lib.getViewMapFn('ddoc', 'view1')('I am a happy hippo').should.deep.equal([4]);

      fnStringView1 = 'function(a) { return emit(4); }';
      ddoc = {
        _id: 'ddoc',
        views: {
          view2: { map: fnStringView1 }
        }
      };
      lib.loadViewMaps(ddoc, 'view2');
      lib.getViewMapFn.bind(lib, 'ddoc', 'view1').should.throw(Error, 'Requested view ddoc/view1 was not found');
    });

    it('supports hot reloading for multiple ddocs', function() {
      var fnStringView1 = 'function(a) { return emit(a); }';
      var ddoc1 = {
        _id: 'ddoc1',
        views: {
          view: { map: fnStringView1 }
        }
      };
      lib.loadViewMaps(ddoc1, 'view');

      var fnStringView2 = 'function(a) { return emit(a + 2); }';
      var ddoc2 = {
        _id: 'ddoc2',
        views: {
          view: { map: fnStringView2 }
        }
      };
      lib.loadViewMaps(ddoc2, 'view');

      lib.getViewMapFn('ddoc1', 'view')(1).should.deep.equal([1]);
      lib.getViewMapFn('ddoc1', 'view')('I am a happy hippo').should.deep.equal(['I am a happy hippo']);
      lib.getViewMapFn('ddoc2', 'view')(1).should.deep.equal([3]);
      lib.getViewMapFn('ddoc2', 'view')(33).should.deep.equal([35]);

      fnStringView1 = 'function(a) { return emit(1024); }';
      ddoc1 = {
        _id: 'ddoc1',
        views: {
          view: { map: fnStringView1 }
        }
      };
      lib.loadViewMaps(ddoc1, 'view');

      lib.getViewMapFn('ddoc1', 'view')(1).should.deep.equal([1024]);
      lib.getViewMapFn('ddoc1', 'view')('I am a happy hippo').should.deep.equal([1024]);
      lib.getViewMapFn('ddoc2', 'view')(1).should.deep.equal([3]);
      lib.getViewMapFn('ddoc2', 'view')(33).should.deep.equal([35]);

      fnStringView2 = 'function(a) { return emit(\'Medic Mobile\'); }';
      ddoc2 = {
        _id: 'ddoc2',
        views: {
          view: { map: fnStringView2 }
        }
      };
      lib.loadViewMaps(ddoc2, 'view');

      lib.getViewMapFn('ddoc1', 'view')(1).should.deep.equal([1024]);
      lib.getViewMapFn('ddoc1', 'view')('I am a happy hippo').should.deep.equal([1024]);
      lib.getViewMapFn('ddoc2', 'view')(1).should.deep.equal(['Medic Mobile']);
      lib.getViewMapFn('ddoc2', 'view')(33).should.deep.equal(['Medic Mobile']);
    });


  });

  describe('defaultViews', function() {
    it('default views are correct', function() {
      var COMMENT_REGEX = /\/\/.*/g,
          NEW_LINE_REGEX = /\\n/g,
          SPACE_REGEX = /\s/g;
      Object.keys(lib.defaultViews).forEach(function(view) {
        var fnString = fs
          .readFileSync(path.join(__dirname, '../../../webapp/src/ddocs/medic/views/'+ view +'/map.js'), 'utf8')
          .toString()
          .replace(COMMENT_REGEX,'')
          .replace(NEW_LINE_REGEX,'')
          .replace(SPACE_REGEX, '');

        var defaultView = lib.defaultViews[view]
          .toString()
          .replace(COMMENT_REGEX,'')
          .replace(NEW_LINE_REGEX,'')
          .replace(SPACE_REGEX, '');

        defaultView.should.equal(fnString);
      });
    });
  });
});