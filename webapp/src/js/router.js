'use strict';

(function () {

  module.exports = function($stateProvider) {

    $stateProvider

      // errors
      .state('error', {
        url: '/error/:code',
        controller: 'ErrorCtrl',
        templateUrl: 'templates/partials/error.html'
      })

      // home
      .state('home', {
        url: '/home',
        controller: 'HomeCtrl'
      })

      // messages
      .state('messages', {
        url: '/messages?tour',
        controller: 'MessagesCtrl',
        templateUrl: 'templates/partials/messages.html'
      })
      .state('messages.detail', {
        url: '/{type}:{id}',
        views: {
          content: {
            controller: 'MessagesContentCtrl',
            templateUrl: 'templates/partials/messages_content.html'
          }
        }
      })

      // reports
      .state('reports', {
        url: '/reports?tour&query',
        controller: 'ReportsCtrl',
        templateUrl: 'templates/partials/reports.html'
      })
      .state('reports.add', {
        url: '/add/:formId',
        views: {
          content: {
            controller: 'ReportsAddCtrl',
            templateUrl: 'templates/partials/reports_add.html'
          }
        }
      })
      .state('reports.edit', {
        url: '/edit/:reportId',
        views: {
          content: {
            controller: 'ReportsAddCtrl',
            templateUrl: 'templates/partials/reports_add.html'
          }
        }
      })
      .state('reports.detail', {
        url: '/:id',
        views: {
          content: {
            controller: 'ReportsContentCtrl',
            templateUrl: 'templates/partials/reports_content.html'
          }
        }
      })

      // analytics
      .state('analytics', {
        url: '/analytics?tour',
        controller: 'AnalyticsCtrl',
        templateUrl: 'templates/partials/analytics.html'
      })
      .state('analytics.reporting', {
        url: '/reporting',
        views: {
          content: {
            controller: 'AnalyticsReportingCtrl',
            templateUrl: 'templates/partials/analytics/reporting.html'
          }
        }
      })
      .state('analytics.reporting.detail', {
        url: '/:form/:place',
        views: {
          detail: {
            controller: 'AnalyticsReportingDetailCtrl',
            templateUrl: 'templates/partials/analytics/reporting_detail.html'
          }
        }
      })
      .state('analytics.targets', {
        url: '/targets',
        views: {
          content: {
            controller: 'AnalyticsTargetsCtrl',
            templateUrl: 'templates/partials/analytics/targets.html'
          }
        }
      })

      // contacts
      .state('contacts', {
        url: '/contacts?tour',
        controller: 'ContactsCtrl',
        templateUrl: 'templates/partials/contacts.html'
      })
      .state('contacts.add', {
        url: '/add',
        views: {
          content: {
            controller: 'ContactsEditCtrl',
            templateUrl: 'templates/partials/contacts_edit.html'
          }
        }
      })
      .state('contacts.report', {
        url: '/:id/report/:formId',
        views: {
          content: {
            controller: 'ContactsReportCtrl',
            templateUrl: 'templates/partials/contacts_report.html'
          }
        }
      })
      .state('contacts.deceased', {
        url: '/:id/deceased',
        views: {
          content: {
            controller: 'ContactsDeceasedCtrl',
            templateUrl: 'templates/partials/contacts_deceased.html'
          }
        }
      })
      .state('contacts.detail', {
        url: '/:id',
        views: {
          content: {
            controller: 'ContactsContentCtrl',
            templateUrl: 'templates/partials/contacts_content.html'
          }
        }
      })
      .state('contacts.addChild', {
        url: '/:parent_id/add/:type?from',
        views: {
          content: {
            controller: 'ContactsEditCtrl',
            templateUrl: 'templates/partials/contacts_edit.html'
          }
        }
      })
      .state('contacts.edit', {
        url: '/:id/edit',
        views: {
          content: {
            controller: 'ContactsEditCtrl',
            templateUrl: 'templates/partials/contacts_edit.html'
          }
        }
      })

      // tasks
      .state('tasks', {
        url: '/tasks?tour',
        controller: 'TasksCtrl',
        templateUrl: 'templates/partials/tasks.html'
      })
      .state('tasks.detail', {
        url: '/:id',
        views: {
          content: {
            controller: 'TasksContentCtrl',
            templateUrl: 'templates/partials/tasks_content.html'
          }
        }
      })

      .state('userSettings', {
        url: '/user',
        controller: 'ConfigurationUserCtrl',
        templateUrl: 'templates/partials/configuration_user.html'
      })

      // about page
      .state('about', {
        url: '/about',
        controller: 'AboutCtrl',
        templateUrl: 'templates/partials/about.html'
      })

      // theme design testing page
      .state('theme', {
        url: '/theme',
        controller: 'ThemeCtrl',
        templateUrl: 'templates/partials/theme.html'
      });
  };
}());
