'use strict';

(function () {

  module.exports = function($stateProvider) {

    $stateProvider

      // errors
      .state('error', {
        url: '/error/:code',
        controller: 'ErrorCtrl',
        controllerAs: 'errorCtrl',
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
        controllerAs: 'messagesCtrl',
        templateUrl: 'templates/partials/messages.html'
      })
      .state('messages.detail', {
        url: '/{type}:{id}',
        params: {
          type: null,
          id: null
        },
        views: {
          content: {
            controller: 'MessagesContentCtrl',
            controllerAs: 'messagesContentCtrl',
            templateUrl: 'templates/partials/messages_content.html'
          }
        }
      })

      // reports
      .state('reports', {
        url: '/reports?tour&query',
        controller: 'ReportsCtrl',
        controllerAs: 'reportsCtrl',
        templateUrl: 'templates/partials/reports.html'
      })
      .state('reports.add', {
        url: '/add/:formId',
        params: {
          formId: null
        },
        views: {
          content: {
            controller: 'ReportsAddCtrl',
            controllerAs: 'reportsAddCtrl',
            templateUrl: 'templates/partials/reports_add.html'
          }
        }
      })
      .state('reports.edit', {
        url: '/edit/:reportId',
        params: {
          reportId: null
        },
        views: {
          content: {
            controller: 'ReportsAddCtrl',
            controllerAs: 'reportsAddCtrl',
            templateUrl: 'templates/partials/reports_add.html'
          }
        }
      })
      .state('reports.detail', {
        url: '/:id',
        params: {
          id: null
        },
        views: {
          content: {
            controller: 'ReportsContentCtrl',
            controllerAs: 'reportsContentCtrl',
            templateUrl: 'templates/partials/reports_content.html'
          }
        }
      })

      // analytics
      .state('analytics', {
        url: '/analytics?tour',
        controller: 'AnalyticsCtrl',
        controllerAs: 'analyticsCtrl',
        templateUrl: 'templates/partials/analytics.html'
      })
      .state('analytics.reporting', {
        url: '/reporting',
        views: {
          content: {
            controller: 'AnalyticsReportingCtrl',
            controllerAs: 'analyticsReportingCtrl',
            templateUrl: 'templates/partials/analytics/reporting.html'
          }
        }
      })
      .state('analytics.reporting.detail', {
        url: '/:form/:place',
        params: {
          form: null,
          place: null
        },
        views: {
          detail: {
            controller: 'AnalyticsReportingDetailCtrl',
            controllerAs: 'analyticsReportingDetailCtrl',
            templateUrl: 'templates/partials/analytics/reporting_detail.html'
          }
        }
      })
      .state('analytics.targets', {
        url: '/targets',
        views: {
          content: {
            controller: 'AnalyticsTargetsCtrl',
            controllerAs: 'analyticsTargetsCtrl',
            templateUrl: 'templates/partials/analytics/targets.html'
          }
        }
      })
      .state('analytics.target-aggregates', {
        url: '/target-aggregates',
        views: {
          content: {
            controller: 'AnalyticsTargetAggregatesCtrl',
            controllerAs: 'analyticsTargetAggregatesCtrl',
            templateUrl: 'templates/partials/analytics/target_aggregates.html'
          }
        }
      })
      .state('analytics.target-aggregates.detail', {
        url: '/:id',
        params: {
          id: null
        },
        views: {
          detail: {
            controller: 'AnalyticsTargetAggregatesDetailCtrl',
            controllerAs: 'analyticsTargetAggregatesDetailCtrl',
            templateUrl: 'templates/partials/analytics/target_aggregates_detail.html'
          }
        }
      })

      // contacts
      .state('contacts', {
        url: '/contacts?tour',
        controller: 'ContactsCtrl',
        controllerAs: 'contactsCtrl',
        templateUrl: 'templates/partials/contacts.html'
      })
      .state('contacts.add', {
        url: '/add',
        views: {
          content: {
            controller: 'ContactsEditCtrl',
            controllerAs: 'contactsEditCtrl',
            templateUrl: 'templates/partials/contacts_edit.html'
          }
        }
      })
      .state('contacts.report', {
        url: '/:id/report/:formId',
        params: {
          id: null,
          formId: null
        },
        views: {
          content: {
            controller: 'ContactsReportCtrl',
            controllerAs: 'contactsReportCtrl',
            templateUrl: 'templates/partials/contacts_report.html'
          }
        }
      })
      .state('contacts.deceased', {
        url: '/:id/deceased',
        params: {
          id: null
        },
        views: {
          content: {
            controller: 'ContactsDeceasedCtrl',
            controllerAs: 'contactsDeceasedCtrl',
            templateUrl: 'templates/partials/contacts_deceased.html'
          }
        }
      })
      .state('contacts.detail', {
        url: '/:id',
        params: {
          id: null
        },
        views: {
          content: {
            controller: 'ContactsContentCtrl',
            controllerAs: 'contactsContentCtrl',
            templateUrl: 'templates/partials/contacts_content.html'
          }
        }
      })
      .state('contacts.addChild', {
        url: '/:parent_id/add/:type?from',
        params: {
          parent_id: null,
          type: null
        },
        views: {
          content: {
            controller: 'ContactsEditCtrl',
            controllerAs: 'contactsEditCtrl',
            templateUrl: 'templates/partials/contacts_edit.html'
          }
        }
      })
      .state('contacts.edit', {
        url: '/:id/edit',
        params: {
          id: null
        },
        views: {
          content: {
            controller: 'ContactsEditCtrl',
            controllerAs: 'contactsEditCtrl',
            templateUrl: 'templates/partials/contacts_edit.html'
          }
        }
      })

      // tasks
      .state('tasks', {
        url: '/tasks?tour',
        controller: 'TasksCtrl',
        controllerAs: 'tasksCtrl',
        templateUrl: 'templates/partials/tasks.html'
      })
      .state('tasks.detail', {
        url: '/:id',
        params: {
          id: null
        },
        views: {
          content: {
            controller: 'TasksContentCtrl',
            controllerAs: 'tasksContentCtrl',
            templateUrl: 'templates/partials/tasks_content.html'
          }
        }
      })

      .state('userSettings', {
        url: '/user',
        controller: 'ConfigurationUserCtrl',
        controllerAs: 'configurationUserCtrl',
        templateUrl: 'templates/partials/configuration_user.html'
      })

      .state('privacyPolicy', {
        url: '/privacy-policy',
        controller: 'PrivacyPolicyCtrl',
        controllerAs: 'privacyPolicyCtrl',
        templateUrl: 'templates/partials/privacy_policy.html'
      })

      // about page
      .state('about', {
        url: '/about',
        controller: 'AboutCtrl',
        controllerAs: 'aboutCtrl',
        templateUrl: 'templates/partials/about.html'
      })

      // theme design testing page
      .state('theme', {
        url: '/theme',
        controller: 'ThemeCtrl',
        templateUrl: 'templates/partials/theme.html'
      })

      // various functionality for testing purposes only
      .state('testing', {
        url: '/testing',
        controller: 'TestingCtrl',
        controllerAs: 'testingCtrl',
        templateUrl: 'templates/partials/testing.html'
      });
  };
}());
