function PARSER($parse, scope) {
  return function(expr) {
    expr = expr.substring(2, expr.length-2);
    return $parse(expr)(scope) || '';
  };
}

// medic-webapp specific config for LiveList.
// This service should be invoked once at startup.
angular.module('inboxServices').factory('LiveListConfig', [
  '$log', '$parse', '$templateCache', '$timeout',
      'Changes', 'DB', 'LiveList', 'TaskGenerator', 'CONTACT_TYPES',
  function($log, $parse, $templateCache, $timeout,
      Changes, DB, LiveList, TaskGenerator, CONTACT_TYPES) {
    // Configure LiveList service
    return function($scope) {

      var contacts_config = {
        orderBy: function(c1, c2) {
          if (!c1 || !c2) {
            return;
          }
          if (c1.type !== c2.type) {
            return CONTACT_TYPES.indexOf(c1.type) - CONTACT_TYPES.indexOf(c2.type);
          }
          return (c1.name || '').toLowerCase() < (c2.name || '').toLowerCase() ? -1 : 1;
        },
        listItem: function(contact) {
          var contactHtml = $templateCache.get('templates/partials/contacts_list_item.html');
          var scope = $scope.$new();
          scope.contact = contact;
          return contactHtml.replace(/\{\{[^}]+}}/g, PARSER($parse, scope));
        },
      };

      LiveList.$listFor('contacts', {
        selecter: '#contacts-list ul.unfiltered',
        orderBy: contacts_config.orderBy,
        listItem: contacts_config.listItem,
      });

      LiveList.$listFor('contact-search', {
        selecter: '#contacts-list ul.filtered',
        orderBy: contacts_config.orderBy,
        listItem: contacts_config.listItem,
      });

      Changes({
        key: 'contacts-list',
        callback: function(change) {
          if (change.deleted) {
            LiveList.contacts.remove({ _id: change.id });
            return;
          }
          LiveList.contacts.update(change.doc);
        },
        filter: function(change) {
          return CONTACT_TYPES.indexOf(change.doc.type) !== -1;
        }
      });

      var reports_config = {
        orderBy: function(r1, r2) {
          if (!r1 || !r2) {
            return;
          }
          return r2.reported_date - r1.reported_date;
        },
        listItem: function(report) {
          var reportHtml = $templateCache.get('templates/partials/reports_list_item.html');
          var scope = $scope.$new();
          scope.report = report;
          return reportHtml.replace(/\{\{[^}]+}}/g, PARSER($parse, scope));
        },
      };

      LiveList.$listFor('reports', {
        selecter: '#reports-list ul.unfiltered',
        orderBy: reports_config.orderBy,
        listItem: reports_config.listItem,
      });

      LiveList.$listFor('report-search', {
        selecter: '#reports-list ul.filtered',
        orderBy: reports_config.orderBy,
        listItem: reports_config.listItem,
      });

      Changes({
        key: 'reports-list',
        callback: function(change) {
          if (change.deleted) {
            LiveList.reports.remove({ _id: change.id });
            return;
          }
          LiveList.reports.update(change.doc);
        },
        filter: function(change) {
          return change.doc.form;
        }
      });

      LiveList.$listFor('tasks', {
        selecter: '#tasks-list ul',
        orderBy: function(t1, t2) {
          if (!t1 || !t2) {
            return;
          }
          // Currently some task dates are Strings while others are proper JS
          // Date objects.  Simplest way to compare them is to parse all into
          // instances of Date.
          return Date.parse(t1.date) - Date.parse(t2.date);
        },
        listItem: function(task) {
          var taskHtml = $templateCache.get('templates/partials/tasks_list_item.html');
          var scope = $scope.$new();
          scope.task = task;
          return taskHtml.replace(/\{\{[^}]+}}/g, PARSER($parse, scope));
        },
      });

      LiveList.tasks.set([]);

      TaskGenerator('tasks-list', 'task', function(err, tasks) {
        if (err) {
          $log.error('Error getting tasks', err);

          var notifyError = LiveList.tasks.notifyError;
          if (notifyError) {
            notifyError();
          }

          LiveList.tasks.set([]);
          return;
        }

        $timeout(function() {
          tasks.forEach(function(task) {
            if (task.resolved) {
              LiveList.tasks.remove(task);
            } else {
              LiveList.tasks.update(task);
            }

            var notifyChange = LiveList.tasks.notifyChange;
            if (notifyChange) {
              notifyChange(task);
            }
          });
        });
      });

    };
  }
]);

angular.module('inboxServices').factory('LiveList', [
  '$timeout',
  function($timeout) {
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

    function listItemFor(idx, doc) {
      var li = $(idx.listItem(doc));
      if (doc._id === idx.selected) {
        li.addClass('selected');
      }
      return li;
    }

    function _getList(listName) {
      var idx = indexes[listName];

      if (!idx) {
        throw new Error('LiveList not configured for: ' + listName);
      }

      return idx.list;
    }

    function _refresh(listName) {
      var idx = indexes[listName];

      if (!idx.list) {
        return;
      }

      var activeDom = $(idx.selecter);
      if(activeDom.length) {
        activeDom.empty();
        _.each(idx.dom, function(li) {
          activeDom.append(li);
        });
      }
    }

    function _count(listName) {
      var idx = indexes[listName];
      return idx.list && idx.list.length;
    }

    function _set(listName, items) {
      var i, len,
          idx = indexes[listName];

      if (!idx) {
        throw new Error('LiveList not configured for: ' + listName);
      }

      idx.lastUpdate = new Date();

      // TODO we should sort the list in place with a suitable, efficient algorithm
      idx.list = [];
      idx.dom = [];
      for (i=0, len=items.length; i<len; ++i) {
        _insert(listName, items[i], true);
      }

      $(idx.selecter)
          .empty()
          .append(idx.dom);
    }

    function _initialised(listName) {
      return !!indexes[listName].list;
    }

    function _contains(listName, item) {
      var i, list = indexes[listName].list;

      if (!list) {
        return false;
      }

      for(i=list.length-1; i>=0; --i) {
        if(list[i]._id === item._id) {
          return true;
        }
      }
      return false;
    }

    function _insert(listName, newItem, skipDomAppend) {
      var idx = indexes[listName];

      if (!idx.list) {
        return;
      }

      var li = listItemFor(idx, newItem);

      var newItemIndex = findSortedIndex(idx.list, newItem, idx.orderBy);
      idx.list.splice(newItemIndex, 0, newItem);
      idx.dom.splice(newItemIndex, 0, li);

      if (skipDomAppend) {
        return;
      }

      var activeDom = $(idx.selecter);
      if(activeDom.length) {
        var children = activeDom.children();
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
      var idx = indexes[listName];

      if (!idx.list) {
        return;
      }

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

    function _setSelected(listName, _id) {
      var i, len, doc,
          idx = indexes[listName],
          list = idx.list,
          previous = idx.selected;

      idx.selected = _id;

      if (!list) {
        return;
      }

      for (i=0, len=list.length; i<len; ++i) {
        doc = list[i];
        if (doc._id === previous) {
          idx.dom[i]
              .removeClass('selected');
        }
        if (doc._id === _id) {
          idx.dom[i]
              .addClass('selected');
        }
      }
    }

    function _clearSelected(listName) {
      var i, len,
          idx = indexes[listName],
          list = idx.list,
          previous = idx.selected;

      if (!list || !previous) {
        return;
      }

      for (i=0, len=list.length; i<len; ++i) {
        if (list[i]._id === previous) {
          idx.dom[i].removeClass('selected');
        }
      }
    }

    function refreshAll() {
      var i, now = new Date();

      _.forEach(indexes, function(idx, name) {
        // N.B. no need to update a list that's never been generated
        if (idx.lastUpdate && !sameDay(idx.lastUpdate, now)) {
          // regenerate all list contents so relative dates relate to today
          // instead of yesterday
          for (i=idx.list.length-1; i>=0; --i) {
            idx.dom[i] = listItemFor(idx, idx.list[i]);
          }

          api[name].refresh();

          idx.lastUpdate = now;
        }
      });

      // Schedule this task again for tomorrow
      $timeout(refreshAll, millisTilMidnight(now));
    }

    function sameDay(d1, d2) {
      return d1.getDay() === d2.getDay();
    }

    function millisTilMidnight(now) {
      var midnight = new Date(now);

      midnight.setDate(now.getDate() + 1);
      midnight.setHours(0);
      midnight.setMinutes(0);

      return midnight.getTime() - now.getTime();
    }

    $timeout(refreshAll, millisTilMidnight(new Date()));

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
        setSelected: _.partial(_setSelected, name),
        clearSelected: _.partial(_clearSelected, name),
      };

      return api[name];
    };

    return api;
  }
]);
