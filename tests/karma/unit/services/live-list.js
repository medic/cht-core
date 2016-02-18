function SIMPLE_ORDER_FUNCTION() {
  return 0;
}

function SIMPLE_LIST_ITEM(data) {
  return '* ' + data + '\n';
}

describe('LiveListSrv', function() {
  'use strict';

  var assert = chai.assert,
      service;

  beforeEach(function() {
    module('inboxApp');
    inject(function(_LiveList_) {
      service = _LiveList_;
    });
  });

  it('should be defined', function() {
    assert.ok(service);
  });

  it('should provide a single API method', function() {
    assert.deepEqual(_.keys(service), ['$listFor']);
  });

  describe('failures related to a missing piece of config', function() {
    _.forEach([
      null,
      {},
      { selecter: '#list' },
      { orderBy: SIMPLE_ORDER_FUNCTION },
      { listItem: SIMPLE_LIST_ITEM },
      { selecter: '#list', orderBy: SIMPLE_ORDER_FUNCTION },
      { selecter: '#list', listItem: SIMPLE_LIST_ITEM },
      { orderBy: SIMPLE_ORDER_FUNCTION, listItem: SIMPLE_LIST_ITEM },
    ], function(config, i) {

      it('should fail to init list when missing required config: ' + i, function() {
        var thrown;
        try {
          service.$listFor('name', config);
        } catch(e) {
          // expected
          thrown = true;
        }
        assert.ok(thrown);
      });

    });
  });

  it('should initialise fine when supplied with valid config', function() {
    // given
    var config = {
      listItem: SIMPLE_LIST_ITEM,
      orderBy: SIMPLE_ORDER_FUNCTION,
      selecter: '#list',
    };

    // when
    service.$listFor('name', config);

    // then
    assert.deepEqual(_.keys(service), ['$listFor', 'name']);
  });

  it('should provide a defined set of functions on initialised lists', function() {
    // given
    var config = {
      listItem: SIMPLE_LIST_ITEM,
      orderBy: SIMPLE_ORDER_FUNCTION,
      selecter: '#list',
    };

    // when
    service.$listFor('name', config);

    // then
    assert.deepEqual(_.keys(service.name), [
      'insert',
      'update',
      'remove',
      'getList',
      'set',
      'refresh',
      'count',
      'contains',
      'initialised',
      'setSelected',
      'clearSelected',
    ]);
  });
});
