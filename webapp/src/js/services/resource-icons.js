angular.module('inboxServices').factory('ResourceIcons',
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
        var icon = getAttachment(name);
        if (!icon) {
          return '';
        }
        var content;
        if (icon.content_type === 'image/svg+xml') {
          // SVG: include the raw data in the page so it can be styled
          content = atob(icon.data);
        } else {
          // OTHER: base64 encode the img src
          content = '<img src="data:' + icon.content_type + ';base64,' + icon.data + '" />';
        }
        cache.htmlContent[name] = content;
      }
      return cache.htmlContent[name];
    };

    var getHtml = function(name) {
      var image = getHtmlContent(name);
      return '<span class="resource-icon" title="' + name + '">' + image + '</span>';
    };

    var updateDom = function($elem) {
      $elem = $elem || $(document.body);
      $elem.find('.resource-icon').each(function() {
        var $this = $(this);
        $this.html(getHtmlContent($this.attr('title')));
      });
    };

    var updateResources = function() {
      return DB()
        .get('resources', { attachments: true })
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
      key: 'ResourceIcons',
      filter: function(change) {
        return change.id === 'resources';
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
