var _ = require('underscore');

// medic-webapp specific config for LiveList.
// This service should be invoked once at startup.
angular.module('inboxServices').factory('LiveListConfig',
  function(
    $log,
    $parse,
    $templateCache,
    $timeout,
    $translate,
    ContactSchema,
    LiveList,
    RulesEngine,
    relativeDayFilter,
    TranslateFrom
  ) {
    'use strict';
    'ngInject';

    var HTML_BIND_REGEX = /ng-bind-html="([^"]*)"([^>]*>)/gi;
    var EXPRESSION_REGEX = /\{\{([^}]*)}}/g;
    var TASK_DUE_PERIOD = 24 * 60 * 60 * 1000; // 1 day in millis

    var parse = function(expr, scope) {
      return $parse(expr)(scope) || '';
    };

    var renderTemplate = function(scope) {
      var template = $templateCache.get('templates/partials/content_row_list_item.html');
      return template
        .replace(HTML_BIND_REGEX, function(match, expr, extras) {
          return extras + parse(expr, scope);
        })
        .replace(EXPRESSION_REGEX, function(match, expr) {
          return _.escape(parse(expr, scope));
        });
    };

    // Configure LiveList service
    return function($scope) {

      var contacts_config = {
        orderBy: function(c1, c2) {
          if (!c1 || !c2) {
            return;
          }
          if (c1.sortByLastVisitedDate) {
            return c1.lastVisitedDate - c2.lastVisitedDate;
          }
          if (c1.simprints && c2.simprints) {
            return c2.simprints.confidence - c1.simprints.confidence;
          }
          if (c1.type !== c2.type) {
            return ContactSchema.getTypes().indexOf(c1.type) - ContactSchema.getTypes().indexOf(c2.type);
          }
          var c1Dead = !!c1.date_of_death;
          var c2Dead = !!c2.date_of_death;
          if (c1Dead !== c2Dead) {
            // sort dead people to the bottom
            return c1Dead ? 1 : -1;
          }
          return (c1.name || '').toLowerCase() < (c2.name || '').toLowerCase() ? -1 : 1;
        },
        listItem: function(contact) {
          var scope = $scope.$new();
          scope.id = contact._id;
          scope.route = 'contacts';
          scope.icon = ContactSchema.get(contact.type).icon;
          scope.heading = contact.name;
          scope.primary = contact.home;
          scope.simprintsTier = contact.simprints && contact.simprints.tierNumber;
          scope.dod = contact.date_of_death;
          scope.muted = contact.muted;
          if (contact.type !== 'person') {
            if (Number.isInteger(contact.lastVisitedDate) && contact.lastVisitedDate >= 0) {
              if (contact.lastVisitedDate === 0) {
                scope.overdue = true;
                scope.summary = $translate.instant('contact.last.visited.unknown');
              } else {
                var now = new Date().getTime();
                var oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
                scope.overdue = contact.lastVisitedDate <= oneMonthAgo;
                scope.summary = $translate.instant('contact.last.visited.date', { date: relativeDayFilter(contact.lastVisitedDate, true) });
              }

              var visitCount = Math.min(contact.visitCount, 99) + (contact.visitCount > 99 ? '+' : '');
              scope.visits = {
                count: $translate.instant('contacts.visits.count', { count: visitCount }),
                summary: $translate.instant('contacts.visits.visits', { VISITS: contact.visitCount }, 'messageformat')
              };

              if (contact.visitCountGoal) {
                if (!contact.visitCount) {
                  scope.visits.status = 'pending';
                } else if (contact.visitCount < contact.visitCountGoal) {
                  scope.visits.status = 'started';
                } else {
                  scope.visits.status = 'done';
                }
              }
            } else {
              scope.summary = $translate.instant('contact.primary_contact_name', { name: contact.contact });
            }
          }
          return renderTemplate(scope);
        },
      };

      LiveList.$listFor('contacts', {
        selector: '#contacts-list ul.unfiltered',
        orderBy: contacts_config.orderBy,
        listItem: contacts_config.listItem,
      });

      LiveList.$listFor('contact-search', {
        selector: '#contacts-list ul.filtered',
        orderBy: contacts_config.orderBy,
        listItem: contacts_config.listItem,
      });

      var getHeading = function(report) {
        if (report.validSubject) {
          return report.subject.value;
        }
        if (report.subject.name) {
          return report.subject.name;
        }
        return $translate.instant('report.subject.unknown');
      };

      var reports_config = {
        orderBy: function(r1, r2) {
          var lhs = r1 && r1.reported_date,
              rhs = r2 && r2.reported_date;
          if (!lhs && !rhs) {
            return 0;
          }
          if (!lhs) {
            return 1;
          }
          if (!rhs) {
            return -1;
          }
          return r2.reported_date - r1.reported_date;
        },
        listItem: function(report, removedDomElement) {
          var scope = $scope.$new();
          scope.id = report._id;
          var form = _.findWhere($scope.forms, { code: report.form });
          scope.route = 'reports';
          scope.icon = form && form.icon;
          scope.heading = getHeading(report);
          scope.date = report.reported_date;
          scope.summary = form ? form.title : report.form;
          scope.showStatus = true;
          scope.valid = report.valid;
          scope.verified = report.verified;
          var statusIcon = (report.valid && report.verified) ? 'report-verify-valid-icon.html' : 'report-verify-invalid-icon.html';
          scope.statusIcon = $templateCache.get('templates/partials/svg-icons/'+statusIcon);
          scope.lineage = report.subject && report.subject.lineage || report.lineage;
          scope.unread = !report.read;
          var element = renderTemplate(scope);
          if (removedDomElement &&
              removedDomElement.find('input[type="checkbox"]').is(':checked')) {
            // updating an item that was selected in select mode
            element = $(element);
            element.find('input[type="checkbox"]').prop('checked', true);
          }
          return element;
        },
      };

      LiveList.$listFor('reports', {
        selector: '#reports-list ul.unfiltered',
        orderBy: reports_config.orderBy,
        listItem: reports_config.listItem,
      });

      LiveList.$listFor('report-search', {
        selector: '#reports-list ul.filtered',
        orderBy: reports_config.orderBy,
        listItem: reports_config.listItem,
      });

      var translateProperty = function(property, task) {
        if (_.isString(property)) {
          // new translation key style
          return $translate.instant(property, task);
        }
        // old message array style
        return TranslateFrom(property, task);
      };

      LiveList.$listFor('tasks', {
        selector: '#tasks-list ul',
        orderBy: function(t1, t2) {
          var lhs = t1 && t1.date,
              rhs = t2 && t2.date;
          if (!lhs && !rhs) {
            return 0;
          }
          if (!lhs) {
            return 1;
          }
          if (!rhs) {
            return -1;
          }
          // Currently some task dates are Strings while others are proper JS
          // Date objects.  Simplest way to compare them is to parse all into
          // instances of Date.
          return Date.parse(lhs) - Date.parse(rhs);
        },
        listItem: function(task) {
          var scope = $scope.$new();
          var dueDate = Date.parse(task.date);
          var startOfToday = (new Date()).setHours(0, 0, 0, 0);
          scope.id = task._id;
          scope.route = 'tasks';
          scope.date = task.date;
          scope.overdue = dueDate < startOfToday;
          scope.due = !scope.overdue && (dueDate - startOfToday) < TASK_DUE_PERIOD;
          scope.icon = task.icon;
          scope.heading = task.contact && task.contact.name;
          scope.summary = translateProperty(task.title, task);
          scope.warning = translateProperty(task.priorityLabel, task);
          scope.hideTime = true;
          return renderTemplate(scope);
        },
      });

      LiveList.tasks.set([]);

      RulesEngine.listen('tasks-list', 'task', function(err, tasks) {
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
            if (task.resolved || task.deleted) {
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
);

angular.module('inboxServices').factory('LiveList',
  function(
    $timeout,
    ResourceIcons
  ) {
    'ngInject';

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
      if (!config.selector) {
        throw new Error('No `selector` set for list.');
      }
    }

    function listItemFor(idx, doc, removedDomElement) {
      var li = $(idx.listItem(doc, removedDomElement));
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

      var activeDom = $(idx.selector);
      if(activeDom.length) {
        activeDom.empty();
        _.each(idx.dom, function(li) {
          activeDom.append(li);
        });
        ResourceIcons.replacePlaceholders(activeDom);
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

      $(idx.selector)
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

    function _insert(listName, newItem, skipDomAppend, removedDomElement) {
      var idx = indexes[listName];

      if (!idx.list) {
        return;
      }

      var li = listItemFor(idx, newItem, removedDomElement);

      var newItemIndex = findSortedIndex(idx.list, newItem, idx.orderBy);
      idx.list.splice(newItemIndex, 0, newItem);
      idx.dom.splice(newItemIndex, 0, li);

      if (skipDomAppend) {
        return;
      }

      var activeDom = $(idx.selector);
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
      var removed = _remove(listName, updatedItem);
      _insert(listName, updatedItem, false, removed);
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
        var removed = idx.dom.splice(removeIndex, 1);

        $(idx.selector).children().eq(removeIndex).remove();
        if (removed.length) {
          return removed[0];
        }
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
      delete idx.selected;
    }

    function _containsDeleteStub(listName, doc) {
      // determines if array2 is included in array1
      var arrayIncludes = function(array1, array2) {
        return array2.every(function(elem) {
          return array1.indexOf(elem) !== -1;
        });
      };
      // CouchDB/Fauxton deletes don't include doc fields in the deleted revision
      // _conflicts, _attachments can be part of the _changes request result
      var stubProps = [ '_id', '_rev', '_deleted', '_conflicts', '_attachments' ];
      return arrayIncludes(stubProps, Object.keys(doc)) &&
             !!doc._deleted &&
             _contains(listName, doc);
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

      indexes[name] = _.pick(config, 'selector', 'orderBy', 'listItem');

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
        containsDeleteStub: _.partial(_containsDeleteStub, name)
      };

      return api[name];
    };

    return api;
  }
);
