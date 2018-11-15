angular.module('inboxServices').factory('LogoImages',
  function(
    $log,
    Changes,
    DB
  ) {

    'use strict';
    'ngInject';

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
        var content = '<img class="logo-full" title="Medic Mobile | {{version}}"  src="data:' + image.content_type + ';base64,' + image.data + '" />';
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

    var updateResources = function() {
      return DB()
        .get('logo', { attachments: true })
        .then(function(res) {
          cache = {
            doc: res,
            htmlContent: {}
          };
          updateDom();
        })
        .catch(function(err) {
          if (err.status !== 404) {
            $log.error('Error updating icons', err);
          }
        });
    };

    Changes({
      key: 'LogoImages',
      filter: function(change) {
        return change.id === 'logo';
      },
      callback: updateResources
    });

    var init = updateResources();

    return {
      getImg: function(name) {
        if (!name) {
          return '';
        }
        return getHtml(name);
      },
      replacePlaceholders: function($elem) {
        init.then(function() {
          updateDom($elem);
        });
      }
    };

  }
);
