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
        url: '/:id',
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
      .state('analytics.anc', {
        url: '/anc',
        views: {
          content: {
            controller: 'AnalyticsAncCtrl',
            templateUrl: 'templates/partials/analytics/anc.html'
          }
        }
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
        url: '/:parent_id/add/:type',
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

      // configuration
      .state('configuration', {
        url: '/configuration',
        controller: 'ConfigurationCtrl',
        templateUrl: 'templates/partials/configuration.html'
      })
      .state('configuration.settings', {
        url: '/settings',
        views: {
          content: {
            templateUrl: 'templates/partials/configuration_settings.html'
          }
        }
      })
      .state('configuration.settings.basic', {
        url: '/basic',
        views: {
          tab: {
            controller: 'ConfigurationSettingsBasicCtrl',
            templateUrl: 'templates/partials/configuration_settings_basic.html'
          }
        }
      })
      .state('configuration.settings.advanced', {
        url: '/advanced',
        views: {
          tab: {
            controller: 'ConfigurationSettingsAdvancedCtrl',
            templateUrl: 'templates/partials/configuration_settings_advanced.html'
          }
        }
      })
      .state('configuration.targets', {
        url: '/targets',
        views: {
          content: {
            controller: 'ConfigurationTargetsCtrl',
            templateUrl: 'templates/partials/configuration_targets.html'
          }
        }
      })
      .state('configuration.targets-edit', {
        url: '/targets/edit/:id',
        views: {
          content: {
            controller: 'ConfigurationTargetsEditCtrl',
            templateUrl: 'templates/partials/configuration_targets_edit.html'
          }
        }
      })
      .state('configuration.translation', {
        url: '/translation',
        views: {
          content: {
            templateUrl: 'templates/partials/configuration_translation.html'
          }
        }
      })
      .state('configuration.translation.languages', {
        url: '/languages',
        views: {
          tab: {
            controller: 'ConfigurationTranslationLanguagesCtrl',
            templateUrl: 'templates/partials/configuration_translation_languages.html'
          }
        }
      })
      .state('configuration.translation.application', {
        url: '/application',
        views: {
          tab: {
            controller: 'ConfigurationTranslationApplicationCtrl',
            templateUrl: 'templates/partials/configuration_translation_application.html'
          }
        }
      })
      .state('configuration.translation.messages', {
        url: '/messages',
        views: {
          tab: {
            controller: 'ConfigurationTranslationMessagesCtrl',
            templateUrl: 'templates/partials/configuration_translation_messages.html'
          }
        }
      })
      .state('configuration.forms', {
        url: '/forms',
        views: {
          content: {
            templateUrl: 'templates/partials/configuration_forms.html'
          }
        }
      })
      .state('configuration.forms.json', {
        url: '/json',
        views: {
          tab: {
            controller: 'ConfigurationFormsJsonCtrl',
            templateUrl: 'templates/partials/configuration_forms_json.html'
          }
        }
      })
      .state('configuration.forms.xml', {
        url: '/xml',
        views: {
          tab: {
            controller: 'ConfigurationFormsXmlCtrl',
            templateUrl: 'templates/partials/configuration_forms_xml.html'
          }
        }
      })
      .state('configuration.upgrade', {
        url: '/upgrade',
        views: {
          content: {
            controller: 'ConfigurationUpgradeCtrl',
            templateUrl: 'templates/partials/configuration_upgrade.html'
          }
        }
      })
      .state('configuration.user', {
        url: '/user',
        views: {
          content: {
            controller: 'ConfigurationUserCtrl',
            templateUrl: 'templates/partials/configuration_user.html'
          }
        }
      })
      .state('configuration.users', {
        url: '/users',
        views: {
          content: {
            controller: 'ConfigurationUsersCtrl',
            templateUrl: 'templates/partials/configuration_users.html'
          }
        }
      })
      .state('configuration.contacts', {
        url: '/contacts',
        views: {
          content: {
            controller: 'ConfigurationContactsCtrl',
            templateUrl: 'templates/partials/configuration_contacts.html'
          }
        }
      })
      .state('configuration.export', {
        url: '/export',
        views: {
          content: {
            templateUrl: 'templates/partials/configuration_export.html'
          }
        }
      })
      .state('configuration.export.messages', {
        url: '/messages',
        views: {
          tab: {
            controller: 'ConfigurationExportMessagesCtrl',
            templateUrl: 'templates/partials/configuration_export_messages.html'
          }
        }
      })
      .state('configuration.export.reports', {
        url: '/reports',
        views: {
          tab: {
            controller: 'ConfigurationExportReportsCtrl',
            templateUrl: 'templates/partials/configuration_export_reports.html'
          }
        }
      })
      .state('configuration.export.contacts', {
        url: '/contacts',
        views: {
          tab: {
            controller: 'ConfigurationExportContactsCtrl',
            templateUrl: 'templates/partials/configuration_export_contacts.html'
          }
        }
      })
      .state('configuration.export.feedback', {
        url: '/feedback',
        views: {
          tab: {
            controller: 'ConfigurationExportFeedbackCtrl',
            templateUrl: 'templates/partials/configuration_export_feedback.html'
          }
        }
      })
      .state('configuration.export.serverlogs', {
        url: '/server-logs',
        views: {
          tab: {
            controller: 'ConfigurationExportServerLogsCtrl',
            templateUrl: 'templates/partials/configuration_export_server_logs.html'
          }
        }
      })
      .state('configuration.export.auditlogs', {
        url: '/audit-logs',
        views: {
          tab: {
            controller: 'ConfigurationExportAuditLogsCtrl',
            templateUrl: 'templates/partials/configuration_export_audit_logs.html'
          }
        }
      })
      .state('configuration.icons', {
        url: '/icons',
        views: {
          content: {
            controller: 'ConfigurationIconsCtrl',
            templateUrl: 'templates/partials/configuration_icons.html'
          }
        }
      })
      .state('configuration.permissions', {
        url: '/permissions',
        views: {
          content: {
            controller: 'ConfigurationPermissionsCtrl',
            templateUrl: 'templates/partials/configuration_permissions.html'
          }
        }
      })

      // about page
      .state('about', {
        url: '/about',
        controller: 'AboutCtrl',
        templateUrl: 'templates/partials/about.html'
      })

      .state('help', {
        url: '/help/{page}',
        controller: 'HelpCtrl',
        templateUrl: 'templates/partials/help.html'
      })

      // theme design testing page
      .state('theme', {
        url: '/theme',
        controller: 'ThemeCtrl',
        templateUrl: 'templates/partials/theme.html'
      });
  };
}());
