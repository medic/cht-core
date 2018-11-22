angular.module('inboxServices').factory('BrandingImages',
  function(
    $log,
    Changes,
    DB
  ) {

    'use strict';
    'ngInject';

    const BRANDING_ID = 'branding';

    var cache = {
      doc: null,
      htmlContent: {}
    };

    var getAttachment = function(name) {
      return cache.doc &&
             cache.doc.resources[name] &&
             cache.doc._attachments[cache.doc.resources[name]];
    };

    var getHtmlContent = function(name) {
      if (!cache.htmlContent[name]) {
        var image = getAttachment(name);
        if (!image) {
          return '';
        }
        var content = '<img src="data:' + image.content_type + ';base64,' + image.data + '" />';
        cache.htmlContent[name] = content;
      }
      return cache.htmlContent[name];
    };

    var getHtml = function(name) {
      var image = getHtmlContent(name);
      return '<span class="header-logo" title="' + name + '">' + image + '</span>';
    };

    var updateDom = function($elem) {
      $elem = $elem || $(document.body);
      $elem.find('.header-logo').each(function() {
        var $this = $(this);
        $this.html(getHtmlContent($this.attr('title')));
      });
    };

    var updateTitle = (doc) => {
      document.title = doc.title;
    };

    var updateResources = function() {
      return DB()
        .get(BRANDING_ID, { attachments: true })
        .then(function(res) {
          cache = {
            doc: res,
            htmlContent: {}
          };
          updateDom();
          updateTitle(res);
        })
        .catch(function(err) {
          if (err.status !== 404) {
            $log.error('Error updating icons', err);
          }
        });
    };

    Changes({
      key: 'branding-images',
      callback: updateResources,
      filter: change => change.id === BRANDING_ID
    });

    var init = updateResources();

    return {
      getLogo: function(name) {
        if (!name) {
          return '';
        }
        return getHtml(name);
      },
      getAppTitle: function() {
        return new Promise((resolve, reject) => {
          DB().get(BRANDING_ID).then(doc => {
            resolve(doc.title);
          }).catch(err => {
            reject(err);
          });
        });
      },
      replacePlaceholders: function($elem) {
        init.then(function() {
          updateDom($elem);
        });
      }
    };

  }
);
