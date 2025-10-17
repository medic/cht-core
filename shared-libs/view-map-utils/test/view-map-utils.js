const sinon = require('sinon');
require('chai').should();
const rewire = require('rewire');
let lib;

describe('Replication Helper Views Lib', () => {
  beforeEach(() => {
    lib = rewire('../src/view-map-utils');
  });
  afterEach(() => {
    sinon.restore();
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
      lib.loadViewMaps(ddoc, ['view1', 'view2']);
      lib.__get__('viewMapStrings').should.deep.equal({ ddoc: { view1: 'view1_map', view2: 'view2_map' }});
    });

    it('does not crash when view is not found', () => {
      lib.loadViewMaps({ _id: 'ddoc' }, ['view1', 'view2']);
      lib.__get__('viewMapStrings').should.deep.equal({ ddoc: { view1: false, view2: false }});

      lib.loadViewMaps({ _id: 'ddoc', views: { a: 'b'} }, ['view1', 'view2']);
      lib.__get__('viewMapStrings').should.deep.equal({ ddoc: { view1: false, view2: false }});
    });

    it('does not crash when requested views param is undefined',  () => {
      lib.loadViewMaps({ _id: 'ddoc', views: { view1: { map: 'aaaa' }}}, ['view1']);
      lib.__get__('viewMapStrings').should.deep.equal({ddoc: { view1: 'aaaa' }});
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
      lib.loadViewMaps(ddoc, ['viewName', 'viewName2']);
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
      lib.loadViewMaps(ddoc, ['viewName']);
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
      lib.loadViewMaps(ddoc, ['viewName']);
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
      lib.loadViewMaps(ddoc, ['viewName2']);
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
      lib.loadViewMaps(ddoc, ['viewName']);
      let fn = lib.getViewMapFn('ddoc', 'viewName');
      fn = lib.getViewMapFn('ddoc', 'viewName');
      fn = lib.getViewMapFn('ddoc', 'viewName');
      fn = lib.getViewMapFn('ddoc', 'viewName');
      fn(1).should.deep.equal([{ key: 2, value: null }, { key: 3, value: null }, { key: 4, value: null }]);
      fn(2).should.deep.equal([{ key: 3, value: null }, { key: 4, value: null }, { key: 5, value: null }]);
    });
  });

  describe('getNouveauViewMapFn', () => {
    it('returns the correct function', () => {
      const fnString = 'function(a, b, operator) {' +
                       '  // this is a comment! ' +
                       '  \n \n \n \n ' +
                       '  switch (operator) { '+
                       '    case \'+\': ' +
                       '      return index("string", "result", a + b);' +
                       '    case \'-\': ' +
                       '      return index("string", "result", a - b);' +
                       '    case \'*\':' +
                       '      return index("string", "result", a * b);' +
                       '    case \'/\':' +
                       '      return index("string", "result", a / b);' +
                       '  }' +
                       '}';
      const ddoc = {
        _id: '_design/ddoc',
        nouveau: {
          viewName: { index: fnString },
          viewName2: { index: ' function(a){ return index("string", "res", a + 2) } '}}
      };
      lib.loadViewMaps(ddoc, [], ['viewName', 'viewName2']);
      const fn = lib.getNouveauViewMapFn('ddoc', 'viewName');
      fn(2, 3, '+').should.deep.equal({ result: 5 });
      fn(5, 2, '-').should.deep.equal({ result: 3 });
      fn(4, 2, '*').should.deep.equal({ result: 8 });
      fn(16, 4, '/').should.deep.equal({ result: 4 });

      const fn2 = lib.getNouveauViewMapFn('ddoc', 'viewName2');
      fn2(0).should.deep.equal({ res: 2 });
      fn2(2).should.deep.equal({ res: 4 });
      fn2(-2).should.deep.equal({ res: 0 });
    });

    it('supports multiple indexes', () => {
      const fnString = 'function(a) { ' +
                       'index("string", "val", a + 1); ' +
                       'index("string", "val", a + 2); ' +
                       'index("string", "val", a + 3); }';
      const ddoc = {
        _id: '_design/ddoc',
        nouveau: {
          viewName: { index: fnString }
        }
      };
      lib.loadViewMaps(ddoc, [], ['viewName']);
      const fn = lib.getNouveauViewMapFn('ddoc', 'viewName');
      fn(1).should.deep.equal({ val: [2, 3, 4] });
      fn(2).should.deep.equal({ val: [3, 4, 5] });
    });

    it('should index multiple keys', () => {
      const fnString = `
      function(a) { 
        index("string", "+2", a + 2); 
        index("string", "+3", a + 3); 
        index("string", "+4", a + 4); 
      };
      `;
      const ddoc = {
        _id: '_design/ddoc',
        nouveau: {
          viewName: { index: fnString }
        }
      };
      lib.loadViewMaps(ddoc, [], ['viewName']);
      const fn = lib.getNouveauViewMapFn('ddoc', 'viewName');
      fn(1).should.deep.equal({ '+2': 3, '+3': 4, '+4': 5 });
      fn(2).should.deep.equal({ '+2': 4, '+3': 5, '+4': 6 });
    });

    it('throws error when requested a view that does not exist ', () => {
      const ddoc = {
        _id: '_design/ddoc',
        views: {
          viewName2: { map: ' function(a){ return emit(a + 2) } '}
        }
      };
      lib.loadViewMaps(ddoc, [], ['viewName2']);
      lib.getNouveauViewMapFn.bind(lib, 'ddoc', 'viewName')
        .should.throw(Error, 'Requested nouveau index ddoc/viewName was not found');
    });

    it('caches results', () => {
      const fnString = 'function(a) { index("string", "val", a + 1); index("string", "val", a + 2); }';
      const ddoc = {
        _id: '_design/ddoc',
        nouveau: {
          viewName: { index: fnString }
        }
      };
      lib.loadViewMaps(ddoc, [], ['viewName']);
      let fn = lib.getNouveauViewMapFn('ddoc', 'viewName');
      fn = lib.getNouveauViewMapFn('ddoc', 'viewName');
      fn = lib.getNouveauViewMapFn('ddoc', 'viewName');
      fn = lib.getNouveauViewMapFn('ddoc', 'viewName');
      fn(1).should.deep.equal({ val: [2, 3] });
      fn(2).should.deep.equal({ val: [3, 4] });
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
      lib.loadViewMaps(ddoc, ['view1', 'view2']);
      const viewMapStrings = lib.__get__('viewMapStrings');
      viewMapStrings.ddoc.view1.should.equal('function(a) { return a; }');
    });
  });

  describe('hot reloading', () => {
    it('returns correct functions when views are reloaded', () => {
      let fnStringView1 = 'function(a) { return emit(a); }';
      let fnStringView2 = 'function(a) { return index("string", "key", a + 2); }';
      let ddoc = {
        _id: '_design/ddoc',
        views: {
          view1: { map: fnStringView1 }
        },
        nouveau: {
          view2: { index: fnStringView2 }
        }
      };
      lib.loadViewMaps(ddoc, ['view1'], ['view2']);

      lib.getViewMapFn('ddoc', 'view1')(1).should.deep.equal([{ key: 1, value: null }]);
      lib.getViewMapFn('ddoc', 'view1')('I am a happy hippo')
        .should.deep.equal([{ key: 'I am a happy hippo', value: null }]);
      lib.getNouveauViewMapFn('ddoc', 'view2')(1).should.deep.equal({ key: 3 });

      fnStringView1 = 'function(a) { return emit(4); }';
      fnStringView2 = 'function(a) { return index("string", "key", "Jason"); }';
      ddoc = {
        _id: 'ddoc',
        views: {
          view1: { map: fnStringView1 }
        },
        nouveau: {
          view2: { index: fnStringView2 }
        }
      };
      lib.loadViewMaps(ddoc, ['view1'], ['view2']);
      lib.getViewMapFn('ddoc', 'view1')(1).should.deep.equal([{ key: 4, value: null }]);
      lib.getViewMapFn('ddoc', 'view1')('I am a happy hippo').should.deep.equal([{ key: 4, value: null }]);
      lib.getNouveauViewMapFn('ddoc', 'view2')(1).should.deep.equal({ key: 'Jason' });

      ddoc = {
        _id: '_design/ddoc',
        views: {
          view2: { map: fnStringView1 }
        },
        nouveau: {
          view1: { map: fnStringView2 }
        }
      };
      lib.loadViewMaps(ddoc, ['view2'], ['view1']);
      lib.getViewMapFn.bind(lib, 'ddoc', 'view1').should.throw(Error, 'Requested view ddoc/view1 was not found');
      lib.getNouveauViewMapFn.bind(lib, 'ddoc', 'view2')
        .should.throw(Error, 'Requested nouveau index ddoc/view2 was not found');
    });

    it('supports hot reloading for multiple ddocs', () => {
      let fnStringView1 = 'function(a) { return emit(a); }';
      let ddoc1 = {
        _id: '_design/ddoc1',
        views: {
          view: { map: fnStringView1 }
        }
      };
      lib.loadViewMaps(ddoc1, ['view']);

      let fnStringView2 = 'function(a) { return emit(a + 2); }';
      let ddoc2 = {
        _id: '_design/ddoc2',
        views: {
          view: { map: fnStringView2 }
        }
      };
      lib.loadViewMaps(ddoc2, ['view']);

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
      lib.loadViewMaps(ddoc1, ['view']);

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
      lib.loadViewMaps(ddoc2, ['view']);

      lib.getViewMapFn('ddoc1', 'view')(1).should.deep.equal([{ key: 1024, value: null }]);
      lib.getViewMapFn('ddoc1', 'view')('I am a happy hippo').should.deep.equal([{ key: 1024, value: null }]);
      lib.getViewMapFn('ddoc2', 'view')(1).should.deep.equal([{ key: 'Medic', value: null }]);
      lib.getViewMapFn('ddoc2', 'view')(33).should.deep.equal([{ key: 'Medic', value: null }]);
    });
  });
});
