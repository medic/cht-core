const sinon = require('sinon');
require('chai').should();
const lib = require('../src/view-map-utils');

describe('Replication Helper Views Lib', () => {
  afterEach(() => {
    sinon.restore();
    lib._reset();
  });

  describe('loadViewMaps', () => {
    it('saves view map function from ddoc', () => {
      const ddoc = {
        _id: '_design/ddoc',
        views: {
          view1: { map: 'view1_map' },
          view2: { map: 'view2_map' },
          view3: { map: 'view3_map' }
        }
      };
      lib.loadViewMaps(ddoc, 'view1', 'view2');
      lib._getViewMapStrings().should.deep.equal({ ddoc : { view1: 'view1_map', view2: 'view2_map' }});
    });

    it('does not crash when view is not found', () => {
      lib.loadViewMaps({ _id: 'ddoc' }, 'view1', 'view2');
      lib._getViewMapStrings().should.deep.equal({ ddoc: { view1: false, view2: false }});

      lib.loadViewMaps({ _id: 'ddoc', views: { a: 'b'} }, 'view1', 'view2');
      lib._getViewMapStrings().should.deep.equal({ ddoc: { view1: false, view2: false }});
    });

    it('does not crash when requested views param is undefined',  () => {
      lib.loadViewMaps({ _id: 'ddoc', views: { view1: { map: 'aaaa' }}}, 'view1');
      lib._getViewMapStrings().should.deep.equal({ddoc: { view1: 'aaaa' }});
    });
  });

  describe('getViewMapFn', () => {
    it('returns the correct function', () => {
      const fnString = 'function(a, b, operator) {' +
                     '  // this is a comment! ' +
                     '  \n \n \n \n ' +
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
      const ddoc = {
        _id: '_design/ddoc',
        views: {
          viewName: { map: fnString },
          viewName2: { map: ' function(a){ return emit(a + 2) } '}}
      };
      lib.loadViewMaps(ddoc, 'viewName', 'viewName2');
      const fn = lib.getViewMapFn('ddoc', 'viewName');
      fn(2, 3, '+').should.deep.equal([{ key: 5, value: null }]);
      fn(5, 2, '-').should.deep.equal([{ key: 3, value: null }]);
      fn(4, 2, '*').should.deep.equal([{ key: 8, value: null }]);
      fn(16, 4, '/').should.deep.equal([{ key: 4, value: null }]);

      const fn2 = lib.getViewMapFn('ddoc', 'viewName2');
      fn2(0).should.deep.equal([{ key: 2, value: null }]);
      fn2(2).should.deep.equal([{ key: 4, value: null }]);
      fn2(-2).should.deep.equal([{ key: 0, value: null }]);
    });

    it('supports multiple emits', () => {
      const fnString = 'function(a) { emit(a + 1); emit(a + 2); emit(a + 3); }';
      const ddoc = {
        _id: '_design/ddoc',
        views: {
          viewName: { map: fnString }
        }
      };
      lib.loadViewMaps(ddoc, 'viewName');
      const fn = lib.getViewMapFn('ddoc', 'viewName');
      fn(1).should.deep.equal([{ key: 2, value: null }, { key: 3, value: null }, { key: 4, value: null }]);
      fn(2).should.deep.equal([{ key: 3, value: null }, { key: 4, value: null }, { key: 5, value: null }]);
    });

    it('should emit value too', () => {
      const fnString = `
      function(a) { 
        emit(a + 1, a + 2); 
        emit(a + 2, a + 3); 
        emit(a + 3, a + 4); 
      };
      `;
      const ddoc = {
        _id: '_design/ddoc',
        views: {
          viewName: { map: fnString }
        }
      };
      lib.loadViewMaps(ddoc, 'viewName');
      const fn = lib.getViewMapFn('ddoc', 'viewName');
      fn(1).should.deep.equal([{ key: 2, value: 3 }, { key: 3, value: 4 }, { key: 4, value: 5 }]);
      fn(2).should.deep.equal([{ key: 3, value: 4 }, { key: 4, value: 5 }, { key: 5, value: 6 }]);
    });

    it('throws error when requested a view that does not exist ', () => {
      const ddoc = {
        _id: '_design/ddoc',
        views: {
          viewName2: { map: ' function(a){ return emit(a + 2) } '}
        }
      };
      lib.loadViewMaps(ddoc, 'viewName2');
      lib.getViewMapFn.bind(lib, 'ddoc', 'viewName').should.throw(Error, 'Requested view ddoc/viewName was not found');
    });

    it('caches results', () => {
      const fnString = 'function(a) { emit(a + 1); emit(a + 2); emit(a + 3); }';
      const ddoc = {
        _id: '_design/ddoc',
        views: {
          viewName: { map: fnString }
        }
      };
      lib.loadViewMaps(ddoc, 'viewName');
      let fn = lib.getViewMapFn('ddoc', 'viewName');
      fn = lib.getViewMapFn('ddoc', 'viewName');
      fn = lib.getViewMapFn('ddoc', 'viewName');
      fn = lib.getViewMapFn('ddoc', 'viewName');
      fn(1).should.deep.equal([{ key: 2, value: null }, { key: 3, value: null }, { key: 4, value: null }]);
      fn(2).should.deep.equal([{ key: 3, value: null }, { key: 4, value: null }, { key: 5, value: null }]);
    });
  });

  describe('getViewMapString', () => {
    it('returns correct view', () => {
      const fnStringView1 = 'function(a) { return a; }';
      const fnStringView2 = 'function(a) { return a * 2; }';
      const ddoc = {
        _id: '_design/ddoc',
        views: {
          view1: { map: fnStringView1 },
          view2: { map: fnStringView2 } }
      };
      lib.loadViewMaps(ddoc, 'view1', 'view2');
      const viewMapStrings = lib._getViewMapStrings();
      viewMapStrings.ddoc.view1.should.equal('function(a) { return a; }');
    });
  });

  describe('hot reloading', () => {
    it('returns correct functions when views are reloaded', () => {
      let fnStringView1 = 'function(a) { return emit(a); }';
      let ddoc = {
        _id: '_design/ddoc',
        views: {
          view1: { map: fnStringView1 }
        }
      };
      lib.loadViewMaps(ddoc, 'view1');

      lib.getViewMapFn('ddoc', 'view1')(1).should.deep.equal([{ key: 1, value: null }]);
      lib.getViewMapFn('ddoc', 'view1')('I am a happy hippo')
        .should.deep.equal([{ key: 'I am a happy hippo', value: null }]);

      fnStringView1 = 'function(a) { return emit(4); }';
      ddoc = {
        _id: 'ddoc',
        views: {
          view1: { map: fnStringView1 }
        }
      };
      lib.loadViewMaps(ddoc, 'view1');
      lib.getViewMapFn('ddoc', 'view1')(1).should.deep.equal([{ key: 4, value: null }]);
      lib.getViewMapFn('ddoc', 'view1')('I am a happy hippo').should.deep.equal([{ key: 4, value: null }]);

      fnStringView1 = 'function(a) { return emit(4); }';
      ddoc = {
        _id: '_design/ddoc',
        views: {
          view2: { map: fnStringView1 }
        }
      };
      lib.loadViewMaps(ddoc, 'view2');
      lib.getViewMapFn.bind(lib, 'ddoc', 'view1').should.throw(Error, 'Requested view ddoc/view1 was not found');
    });

    it('supports hot reloading for multiple ddocs', () => {
      let fnStringView1 = 'function(a) { return emit(a); }';
      let ddoc1 = {
        _id: '_design/ddoc1',
        views: {
          view: { map: fnStringView1 }
        }
      };
      lib.loadViewMaps(ddoc1, 'view');

      let fnStringView2 = 'function(a) { return emit(a + 2); }';
      let ddoc2 = {
        _id: '_design/ddoc2',
        views: {
          view: { map: fnStringView2 }
        }
      };
      lib.loadViewMaps(ddoc2, 'view');

      lib.getViewMapFn('ddoc1', 'view')(1).should.deep.equal([{ key: 1, value: null }]);
      lib.getViewMapFn('ddoc1', 'view')('I am a happy hippo')
        .should.deep.equal([{ key: 'I am a happy hippo', value: null }]);
      lib.getViewMapFn('ddoc2', 'view')(1).should.deep.equal([{ key: 3, value: null }]);
      lib.getViewMapFn('ddoc2', 'view')(33).should.deep.equal([{ key: 35, value: null }]);

      fnStringView1 = 'function(a) { return emit(1024); }';
      ddoc1 = {
        _id: '_design/ddoc1',
        views: {
          view: { map: fnStringView1 }
        }
      };
      lib.loadViewMaps(ddoc1, 'view');

      lib.getViewMapFn('ddoc1', 'view')(1).should.deep.equal([{ key: 1024, value: null }]);
      lib.getViewMapFn('ddoc1', 'view')('I am a happy hippo').should.deep.equal([{ key: 1024, value: null }]);
      lib.getViewMapFn('ddoc2', 'view')(1).should.deep.equal([{ key: 3, value: null }]);
      lib.getViewMapFn('ddoc2', 'view')(33).should.deep.equal([{ key: 35, value: null }]);

      fnStringView2 = 'function(a) { return emit(\'Medic\'); }';
      ddoc2 = {
        _id: '_design/ddoc2',
        views: {
          view: { map: fnStringView2 }
        }
      };
      lib.loadViewMaps(ddoc2, 'view');

      lib.getViewMapFn('ddoc1', 'view')(1).should.deep.equal([{ key: 1024, value: null }]);
      lib.getViewMapFn('ddoc1', 'view')('I am a happy hippo').should.deep.equal([{ key: 1024, value: null }]);
      lib.getViewMapFn('ddoc2', 'view')(1).should.deep.equal([{ key: 'Medic', value: null }]);
      lib.getViewMapFn('ddoc2', 'view')(33).should.deep.equal([{ key: 'Medic', value: null }]);
    });
  });
});
