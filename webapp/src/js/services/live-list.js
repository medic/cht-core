const _ = require('lodash/core');
const moment = require('moment');

// medic specific config for LiveList.
// This service should be invoked once at startup.
angular.module('inboxServices').factory('LiveListConfig',
  function(
    $ngRedux,
    $parse,
    $templateCache,
    $translate,
    ContactTypes,
    LiveList,
    Selectors,
    relativeDayFilter
  ) {
    'use strict';
    'ngInject';

    const ctrl = this;
    $ngRedux.connect(state => ({ forms: Selectors.getForms(state) }))(ctrl);

    const HTML_BIND_REGEX = /ng-bind-html="([^"]*)"([^>]*>)/gi;
    const EXPRESSION_REGEX = /\{\{([^}]*)}}/g;

    const parse = function(expr, scope) {
      return $parse(expr)(scope) || '';
    };

    const renderTemplate = function(scope) {
      const template = $templateCache.get('templates/directives/content_row_list_item.html');
      return template
        .replace(HTML_BIND_REGEX, function(match, expr, extras) {
          return extras + parse(expr, scope);
        })
        .replace(EXPRESSION_REGEX, function(match, expr) {
          return _.escape(parse(expr, scope));
        });
    };

    const getContactTypeOrder = contact => {
      if (contact.type === 'contact') {
        const idx = ContactTypes.HARDCODED_TYPES.indexOf(contact.contact_type);
        if (idx !== -1) {
          // matches a hardcoded type - order by the index
          return '' + idx;
        }
        // order by the name of the type
        return contact.contact_type;
      }
      // backwards compatibility with hardcoded hierarchy
      return '' + ContactTypes.HARDCODED_TYPES.indexOf(contact.type);
    };

    // Configure LiveList service
    return function() {

      const contacts_config = {
        orderBy: function(c1, c2) {
          if (!c1 || !c2) {
            return;
          }

          // sort dead people to the bottom
          if (!!c1.date_of_death !== !!c2.date_of_death) {
            return c1.date_of_death ? 1 : -1;
          }

          // sort muted people to the bottom
          if (!!c1.muted !== !!c2.muted) {
            return c1.muted ? 1 : -1;
          }

          if (c1.sortByLastVisitedDate) {
            return c1.lastVisitedDate - c2.lastVisitedDate;
          }
          if (c1.simprints && c2.simprints) {
            return c2.simprints.confidence - c1.simprints.confidence;
          }
          const c1Type = getContactTypeOrder(c1) || '';
          const c2Type = getContactTypeOrder(c2) || '';
          if (c1Type !== c2Type) {
            return c1Type < c2Type ? -1 : 1;
          }

          return (c1.name || '').toLowerCase() < (c2.name || '').toLowerCase() ? -1 : 1;
        },
        listItem: function(contact, contactTypes) {
          const typeId = contact.contact_type || contact.type;
          const type = contactTypes.find(type => type.id === typeId);
          const scope = {};
          scope.id = contact._id;
          scope.route = 'contacts';
          scope.icon = type && type.icon;
          scope.heading = contact.name;
          scope.primary = contact.home;
          scope.simprintsTier = contact.simprints && contact.simprints.tierNumber;
          scope.dod = contact.date_of_death;
          scope.muted = contact.muted;
          if (type && type.count_visits && Number.isInteger(contact.lastVisitedDate)) {
            if (contact.lastVisitedDate === 0) {
              scope.overdue = true;
              scope.summary = $translate.instant('contact.last.visited.unknown');
            } else {
              const now = new Date().getTime();
              const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
              scope.overdue = contact.lastVisitedDate <= oneMonthAgo;
              scope.summary = $translate.instant(
                'contact.last.visited.date',
                { date: relativeDayFilter(contact.lastVisitedDate, true) }
              );
            }

            const visitCount = Math.min(contact.visitCount, 99) + (contact.visitCount > 99 ? '+' : '');
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

    
      
      const getTraining = function(form, training) {
        if (form && form.subjectKey) {
          return $translate.instant(form.subjectKey, training);
        }
        if (training.validSubject) {
          return training.subject.value;
        }
        if (training.subject.name) {
          return training.subject.name;
        }
        return $translate.instant('training.subject.unknown');
      };

      const trainings_config = {
        orderBy: function(r1, r2) {
          const lhs = r1 && r1.training_date;
          const rhs = r2 && r2.training_date;
          if (!lhs && !rhs) {
            return 0;
          }
          if (!lhs) {
            return 1;
          }
          if (!rhs) {
            return -1;
          }
          return r2.training_date - r1.training_date;
        },
        listItem: function(training, contactTypes, removedDomElement) {
          const scope = {};
          scope.id = training._id;
          const form = _.find(ctrl.forms, { code: training.form });
          scope.route = 'trainings';
          scope.icon = form && form.icon;
          scope.heading = getHeading(form, training);
          scope.date = training.training_date;
          scope.summary = form ? form.title : training.form;
          scope.showStatus = true;
          scope.valid = training.valid;
          scope.verified = training.verified;
          const statusIcon = (training.valid && training.verified) ?
            'training-verify-valid-icon.html' : 'training-verify-invalid-icon.html';
          scope.statusIcon = $templateCache.get('templates/partials/svg-icons/'+statusIcon);
          scope.lineage = training.subject && training.subject.lineage || training.lineage;
          scope.unread = !training.read;
          let element = renderTemplate(scope);
          if (removedDomElement &&
              removedDomElement.find('input[type="checkbox"]').is(':checked')) {
            // updating an item that was selected in select mode
            element = $(element);
            element.find('input[type="checkbox"]').prop('checked', true);
          }
          return element;
        },
      };

      LiveList.$listFor('trainings', {
        selector: '#trainings-list ul.unfiltered',
        orderBy: trainings_config.orderBy,
        listItem: trainings_config.listItem,
      });

      LiveList.$listFor('training-search', {
        selector: '#trainings-list ul.filtered',
        orderBy: trainings_config.orderBy,
        listItem: trainings_config.listItem,
      });
      


      const getHeading = function(form, report) {
        if (form && form.subjectKey) {
          return $translate.instant(form.subjectKey, report);
        }
        if (report.validSubject) {
          return report.subject.value;
        }
        if (report.subject.name) {
          return report.subject.name;
        }
        return $translate.instant('report.subject.unknown');
      };

      const reports_config = {
        orderBy: function(r1, r2) {
          const lhs = r1 && r1.reported_date;
          const rhs = r2 && r2.reported_date;
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
        listItem: function(report, contactTypes, removedDomElement) {
          const scope = {};
          scope.id = report._id;
          const form = _.find(ctrl.forms, { code: report.form });
          scope.route = 'reports';
          scope.icon = form && form.icon;
          scope.heading = getHeading(form, report);
          scope.date = report.reported_date;
          scope.summary = form ? form.title : report.form;
          scope.showStatus = true;
          scope.valid = report.valid;
          scope.verified = report.verified;
          const statusIcon = (report.valid && report.verified) ?
            'report-verify-valid-icon.html' : 'report-verify-invalid-icon.html';
          scope.statusIcon = $templateCache.get('templates/partials/svg-icons/'+statusIcon);
          scope.lineage = report.subject && report.subject.lineage || report.lineage;
          scope.unread = !report.read;
          let element = renderTemplate(scope);
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

      LiveList.$listFor('tasks', {
        selector: '#tasks-list ul',
        orderBy: function(t1, t2) {
          const lhs = t1 && t1.dueDate;
          const rhs = t2 && t2.dueDate;
          if (!lhs && !rhs) {
            return 0;
          }
          if (!lhs) {
            return 1;
          }
          if (!rhs) {
            return -1;
          }

          return lhs < rhs ? -1 : 1;
        },
        listItem: function(task) {
          const scope = {};
          const dueDate = moment(task.dueDate, 'YYYY-MM-DD');
          scope.id = task._id;
          scope.route = 'tasks';
          scope.date = new Date(dueDate.valueOf());
          scope.overdue = dueDate.isBefore(moment());
          scope.icon = task.icon;
          scope.heading = task.contact && task.contact.name;
          scope.summary = task.title;
          scope.warning = task.priorityLabel;
          scope.dateFormat = 'taskDueDate';
          return renderTemplate(scope);
        },
      });

      LiveList.tasks.set([]);

    };
  }
);

angular.module('inboxServices').factory('LiveList',
  function(
    $timeout,
    ContactTypes,
    ResourceIcons
  ) {
    'ngInject';

    const api = {};
    const indexes = {};
    let contactTypes;

    ContactTypes.getAll().then(types => contactTypes = types);

    function findSortedIndex(list, newItem, orderBy) {
      // start at the end of the list?
      let insertIndex = list.length;

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

    function listItemFor(idx, doc, contactTypes, removedDomElement) {
      const li = $(idx.listItem(doc, contactTypes, removedDomElement));
      if (doc._id === idx.selected) {
        li.addClass('selected');
      }
      return li;
    }

    function _getList(listName) {
      const idx = indexes[listName];

      if (!idx) {
        throw new Error('LiveList not configured for: ' + listName);
      }

      return idx.list;
    }

    function _refresh(listName) {
      const idx = indexes[listName];

      if (!idx.list) {
        return;
      }

      const activeDom = $(idx.selector);
      if(activeDom.length) {
        activeDom.empty();
        appendDomWithListOrdering(activeDom, idx);
        ResourceIcons.replacePlaceholders(activeDom);
      }
    }

    function _count(listName) {
      const idx = indexes[listName];
      return idx.list && idx.list.length;
    }

    /*
    reuseExistingDom is a performance optimization wherein live-list can rely on the changes feed to
    specifically update dom elements (via update/remove interfaces) making it safe to re-use existing dom
    elements for certain scenarios
    */
    function _set(listName, items, reuseExistingDom) {
      const idx = indexes[listName];
      if (!idx) {
        throw new Error('LiveList not configured for: ' + listName);
      }

      idx.lastUpdate = new Date();
      idx.list = items.sort(idx.orderBy);
      const newDom = {};
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        const useCache = reuseExistingDom && idx.dom[item._id] && !idx.dom[item._id].invalidateCache;
        const li = useCache ? idx.dom[item._id] : listItemFor(idx, item, contactTypes);
        newDom[item._id] = li;
      }
      idx.dom = newDom;

      _refresh(listName);
    }

    function _initialised(listName) {
      return !!indexes[listName].list;
    }

    function _contains(listName, item) {
      if (!indexes[listName].list) {
        return false;
      }

      return !!indexes[listName].dom[item._id || item];
    }

    function _insert(listName, newItem, skipDomAppend, removedDomElement) {
      const idx = indexes[listName];

      if (!idx.list) {
        return;
      }

      const li = listItemFor(idx, newItem, contactTypes, removedDomElement);

      const newItemIndex = findSortedIndex(idx.list, newItem, idx.orderBy);
      idx.list.splice(newItemIndex, 0, newItem);
      idx.dom[newItem._id] = li;

      if (skipDomAppend) {
        return;
      }

      const activeDom = $(idx.selector);
      if(activeDom.length) {
        const children = activeDom.children();
        if (!children.length || newItemIndex === children.length) {
          activeDom.append(li);
        } else {
          activeDom.children().eq(newItemIndex)
            .before(li);
        }
      }
    }

    function _invalidateCache(listName, id) {
      const idx = indexes[listName];
      if (!idx || !idx.dom || !id || !idx.dom[id]) {
        return;
      }

      idx.dom[id].invalidateCache = true;
    }

    function _update(listName, updatedItem) {
      const removed = _remove(listName, updatedItem);
      _insert(listName, updatedItem, false, removed);
    }

    function _remove(listName, removedItem) {
      const idx = indexes[listName];
      const removedItemId = removedItem._id || removedItem;

      if (!idx.list) {
        return;
      }

      let i = idx.list.length;
      let removeIndex = null;
      while (i-- > 0 && removeIndex === null) {
        if(idx.list[i]._id === removedItemId) {
          removeIndex = i;
        }
      }
      if (removeIndex !== null) {
        idx.list.splice(removeIndex, 1);
        const removed = idx.dom[removedItemId];
        delete idx.dom[removedItemId];

        $(idx.selector).children().eq(removeIndex).remove();
        return removed;
      }
    }

    function _setSelected(listName, _id) {
      const idx = indexes[listName];
      const previous = idx.selected;

      idx.selected = _id;

      if (!idx.list) {
        return;
      }

      if (previous && idx.dom[previous]) {
        idx.dom[previous].removeClass('selected');
      }

      if (idx.dom[_id]) {
        idx.dom[_id].addClass('selected');
      }
    }

    function _clearSelected(listName) {
      const idx = indexes[listName];

      if (!idx.list || !idx.selected) {
        return;
      }

      if (idx.dom[idx.selected]) {
        idx.dom[idx.selected].removeClass('selected');
      }

      delete idx.selected;
    }

    function refreshAll() {
      const now = new Date();

      _.forEach(indexes, function(idx, name) {
        // N.B. no need to update a list that's never been generated
        if (idx.lastUpdate && !sameDay(idx.lastUpdate, now)) {
          // regenerate all list contents so relative dates relate to today
          // instead of yesterday
          for (let i = 0; i < idx.list.length; ++i) {
            const item = idx.list[i];
            idx.dom[item._id] = listItemFor(idx, item, contactTypes);
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
      const midnight = new Date(now);

      midnight.setDate(now.getDate() + 1);
      midnight.setHours(0);
      midnight.setMinutes(0);

      return midnight.getTime() - now.getTime();
    }

    function appendDomWithListOrdering(activeDom, idx) {
      const orderedDom = idx.list.map(item => idx.dom[item._id]);
      activeDom.append(orderedDom);
    }

    $timeout(refreshAll, millisTilMidnight(new Date()));

    api.$listFor = function(name, config) {
      checkConfig(config);

      indexes[name] = _.pick(config, 'selector', 'orderBy', 'listItem');

      api[name] = {
        insert: _.partial(_insert, name),
        invalidateCache: _.partial(_invalidateCache, name),
        update: _.partial(_update, name),
        remove: _.partial(_remove, name),
        getList: _.partial(_getList, name),
        set: _.partial(_set, name),
        refresh: _.partial(_refresh, name),
        count: _.partial(_count, name),
        contains: _.partial(_contains, name),
        initialised: _.partial(_initialised, name),
        setSelected: _.partial(_setSelected, name),
        clearSelected: _.partial(_clearSelected, name)
      };

      return api[name];
    };

    api.$reset = function() {
      for (let i = 0; i < arguments.length; i++) {
        const listName = arguments[i];
        if (api[listName]) {
          api[listName].set([]);
        }
      }
    };

    return api;
  }
);
