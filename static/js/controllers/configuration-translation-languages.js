var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationTranslationLanguagesCtrl',
    function (
      $log,
      $q,
      $scope,
      Changes,
      DB,
      ExportProperties,
      Modal,
      OutgoingMessagesConfiguration,
      Settings,
      UpdateSettings
    ) {

      'ngInject';

      var countMissingOutgoingMessages = function(settings, locale) {
        var messages = _.flatten(
          _.pluck(OutgoingMessagesConfiguration(settings), 'translations'),
          true
        );
        var missing =  _.filter(messages, function(message) {
          return !_.findWhere(message.translations, { locale: locale.code });
        });
        return missing.length;
      };

      var createLocaleModel = function(settings, doc, totalTranslations) {
        var result = {
          doc: doc
        };

        var content = ExportProperties(settings, doc);
        if (content) {
          var blob = new Blob([ content ], { type: 'text/plain' });
          result.export = {
            name: doc._id + '.properties',
            url: (window.URL || window.webkitURL).createObjectURL(blob)
          };
        }

        var missingTranslations = totalTranslations - Object.keys(doc.values).length;
        var missingMessages = countMissingOutgoingMessages(settings, doc);
        result.missing = missingTranslations + missingMessages;

        return result;
      };

      var setLanguageStatus = function(doc, enabled) {
        doc.enabled = enabled;
        DB().put(doc).catch(function(err) {
          $log.error('Error updating settings', err);
        });
      };

      var countTotalTranslations = function(rows) {
        var keys = rows.map(function(row) {
          return row.doc.values ? Object.keys(row.doc.values) : [];
        });
        keys = _.uniq(_.flatten(keys));
        return keys.length;
      };

      var getLanguages = function() {
        $scope.loading = true;
        $q.all([
          DB().query('medic-client/doc_by_type', {
            startkey: [ 'translations', false ],
            endkey: [ 'translations', true ],
            include_docs: true
          }),
          Settings()
        ])
          .then(function(results) {
            var docs = results[0].rows;
            var settings = results[1];
            var totalTranslations = countTotalTranslations(docs);
            $scope.loading = false;
            $scope.languagesModel = {
              totalTranslations: totalTranslations,
              default: {
                locale: settings.locale,
                outgoing: settings.locale_outgoing
              },
              locales: _.map(docs, function(row) {
                return createLocaleModel(settings, row.doc, totalTranslations);
              })
            };
          })
          .catch(function(err) {
            $scope.loading = false;
            $log.error('Error loading settings', err);
          });
      };

      $scope.editLanguage = function(doc) {
        Modal({
          templateUrl: 'templates/modals/edit_language.html',
          controller: 'EditLanguageCtrl',
          model: doc
        });
      };
      $scope.setLocale = function(locale) {
        UpdateSettings({ locale: locale.code })
          .then(function() {
            $scope.languagesModel.default.locale = locale.code;
          })
          .catch(function(err) {
            $log.error('Error updating settings', err);
          });
      };
      $scope.setLocaleOutgoing = function(locale) {
        UpdateSettings({ locale_outgoing: locale.code })
          .then(function() {
            $scope.languagesModel.default.outgoing = locale.code;
          })
          .catch(function(err) {
            $log.error('Error updating settings', err);
          });
      };
      $scope.disableLanguage = function(doc) {
        setLanguageStatus(doc, false);
      };
      $scope.enableLanguage = function(doc) {
        setLanguageStatus(doc, true);
      };
      $scope.prepareImport = function(doc) {
        Modal({
          templateUrl: 'templates/modals/import_translation.html',
          controller: 'ImportTranslationCtrl',
          model: doc
        });
      };

      $scope.$on('$destroy', function() {
        Changes({ key: 'configuration-translation-languages' });
      });

      Changes({
        key: 'configuration-translation-languages',
        filter: function(change) {
          return change.doc.type === 'translations';
        },
        callback: getLanguages
      });

      getLanguages();
    }
  );

}());