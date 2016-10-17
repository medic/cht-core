angular.module('inboxServices').factory('ResourceIcons',
  function(
    $log,
    Changes,
    DB
  ) {

    'use strict';
    'ngInject';

    var cache = {
      doc: undefined,
      src: {}
    };

    var getIcon = function(name) {
      return cache.doc &&
             cache.doc.resources[name] &&
             cache.doc._attachments[cache.doc.resources[name]];
    };

    var getSrc = function(name) {
      if (!cache.src[name]) {
        var icon = getIcon(name);
        if (!icon) {
          return;
        }
        cache.src[name] = 'data:' + icon.content_type + ';base64,' + icon.data;
      }
      return cache.src[name];
    };

    var updateDom = function(elem) {
      elem = elem || $(document.body);
      elem.find('.resource-icon').each(function() {
        var elem = $(this);
        var src = getSrc(elem.attr('title'));
        if (src) {
          elem.attr('src', src);
        } else {
          elem.removeAttr('src');
        }
      });
    };

    var updateResources = function() {
      return DB()
        .get('resources', { attachments: true })
        .then(function(res) {
          cache = {
            doc: res,
            src: {}
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
          return;
        }
        return getSrc(name);
      },
      replacePlaceholders: function(elem) {
        init.then(function() {
          updateDom(elem);
        });
      }
    };

  }
);
