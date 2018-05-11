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
        views: {
          view1: { map: 'view1_map' },
          view2: { map: 'view2_map' },
          view3: { map: 'view3_map' }
        }
      };
      lib.loadViewMaps(ddoc, 'view1', 'view2');
      lib._getViewMapStrings().should.deep.equal({ view1: 'view1_map', view2: 'view2_map' });
    });

    it('does not crash when view is not found', function() {
      lib.loadViewMaps({}, 'view1', 'view2');
      lib._getViewMapStrings().should.deep.equal({ view1: false, view2: false });

      lib.loadViewMaps({ views: { a: 'b'} }, 'view1', 'view2');
      lib._getViewMapStrings().should.deep.equal({ view1: false, view2: false });
    });

    it('does not crash when requested views param is undefined', function () {
      lib.loadViewMaps({});
      lib._getViewMapStrings().should.deep.equal({});
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
      var ddoc = { views: { viewName: { map: fnString }, viewName2: { map: ' function(a){ return emit(a + 2) } '}}};
      lib.loadViewMaps(ddoc, 'viewName', 'viewName2');
      var fn = lib.getViewMapFn('viewName');
      fn(2, 3, '+').should.deep.equal([5]);
      fn(5, 2, '-').should.deep.equal([3]);
      fn(4, 2, '*').should.deep.equal([8]);
      fn(16, 4, '/').should.deep.equal([4]);

      var fn2 = lib.getViewMapFn('viewName2');
      fn2(0).should.deep.equal([2]);
      fn2(2).should.deep.equal([4]);
      fn2(-2).should.deep.equal([0]);
    });

    it('supports multiple emits', function() {
      var fnString = 'function(a) { emit(a + 1); emit(a + 2); emit(a + 3); }';
      var ddoc = { views: { viewName: { map: fnString }}};
      lib.loadViewMaps(ddoc, 'viewName');
      var fn = lib.getViewMapFn('viewName', true);
      fn(1).should.deep.equal([[2], [3], [4]]);
      fn(2).should.deep.equal([[3], [4], [5]]);
    });

    it('throws error when requested a view that does not exist ', function() {
      var ddoc = { views: { viewName2: { map: ' function(a){ return emit(a + 2) } '}}};
      lib.loadViewMaps(ddoc, 'viewName2');
      lib.getViewMapFn.bind(lib, 'viewName').should.throw(Error, 'Requested view viewName was not found');
    });
  });

  describe('getViewMapString', function() {
    it('returns correct view', function() {
      var fnStringView1 = 'function(a) { return a; }';
      var fnStringView2 = 'function(a) { return a * 2; }';
      var ddoc = { views: { view1: { map: fnStringView1 }, view2: { map: fnStringView2 } }};
      lib.loadViewMaps(ddoc, 'view1', 'view2');
      lib.getViewMapString('view1').should.equal('function(a) { return a; }');
    });

    it('falls back to default views when missing view or incorrect config', function() {
      var fnStringView1 = 'function(a) { return a; }';
      var ddoc = { views: { view1: { map: fnStringView1 }}};
      lib.loadViewMaps(ddoc, 'view1');

      lib.defaultViews.someview = 'sometext';
      lib.getViewMapString('someview').should.equal('sometext');
      delete lib.defaultViews.someview;
    });
  });

  describe('hot reloading', function() {
    it('returns correct functions when views are reloaded', function() {
      var fnStringView1 = 'function(a) { return emit(a); }';
      var ddoc = { views: { view1: { map: fnStringView1 }}};
      lib.loadViewMaps(ddoc, 'view1');

      lib.getViewMapFn('view1')(1).should.deep.equal([1]);
      lib.getViewMapFn('view1')('I am a happy hippo').should.deep.equal(['I am a happy hippo']);

      fnStringView1 = 'function(a) { return emit(4); }';
      ddoc = { views: { view1: { map: fnStringView1 }}};
      lib.loadViewMaps(ddoc, 'view1');
      lib.getViewMapFn('view1')(1).should.deep.equal([4]);
      lib.getViewMapFn('view1')('I am a happy hippo').should.deep.equal([4]);

      fnStringView1 = 'function(a) { return emit(4); }';
      ddoc = { views: { view2: { map: fnStringView1 }}};
      lib.loadViewMaps(ddoc, 'view2');
      lib.getViewMapFn.bind(lib, 'view1').should.throw(Error, 'Requested view view1 was not found');
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