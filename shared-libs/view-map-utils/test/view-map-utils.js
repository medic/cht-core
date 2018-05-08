var sinon = require('sinon').sandbox.create();
require('chai').should();
var expect = require('chai').expect;
var lib = require('../src/view-map-utils');
var fs = require('fs');
var path = require('path');

describe('Replication Helper Views Lib', function() {
  afterEach(function() {
    sinon.restore();
  });

  describe('getConfig', function() {
    it('copies view map function from ddoc to config Object', function() {
      var ddoc = {
        views: {
          view1: { map: 'view1_map' },
          view2: { map: 'view2_map' },
          view3: { map: 'view3_map' }
        }
      };
      var result = lib.getConfig(ddoc, {}, ['view1', 'view2']);
      result.views.should.deep.equal({ view1: 'view1_map', view2: 'view2_map' });
    });

    it('does not crash when view is not found', function() {
      var result = lib.getConfig({}, {}, ['view1', 'view2']);
      result.views.should.deep.equal({ view1: false, view2: false });

      result = lib.getConfig({ views: { a: 'b'} }, {}, ['view1', 'view2']);
      result.views.should.deep.equal({ view1: false, view2: false });
    });

    it('does not crash when requested views param is undefined or not an array', function () {
      var result = lib.getConfig({}, {});
      expect(result.views).to.equal(undefined);

      result = lib.getConfig({}, {}, 'test');
      expect(result.views).to.equal(undefined);
    });
  });

  describe('getViewMapFn', function() {
    it('calls the read view function with correct arguments', function() {
      sinon.stub(lib, 'getViewMapString').returns(' function(a){ return a + 2 } ');
      lib.getViewMapFn({ foo: 'bar' }, 'viewName');
      lib.getViewMapString.callCount.should.equal(1);
      lib.getViewMapString.args[0][0].should.deep.equal({ foo: 'bar' });
      lib.getViewMapString.args[0][1].should.deep.equal('viewName');
    });

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

      sinon.stub(lib, 'getViewMapString').returns(fnString);
      var fn = lib.getViewMapFn({}, 'test');
      fn(2, 3, '+').should.deep.equal([5]);
      fn(5, 2, '-').should.deep.equal([3]);
      fn(4, 2, '*').should.deep.equal([8]);
      fn(16, 4, '/').should.deep.equal([4]);
    });

    it('supports multiple emits', function() {
      var fnString = 'function(a) { emit(a + 1); emit(a + 2); emit(a + 3); }';
      sinon.stub(lib, 'getViewMapString').returns(fnString);
      var fn = lib.getViewMapFn({}, 'test', true);
      fn(1).should.deep.equal([[2], [3], [4]]);
      fn(2).should.deep.equal([[3], [4], [5]]);
    });
  });

  describe('getViewMapString', function() {
    it('returns correct view from config', function() {
      var config = { views: { test: 'function(a) { return a; }' } };
      lib.getViewMapString(config, 'test').should.equal('function(a) { return a; }');
    });

    it('falls back to default views when missing view or incorrect config', function() {
      var config = { views: { test: 'function(a) { return a; }' } };
      lib.defaultViews.someview = 'sometext';
      lib.getViewMapString(config, 'someview').should.equal('sometext');
      lib.getViewMapString({}, 'someview').should.equal('sometext');
      delete lib.defaultViews.someview;
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