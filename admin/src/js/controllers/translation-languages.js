var _ = require('underscore');

angular.module('controllers').controller('TranslationLanguagesCtrl',
  function (
    $log,
    $q,
    $scope,
    Blob,
    DB,
    ExportProperties,
    Modal,
    Settings,
    UpdateSettings
  ) {

    'use strict';
    'ngInject';

    var createLocaleModel = function(settings, doc, totalTranslations) {
      var result = {
        doc: doc
      };

      var content = ExportProperties(settings, doc);
      if (content) {
        result.export = {
          name: doc._id + '.properties',
          url: Blob.text(content)
        };
      }

      result.missing = totalTranslations - Object.keys(doc.values).length;

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
        templateUrl: 'templates/edit_language.html',
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
        templateUrl: 'templates/import_translation.html',
        controller: 'ImportTranslationCtrl',
        model: doc
      });
    };

    $scope.deleteDoc = function(doc) {
      Modal({
        templateUrl: 'templates/delete_doc_confirm.html',
        controller: 'DeleteDocConfirm',
        model: { doc: doc }
      });
    };

    getLanguages();
  }
);
