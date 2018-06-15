var _ = require('underscore'),
    Tour = require('bootstrap-tour');

angular.module('inboxServices').service('Tour',
  function(
    $q,
    $state,
    $timeout,
    $translate,
    AnalyticsModules,
    Auth,
    Session
  ) {

    'use strict';
    'ngInject';

    var mmScroll = function(container, elem) {
      container = $(container);
      if (container.length) {
        elem = container.find(elem);
        if (elem.length) {
          container.scrollTop(container.scrollTop() + elem.offset().top - 300);
        }
      }
    };

    var isMobile = function() {
      return $('#mobile-detection').css('display') === 'inline';
    };

    var mmShowMessageList = function() {
      mmShow('#message-list', false);
    };

    var mmShowMessageContent = function() {
      mmShow('#message-list', true);
    };

    var mmShowTaskList = function() {
      mmShow('#tasks-list', false);
    };

    var mmShowTaskContent = function() {
      mmShow('#tasks-list', true);
    };

    var mmShowReportList = function() {
      mmShow('#reports-list', false);
    };

    var mmShowReportContent = function() {
      mmShow('#reports-list', true);
    };

    var mmShowContactList = function() {
      mmShow('#contacts-list', false);
    };

    var mmShowContactContent = function() {
      mmShow('#contacts-list', true);
    };

    var mmShow = function(list, showContent) {
      var showingContent = $('body').is('.show-content');
      if (showContent !== showingContent) {
        if (showContent) {
          $(list).find('li').filter(':first').find('a').trigger('click');
        } else if (isMobile()) {
          $('.navigation .filter-bar-back a').trigger('click');
        }
      }
    };

    var mmOpenDropdown = function(elem) {
      if (!isMobile()) {
        window.setTimeout(function() {
          $(elem).addClass('open');
        }, 1);
      }
    };

    var tours = [
      {
        name: 'messages',
        route: 'messages.detail',
        orphan: true,
        debug: true,
        steps: [
          {
            element: '#messages-tab',
            placement: 'bottom',
            title: 'tour.messages.unstructured.title',
            content: 'tour.messages.unstructured.description',
            onShow: mmShowMessageList
          },
          {
            element: '#message-list',
            placement: 'right',
            mobilePlacement: 'orphan',
            title: 'tour.messages.list.title',
            content: 'tour.messages.list.description',
            onShow: mmShowMessageList
          },
          {
            element: '#message-content',
            placement: 'left',
            mobilePlacement: 'orphan',
            title: 'tour.messages.exchange.title',
            content: 'tour.messages.exchange.description',
            onShow: mmShowMessageContent
          },
          {
            element: '#message-header',
            placement: 'bottom',
            title: 'tour.messages.contact.title',
            content: 'tour.messages.contact.description',
            onShow: mmShowMessageContent
          },
          {
            element: '#message-content .outgoing:last .message-body',
            placement: 'top',
            title: 'tour.messages.outgoing.title',
            content: 'tour.messages.outgoing.description',
            onShow: function() {
              mmShowMessageContent();
              mmScroll('#message-content', '.outgoing:last');
            }
          },
          {
            element: '#message-content .incoming:last .message-body',
            placement: 'top',
            title: 'tour.messages.incoming.title',
            content: 'tour.messages.incoming.description',
            onShow: function() {
              mmShowMessageContent();
              mmScroll('#message-content', '.incoming:last');
            }
          },
          {
            element: '#message-footer',
            placement: 'top',
            title: 'tour.messages.send.title',
            content: 'tour.messages.send.description',
            onShow: mmShowMessageContent
          }
        ]
      },
      {
        name: 'tasks',
        route: 'tasks.detail',
        orphan: true,
        debug: true,
        steps: [
          {
            element: '#tasks-tab',
            placement: 'bottom',
            title: 'tour.tasks.overview.title',
            content: 'tour.tasks.overview.description',
            onShow: mmShowTaskList
          },
          {
            element: '#tasks-list',
            placement: 'right',
            mobilePlacement: 'orphan',
            title: 'tour.tasks.list.title',
            content: 'tour.tasks.list.description',
            onShow: mmShowTaskList
          },
          {
            element: '.right-pane',
            placement: 'left',
            mobilePlacement: 'orphan',
            title: 'tour.tasks.details.title',
            content: 'tour.tasks.details.description',
            onShow: mmShowTaskContent
          },
          {
            element: '.right-pane .next-page',
            placement: 'top',
            mobilePlacement: 'top',
            title: 'tour.tasks.next.title',
            content: 'tour.tasks.next.description',
            onShow: mmShowTaskContent
          },
          {
            element: '.right-pane .form-footer',
            placement: 'top',
            mobilePlacement: 'top',
            title: 'tour.tasks.submit.title',
            content: 'tour.tasks.submit.description',
            onShow: mmShowTaskContent
          },
          {
            element: '#tasks-list',
            placement: 'right',
            mobilePlacement: 'orphan',
            title: 'tour.tasks.cleared.title',
            content: 'tour.tasks.cleared.description',
            onShow: mmShowTaskContent
          }
        ]
      },
      {
        name: 'reports',
        route: 'reports.detail',
        orphan: true,
        debug: true,
        steps: [
          {
            element: '#reports-tab',
            placement: 'bottom',
            title: 'tour.reports.forms.title',
            content: 'tour.reports.forms.description',
            onShow: mmShowReportList
          },
          {
            element: '#formTypeDropdown',
            placement: 'right',
            mobilePlacement: 'bottom',
            title: 'tour.reports.types-filter.title',
            content: 'tour.reports.types-filter.description',
            onShow: mmShowReportList,
            onShown: function() {
              mmOpenDropdown('#formTypeDropdown');
            },
            onHide: function() {
              $('#formTypeDropdown').removeClass('open');
            }
          },
          {
            element: '#facilityDropdown',
            placement: 'right',
            mobilePlacement: 'bottom',
            title: 'tour.reports.facilities-filter.title',
            content: 'tour.reports.facilities-filter.description',
            onShow: mmShowReportList,
            onShown: function() {
              mmOpenDropdown('#facilityDropdown');
            },
            onHide: function() {
              $('#facilityDropdown').removeClass('open');
            }
          },
          {
            element: '#dateRangeDropdown',
            placement: 'left',
            mobilePlacement: 'bottom',
            title: 'tour.reports.date-filter.title',
            content: 'tour.reports.date-filter.description',
            onShow: mmShowReportList,
            onShown: function() {
              if (!isMobile()) {
                $('#date-filter').trigger('click');
              }
            },
            onHide: function() {
              $('#date-filter').trigger('hide.daterangepicker');
            }
          },
          {
            element: '#statusDropdown',
            placement: 'left',
            mobilePlacement: 'bottom',
            title: 'tour.reports.status-filter.title',
            content: 'tour.reports.status-filter.description',
            onShow: mmShowReportList,
            onShown: function() {
              mmOpenDropdown('#statusDropdown');
            },
            onHide: function() {
              $('#statusDropdown').removeClass('open');
            }
          },
          {
            element: '#freetext',
            mobileElement: '#mobile-search',
            placement: 'left',
            mobilePlacement: 'bottom',
            title: 'tour.reports.freetext-filter.title',
            content: 'tour.reports.freetext-filter.description',
            onShow: mmShowReportList
          },
          {
            element: '#reports-list',
            placement: 'right',
            mobilePlacement: 'orphan',
            title: 'tour.reports.list.title',
            content: 'tour.reports.list.description',
            onShow: mmShowReportList
          },
          {
            element: '#reports-list li:first-child .status',
            placement: 'right',
            mobilePlacement: 'bottom',
            title: 'tour.reports.status.title',
            content: 'tour.reports.status.description',
            onShow: mmShowReportList
          },
          {
            element: '#reports-content',
            placement: 'left',
            mobilePlacement: 'orphan',
            title: 'tour.reports.details.title',
            content: 'tour.reports.details.description',
            onShow: mmShowReportContent
          },
          {
            element: '#reports-content .item-summary',
            placement: 'left',
            mobilePlacement: 'bottom',
            title: 'tour.reports.information.title',
            content: 'tour.reports.information.description',
            onShow: mmShowReportContent
          },
          {
            element: '#reports-content .report-body',
            placement: 'left',
            mobilePlacement: 'top',
            title: 'tour.reports.content.title',
            content: 'tour.reports.content.description',
            onShow: mmShowReportContent
          },
          {
            element: '.detail-actions:not(.ng-hide)',
            placement: 'top',
            title: 'tour.reports.actions.title',
            content: 'tour.reports.actions.description',
            onShow: mmShowReportContent
          }
        ]
      },
      {
        name: 'contacts',
        route: 'contacts.detail',
        orphan: true,
        debug: true,
        steps: [
          {
            element: '#contacts-tab',
            placement: 'bottom',
            title: 'tour.contacts.overview.title',
            content: 'tour.contacts.overview.description',
            onShow: mmShowContactList
          },
          {
            element: '#freetext',
            mobileElement: '#mobile-search',
            placement: 'bottom',
            mobilePlacement: 'bottom',
            title: 'tour.contacts.search.title',
            content: 'tour.contacts.search.description',
            onShow: mmShowContactList
          },
          {
            element: '.general-actions:not(.ng-hide)',
            placement: 'top',
            mobilePlacement: 'top',
            title: 'tour.contacts.add.title',
            content: 'tour.contacts.add.description',
            onShow: mmShowContactList
          },
          {
            element: '#contacts-list',
            placement: 'right',
            mobilePlacement: 'orphan',
            title: 'tour.contacts.list.title',
            content: 'tour.contacts.list.description',
            onShow: mmShowContactList
          },
          {
            element: '.item-content .meta',
            placement: 'left',
            mobilePlacement: 'orphan',
            title: 'tour.contacts.details.title',
            content: 'tour.contacts.details.description',
            onShow: mmShowContactContent
          },
          {
            element: '.detail-actions:not(.ng-hide)',
            placement: 'top',
            mobilePlacement: 'top',
            title: 'tour.contacts.actions.title',
            content: 'tour.contacts.actions.description',
            onShow: mmShowContactContent
          }
        ]
      },
      {
        name: 'analytics',
        route: 'analytics',
        orphan: true,
        debug: true,
        steps: [
          {
            element: '#analytics-tab',
            placement: 'bottom',
            title: 'tour.analytics.overview.title',
            content: 'tour.analytics.overview.description'
          }
        ]
      }
    ];

    var current;

    var createTemplate = function() {
      return  '<div class="popover tour">' +
                '<div class="arrow"></div>' +
                '<h3 class="popover-title"></h3>' +
                '<div class="popover-content"></div>' +
                '<div class="popover-navigation">' +
                  '<div class="btn-group">' +
                    '<button class="btn btn-sm btn-default" data-role="prev">' +
                      '&laquo; ' + $translate.instant('Previous') +
                    '</button>' +
                    '<button class="btn btn-sm btn-default" data-role="next">' +
                      $translate.instant('Next') + ' &raquo;' +
                    '</button>' +
                  '</div>' +
                  '<button class="btn btn-sm btn-link" data-role="end">' +
                    $translate.instant('End tour') +
                  '</button>' +
                '</div>' +
              '</div>';
    };

    var getTour = function(name) {
      return _.findWhere(tours, { name: name }) || tours[0];
    };

    var getSettings = function(name) {

      var settings = getTour(name);
      settings.autoscroll = false;

      if (!settings.transmogrified) {

        settings.template = createTemplate();

        var mobile = isMobile();
        _.each(settings.steps, function(step) {
          step.title = $translate.instant(step.title);
          step.content = $translate.instant(step.content);
          if (mobile) {
          // there's no room to show steps to the left or right on a mobile device
            if (step.mobileElement) {
              step.element = step.mobileElement;
            }
            if (step.mobilePlacement) {
              if (step.mobilePlacement === 'orphan') {
                delete step.element;
              } else {
                step.placement = step.mobilePlacement;
              }
            }
          }
        });

        settings.transmogrified = true;

      }

      return settings;
    };

    var createTour = function(name) {
      var settings = getSettings(name);
      var tour = new Tour(settings);
      tour.init();
      tour.restart();
      current = {
        tour: tour,
        name: name
      };
    };

    var endCurrent = function() {
      if (current && current.tour) {
        current.tour.end();
        // remove any popovers that have become disassociated
        $('.popover.tour-' + current.name).remove();
        current = null;
      }
    };

    var getMessagesTour = function() {
      return Auth('can_view_messages_tab')
        .then(function() {
          return {
            order: 0,
            id: 'messages',
            icon: 'fa-envelope',
            name: 'Messages'
          };
        })
        .catch(function() {});
    };

    var getTasksTour = function() {
      if (Session.isOnlineOnly()) {
        return;
      }
      return Auth('can_view_tasks_tab')
        .then(function() {
          return {
            order: 1,
            id: 'tasks',
            icon: 'fa-flag',
            name: 'Tasks'
          };
        })
        .catch(function() {});
    };

    var getReportsTour = function() {
      return Auth('can_view_reports_tab')
        .then(function() {
          return {
            order: 2,
            id: 'reports',
            icon: 'fa-list-alt',
            name: 'Reports'
          };
        })
        .catch(function() {});
    };

    var getContactsTour = function() {
      return Auth('can_view_contacts_tab')
        .then(function() {
          return {
            order: 3,
            id: 'contacts',
            icon: 'fa-user',
            name: 'People'
          };
        })
        .catch(function() {});
    };

    var getAnalyticsTour = function() {
      return $q.all([
        AnalyticsModules(),
        Auth('can_view_analytics')
      ])
        .then(function(results) {
          if (results.length) {
            return {
              order: 4,
              id: 'analytics',
              icon: 'fa-bar-chart-o',
              name: 'Analytics'
            };
          }
        })
        .catch(function() {});
    };

    var getTours = function() {
      return $q.all([
        getMessagesTour(),
        getTasksTour(),
        getReportsTour(),
        getContactsTour(),
        getAnalyticsTour()
      ])
        .then(function(results) {
          return _.compact(results);
        });
    };

    return {
      getTours: getTours,
      endCurrent: endCurrent,
      start: function(name) {
        endCurrent();
        if (!name) {
          return;
        }
        var tour = getTour(name);
        var route = tour && tour.route;
        $timeout(function() {
          if ($state.is(route)) {
            // already on required page - show tour
            $translate.onReady().then(function() {
              createTour(name);
            });
          } else {
            // navigate to the correct page
            $state.go(route, { tour: name });
          }
        });
      }
    };
  }
);
