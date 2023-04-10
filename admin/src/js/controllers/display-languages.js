const _ = require('lodash/core');
_.uniq = require('lodash/uniq');

angular.module('controllers').controller('DisplayLanguagesCtrl',
  function (
    $log,
    $q,
    $scope,
    $timeout,
    $translate,
    Blob,
    Changes,
    DB,
    ExportProperties,
    Modal,
    Settings,
    TranslationLoader,
    UpdateSettings
  ) {

    'use strict';
    'ngInject';

    const hasEnabledLanguages = languages => {
      return languages && Array.isArray(languages) && languages.length > 0;
    };

    const isLocaleEnabled = (doc, languages) => hasEnabledLanguages(languages) ?
      languages.some(translation => translation.enabled !== false && translation.locale === doc.code) :
      doc.enabled;

    const createLocaleModel = function(doc, totalTranslations, languages) {
      const result = {
        doc: doc,
        enabled: isLocaleEnabled(doc, languages),
      };

      const content = ExportProperties(doc);
      if (content) {
        result.export = {
          name: doc._id + '.properties',
          // eslint-disable-next-line compat/compat
          url: Blob.text(content)
        };
      }
      result.missing = totalTranslations - getTranslationKeys(doc).length;

      return result;
    };

    const setLanguageStatus = function(doc, enabled) {
      Settings().then(settings => {
        if (hasEnabledLanguages(settings.languages)) {
          let language = settings.languages.find(language => language.locale === doc.code);
          if (!language) {
            language = { locale: doc.code };
            settings.languages.push(language);
          }
          language.enabled = enabled;

          return UpdateSettings({ languages: settings.languages })
            .catch(err => {
              $log.error('Error updating settings', err);
            });
        }

        doc.enabled = enabled;
        return DB().put(doc).catch(err => {
          $log.error('Error updating translation doc', err);
        });
      });
    };

    const getTranslationKeys = doc => {
      return Object.keys(Object.assign({}, doc.generic || {}, doc.custom || {}));
    };

    const countTotalTranslations = (rows) => {
      let keys = rows.map(row => getTranslationKeys(row.doc));
      keys = _.uniq(_.flattenDeep(keys));
      return keys.length;
    };

    const getLanguages = function() {
      $scope.loading = true;
      $q.all([
        DB().query('medic-client/doc_by_type', {
          startkey: [ 'translations', false ],
          endkey: [ 'translations', true ],
          include_docs: true
        }),
        Settings()
      ])
        .then(([translations, settings]) => {
          const totalTranslations = countTotalTranslations(translations.rows);
          $scope.loading = false;
          $scope.languagesModel = {
            totalTranslations: totalTranslations,
            default: {
              locale: settings.locale,
              outgoing: settings.locale_outgoing
            },
            locales: translations.rows.map(
              row => createLocaleModel(row.doc, totalTranslations, settings.languages)
            )
          };
        })
        .catch(function(err) {
          $scope.loading = false;
          $log.error('Error loading settings', err);
        });
    };

    const changeListener = Changes({
      key: 'update-languages',
      filter: change => TranslationLoader.test(change.id) || change.id === 'settings',
      callback: () => getLanguages()
    });

    $scope.$on('$destroy', changeListener.unsubscribe);

    $scope.editLanguage = function(doc) {
      Modal({
        templateUrl: 'templates/edit_language.html',
        controller: 'EditLanguageCtrl',
        model: doc
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

    $scope.submitLanguageSettings = function() {
      $scope.status = { loading: true };
      const settings = {
        locale: $scope.basicLanguagesModel.locale,
        locale_outgoing: $scope.basicLanguagesModel.locale_outgoing
      };
      UpdateSettings(settings)
        .then(function() {
          $scope.status = { success: true, msg: $translate.instant('Saved') };
          $timeout(function() {
            if ($scope.status) {
              $scope.status.success = false;
            }
          }, 3000);
        })
        .catch(function(err) {
          $log.error('Error updating language settings', err);
          $scope.status = { error: true, msg: $translate.instant('Error saving language settings') };
        });
    };

    Settings()
      .then(function(res) {
        $scope.basicLanguagesModel = {
          locale: res.locale,
          locale_outgoing: res.locale_outgoing
        };
      })
      .catch(function(err) {
        $log.error('Error loading language settings', err);
      });

  }
);
