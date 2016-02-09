// TODO cache activeDom; set it when loading a controller!!

// medic-webapp specific config for LiveList.
// This service should be invoked once at startup.
angular.module('inboxServices').factory('LiveListConfig', [
  '$parse', '$templateCache', 'LiveList',
  function($parse, $templateCache, LiveList) {
    // Configure LiveList service
    return function() {
      var contactTypes = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
      LiveList.$listFor('contacts', {
        selecter: '#contacts-list ul',
        orderBy: function(c1, c2) {
          if (!c1 || !c2) {
            return;
          }
          if (c1.type !== c2.type) {
            return contactTypes.indexOf(c1.type) - contactTypes.indexOf(c2.type);
          }
          return c1.name < c2.name ? -1 : 1;
        },
        listItem: function(contact) {
          var contactHtml = $templateCache.get('templates/partials/contacts_list_item.html');
          var scope = LiveList.contacts.scope.$new();
          scope.contact = contact;
          return contactHtml.replace(/\{\{[^}]+}}/g, function(expr) {
            expr = expr.substring(2, expr.length-2);
            return $parse(expr)(scope);
          });
        },
      });

      LiveList.$listFor('reports', {
        selecter: '#reports-list ul',
        orderBy: function(r1, r2) {
          if (!r1 || !r2) {
            return;
          }
          return r2.reported_date - r1.reported_date;
        },
        listItem: function(report) {
          var reportHtml = $templateCache.get('templates/partials/reports_list_item.html');
          var scope = LiveList.reports.scope.$new();
          scope.report = report;
          return reportHtml.replace(/\{\{[^}]+}}/g, function(expr) {
            expr = expr.substring(2, expr.length-2);
            return $parse(expr)(scope);
          });
        },
      });

      LiveList.$listFor('tasks', {
        selecter: '#tasks-list ul',
        orderBy: function(t1, t2) {
          if (!t1 || !t2) {
            return;
          }
          return t2.date - t1.date;
        },
        listItem: function(task) {
          var taskHtml = $templateCache.get('templates/partials/tasks_list_item.html');
          var scope = LiveList.tasks.scope.$new();
          scope.task = task;
          return taskHtml.replace(/\{\{[^}]+}}/g, function(expr) {
            expr = expr.substring(2, expr.length-2);
            return $parse(expr)(scope);
          });
        },
      });

    };
  }
]);

angular.module('inboxServices').factory('LiveList', [
  function() {
    var api = {};
    var indexes = {};

    function findSortedIndex(list, newItem, orderBy) {
      // start at the end of the list?
      var insertIndex = list.length;

      // search to find where to insert this item
      // TODO binary search more efficient here?  Maybe best to check first if
      // item can go at end of list, and if not _then_ do binary search
      while (insertIndex && orderBy(newItem, list[insertIndex - 1]) < 0) {
        --insertIndex;
      }

      return insertIndex;
    }

    function checkConfig(config) {
      if (!config.listItem) {
        throw new Error('No `listItem` set for list.');
      }
      if (!config.orderBy) {
        throw new Error('No `orderBy` set for list.');
      }
      if (!config.selecter) {
        throw new Error('No `selecter` set for list.');
      }
    }

    function checkInitialised(listName) {
      var idx = indexes[listName];

      if (!idx) {
        throw new Error('LiveList not configured for: ' + listName);
      }
      if (!_initialised(listName)) {
        throw new Error('List not initialised for: ' + listName);
      }
    }

    function _getList(listName) {
      var idx = indexes[listName];

      if (!idx) {
        throw new Error('LiveList not configured for: ' + listName);
      }

      return idx.list;
    }

    function _refresh(listName) {
      checkInitialised(listName);

      var idx = indexes[listName];
      var activeDom = $(idx.selecter);
      if(activeDom.length) {
        activeDom.empty();
        _.each(idx.dom, function(li) {
          activeDom.append(li);
        });
      }
    }

    function _count(listName) {
      checkInitialised(listName);
      var idx = indexes[listName];
      return idx.list.length;
    }

    function _set(listName, items) {
      var idx = indexes[listName];

      if (!idx) {
        throw new Error('LiveList not configured for: ' + listName);
      }

      // TODO we should sort the list in place with a suitable, efficient algorithm
      idx.list = [];
      idx.dom = [];
      for (var i=0, len=items.length; i<len; ++i) {
        _insert(listName, items[i]);
      }
    }

    function _initialised(listName) {
      return  !!indexes[listName].list;
    }

    function _contains(listName, item) {
      checkInitialised(listName);

      var i, list = indexes[listName].list;
      for(i=list.length-1; i>=0; --i) {
        if(list[i]._id === item._id) {
          return true;
        }
      }
      return false;
    }

    function _insert(listName, newItem) {
      checkInitialised(listName);

      var idx = indexes[listName];
      var newItemIndex = findSortedIndex(idx.list, newItem, idx.orderBy);
      idx.list.splice(newItemIndex, 0, newItem);
      idx.dom.splice(newItemIndex, 0, idx.listItem(newItem));

      var activeDom = $(idx.selecter);
      if(activeDom.length) {
        var children = activeDom.children();
        var li = idx.listItem(newItem);
        if (!children.length || newItemIndex === children.length) {
          activeDom.append(li);
        } else {
          activeDom.children().eq(newItemIndex)
              .before(li);
        }
      }
    }

    function _update(listName, updatedItem) {
      _remove(listName, updatedItem);
      _insert(listName, updatedItem);
    }

    function _remove(listName, removedItem) {
      checkInitialised(listName);

      var idx = indexes[listName];
      var i = idx.list.length,
          removeIndex = null;
      while (i-- > 0 && removeIndex === null) {
        if(idx.list[i]._id === removedItem._id) {
          removeIndex = i;
        }
      }
      if (removeIndex !== null) {
        idx.list.splice(removeIndex, 1);
        idx.dom.splice(removeIndex, 1);

        $(idx.selecter).children().eq(removeIndex)
            .remove();
      }
    }


    api.$listFor = function(name, config) {
      checkConfig(config);

      indexes[name] = _.pick(config, 'selecter', 'orderBy', 'listItem');

      api[name] = {
        insert: _.partial(_insert, name),
        update: _.partial(_update, name),
        remove: _.partial(_remove, name),
        getList: _.partial(_getList, name),
        set: _.partial(_set, name),
        refresh: _.partial(_refresh, name),
        count: _.partial(_count, name),
        contains: _.partial(_contains, name),
        initialised: _.partial(_initialised, name),
      };

      return api[name];
    };

    return api;
  }
]);
