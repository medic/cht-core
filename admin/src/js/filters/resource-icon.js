const constants = require('@medic/constants');
const DOC_IDS = constants.DOC_IDS;

angular.module('inboxFilters').filter('resourceIcon',
  function (
    $sce,
    ResourceIcons
  ) {
    'use strict';
    'ngInject';
    return (name, placeholder = '') => {
      return $sce.trustAsHtml(ResourceIcons.getImg(name, DOC_IDS.RESOURCES, placeholder));
    };
  });

angular.module('inboxFilters').filter('headerLogo',
  function(
    $sce,
    ResourceIcons
  ) {
    'use strict';
    'ngInject';
    return function(name) {
      return $sce.trustAsHtml(ResourceIcons.getImg(name, 'branding'));
    };
  });

angular.module('inboxFilters').filter('partnerImage',
  function(
    $sce,
    ResourceIcons
  ) {
    'use strict';
    'ngInject';
    return name => {
      return $sce.trustAsHtml(ResourceIcons.getImg(name, 'partners'));
    };
  });
