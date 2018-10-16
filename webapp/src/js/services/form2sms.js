angular
  .module('inboxServices')
  .service('Form2Sms', function(
    $log,
    $q,
    $translate,
    $window,
    AddAttachment,
    ContactSummary,
    DB,
    EnketoPrepopulationData,
    EnketoTranslation,
    ExtractLineage,
    FileReader,
    Language,
    LineageModelGenerator,
    Search,
    TranslateFrom,
    UserContact,
    XmlForm,
    XSLT,
    ZScore
  ) {
    'use strict';
    'ngInject';

    return function() {
      $log.error('Welcome to Form2Sms');
      return 'utternonsenseutternonsenseutternonsenseutternonsenseutternonsenseutternonsenseutternonsense';
    };
  });
