describe('LiveListSrv', function() {
  'use strict';

  function SIMPLE_ORDER_FUNCTION() {
    return 0;
  }

  function SIMPLE_LIST_ITEM(data) {
    return $('<li>* ' + data._id + '</li>');
  }

  function doc(id) {
    return {
      _id: id,
    };
  }

  function active_dom() {
    $('body').append('<ul id="list">');
  }

  function no_active_dom() {
    // No need to do anything - the list should not exist in the DOM already
  }

  function active_dom_child_count() {
    return $('#list').children().length;
  }

  function active_dom_child_text() {
    return _.map($('#list').children(), function(e) {
      return $(e).text();
    });
  }

  function selected_items_text() {
    return _.map($('#list li.selected'), function(e) {
      return $(e).text();
    });
  }

  function list_of() {
    var args = Array.prototype.slice.call(arguments);
    var items = _.map(args, doc);
    service.testing.set(items);
  }

  var assert = chai.assert,
      service;

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('ResourceIcons', {
        replacePlaceholders: function() {}
      });
    });
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
      { selector: '#list' },
      { orderBy: SIMPLE_ORDER_FUNCTION },
      { listItem: SIMPLE_LIST_ITEM },
      { selector: '#list', orderBy: SIMPLE_ORDER_FUNCTION },
      { selector: '#list', listItem: SIMPLE_LIST_ITEM },
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
      selector: '#list',
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
      selector: '#list',
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
      'containsDeleteStub'
    ]);
  });

  describe('a configured list', function() {
    beforeEach(function() {
      var config = {
        listItem: SIMPLE_LIST_ITEM,
        orderBy: SIMPLE_ORDER_FUNCTION,
        selector: '#list',
      };
      service.$listFor('testing', config);
    });

    it('should not be initialised by default', function() {
      // expect
      assert.notOk(service.testing.initialised());
    });

    describe('#refresh()', function() {
        it('should not complain if list is not initialised', function() {
          // expect
          service.testing.refresh();
          // no expcetion thrown
        });
    });

    describe('an initialised list', function() {
      beforeEach(function() {
        service.testing.set([]);
      });

      it('should be initialised', function() {
        // expect
        assert.ok(service.testing.initialised());
      });

      describe('#count()', function() {
        it('should return zero for an empty list', function() {
          // expect
          assert.equal(service.testing.count(), 0);
        });

        it('should return 3 for an 3-length list', function() {
          // given
          service.testing.set([1, 2, 3]);

          // expect
          assert.equal(service.testing.count(), 3);
        });
      });

      describe('#refresh()', function() {
        it('should do nothing if DOM container element not found', function() {
          // given
          list_of(1, 2, 3);
          no_active_dom();

          // when
          service.testing.refresh();

          // then
          assert.deepEqual(active_dom_child_count(), 0);
        });

        it('should append all DOM elements to the DOM container element', function() {
          // given
          active_dom();
          list_of(1, 2, 3);

          // when
          service.testing.refresh();

          // then
          assert.deepEqual(active_dom_child_text(), [
            '* 1',
            '* 2',
            '* 3',
          ]);
        });
      });

      describe('selected item tracking', function() {
        describe('#setSelected()', function() {
          it('should add `selected` class for new selected element', function() {
            // given
            list_of(1, 2, 3);
            service.testing.setSelected(2);
            active_dom();

            // when
            service.testing.refresh();

            // then
            assert.deepEqual(selected_items_text(), [
              '* 2',
            ]);
          });

          it('should add `selected` class for existing element that becomes selected', function() {
            // given
            list_of(1, 2, 3);
            active_dom();
            service.testing.refresh();
            assert.deepEqual(selected_items_text(), []);

            // when
            service.testing.setSelected(2);

            // then
            assert.deepEqual(selected_items_text(), [
              '* 2',
            ]);
          });

          it('should remove `selected` class for previous selected element and add to newly-selected', function() {
            // given
            list_of(1, 2, 3);
            service.testing.setSelected(2);
            active_dom();
            service.testing.refresh();
            assert.deepEqual(selected_items_text(), [
              '* 2',
            ]);

            // when
            service.testing.setSelected(3);

            // then
            assert.deepEqual(selected_items_text(), [
              '* 3',
            ]);
          });
        });

        describe('#clearSelected()', function() {
          it('should not complain if nothing was selected', function() {
            // given
            list_of(1, 2, 3);
            active_dom();
            service.testing.refresh();
            assert.deepEqual(selected_items_text(), []);

            // when
            service.testing.clearSelected();

            // then
            assert.deepEqual(selected_items_text(), []);
          });

          it('should remove `selected` class for previous selected element and add to newly-selected', function() {
            // given
            list_of(1, 2, 3);
            service.testing.setSelected(2);
            active_dom();
            service.testing.refresh();
            assert.deepEqual(selected_items_text(), [
              '* 2',
            ]);

            // when
            service.testing.clearSelected();

            // then
            assert.deepEqual(selected_items_text(), []);
          });
        });
      });

      describe('#count()', function() {
        it('should return the number of items passed to `set`', function() {
          // given
          service.testing.set([doc(1), doc(2)]);

          // expect
          assert.equal(service.testing.count(), 2);
        });

        it('should increment when item inserted', function() {
          // given
          service.testing.set([doc(1), doc(2)]);
          assert.equal(service.testing.count(), 2);

          // when
          service.testing.insert(doc(3));

          // expect
          assert.equal(service.testing.count(), 3);
        });

        it('should not increment when item updated', function() {
          // given
          service.testing.set([doc(1), doc(2)]);
          assert.equal(service.testing.count(), 2);

          // when
          service.testing.update(doc(2));

          // expect
          assert.equal(service.testing.count(), 2);
        });
      });

      describe('#contains()', function() {
        it('should return false for an empty list', function() {
          // expect
          assert.notOk(service.testing.contains( doc(123) ));
        });

        it('should return false if supplied item\'s ID does not match an item in the list', function() {
          // given
          list_of(1, 2, 3);

          // expect
          assert.notOk(service.testing.contains( doc(999) ));
        });

        it('true if supplied ID matches an item in the list', function() {
          // given
          list_of(1, 2, 3);

          // expect
          assert.ok(service.testing.contains( doc(1) ));
          assert.ok(service.testing.contains( doc(2) ));
          assert.ok(service.testing.contains( doc(3) ));
        });
      });

      describe('#getList()', function() {
        it('should return an empty list if no items added', function() {
          // expect
          assert.deepEqual(service.testing.getList(), []);
        });

        it('should return all items passed to set', function() {
          // given
          service.testing.set([ doc(1), doc(2) ]);

          // expect
          assert.deepEqual(service.testing.getList(), [ doc(1), doc(2) ]);
        });

        it('should return all items inserted', function() {
          // given
          service.testing.insert( doc(1) );
          service.testing.insert( doc(2) );

          // expect
          assert.deepEqual(service.testing.getList(), [ doc(1), doc(2)  ]);
        });

        it('should return all items passed to set or inserted', function() {
          // given
          service.testing.set([ doc(1), doc(2) ]);
          service.testing.insert( doc(3) );

          // expect
          assert.deepEqual(service.testing.getList(), [ doc(1), doc(2), doc(3) ]);
        });

        it('should not return removed items', function() {
          // given
          list_of(1, 2, 3);
          assert.deepEqual(service.testing.getList(), [
            { _id: 1 },
            { _id: 2 },
            { _id: 3 },
          ]);

          // when
          service.testing.remove(doc(2));

          // then
          assert.deepEqual(service.testing.getList(), [
            { _id: 1 },
            { _id: 3 },
          ]);
        });
      });
    });
  });

  describe('ORDERING', function() {
    it('should sort items added by #set() by ascending ID', function() {
      // given
      service.$listFor('testing', {
        listItem: SIMPLE_LIST_ITEM,
        orderBy: function(a, b) {
          return a._id - b._id;
        },
        selector: '#list',
      });

      // when
      service.testing.set([ doc(1), doc(3), doc(2) ]);

      // then
      assert.deepEqual(service.testing.getList(), [
        { _id: 1 },
        { _id: 2 },
        { _id: 3 },
      ]);
    });

    it('should sort items added by #set() by descending ID', function() {
      // given
      service.$listFor('testing', {
        listItem: SIMPLE_LIST_ITEM,
        orderBy: function(a, b) {
          return b._id - a._id;
        },
        selector: '#list',
      });

      // when
      service.testing.set([ doc(1), doc(3), doc(2) ]);

      // then
      assert.deepEqual(service.testing.getList(), [
        { _id: 3 },
        { _id: 2 },
        { _id: 1 },
      ]);
    });

    it('should sort items by ascending ID', function() {
      // given
      service.$listFor('testing', {
        listItem: SIMPLE_LIST_ITEM,
        orderBy: function(a, b) {
          return a._id - b._id;
        },
        selector: '#list',
      });
      service.testing.set([]);

      // when
      service.testing.insert( doc(1) );
      service.testing.insert( doc(3) );
      service.testing.insert( doc(2) );

      // then
      assert.deepEqual(service.testing.getList(), [
        { _id: 1 },
        { _id: 2 },
        { _id: 3 },
      ]);
    });

    it('should sort items by descending ID', function() {
      // given
      service.$listFor('testing', {
        listItem: SIMPLE_LIST_ITEM,
        orderBy: function(a, b) {
          return b._id - a._id;
        },
        selector: '#list',
      });
      service.testing.set([]);

      // when
      service.testing.insert( doc(1) );
      service.testing.insert( doc(3) );
      service.testing.insert( doc(2) );

      // then
      assert.deepEqual(service.testing.getList(), [
        { _id: 3 },
        { _id: 2 },
        { _id: 1 },
      ]);
    });
  });

  describe('containsDeleteStub', () => {
    beforeEach(function() {
      var config = {
        listItem: SIMPLE_LIST_ITEM,
        orderBy: SIMPLE_ORDER_FUNCTION,
        selector: '#list',
      };
      service.$listFor('testing', config);
    });

    it('returns false for non-tombstone, not deleted docs', () => {
      const doc = { _id: 'a', _rev: 'b', name: 'something' };
      assert.equal(service.testing.containsDeleteStub(doc), false);

      const doc2 = { _id: 'a', _rev: 'b', name: 'something', lastname: 'else' };
      assert.equal(service.testing.containsDeleteStub(doc2), false);
    });

    it('returns false for non-tombstone, deleted docs', () => {
      const doc = { _id: 'a', _rev: 'b', name: 'something', reported: 'now', _deleted: true };
      assert.equal(service.testing.containsDeleteStub(doc), false);
    });

    it('returns false for tombstone deleted not-contained docs', () => {
      const doc = { _id: 'a', _rev: 'b', _deleted: true };
      assert.equal(service.testing.containsDeleteStub(doc), false);
    });

    it('returns true for tombstone deleted docs', () => {
      const doc = { _id: 'a', _rev: 'b', _deleted: true };
      service.testing.set([{ _id: 'a' }]);
      assert.equal(service.testing.containsDeleteStub(doc), true);
    });
  });

});
