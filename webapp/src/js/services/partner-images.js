const _ = require('underscore');

angular.module('inboxServices').factory('PartnerImages',
  function(
    $log,
    Changes,
    DB
  ) {

    'use strict';
    'ngInject';

    const PARTNER_ID = 'partners';

    const cache = {
      doc: null,
      htmlContent: {}
    };

    const getAttachment = name => {
      return cache.doc &&
             cache.doc.resources[name] &&
             cache.doc._attachments[cache.doc.resources[name]];
    };

    const getHtmlContent = name => {
      if (!cache.htmlContent[name]) {
        const image = getAttachment(name);
        if (!image) {
          return '';
        }
        var content;
        if (image.content_type === 'image/svg+xml') {
          // SVG: include the raw data in the page so it can be styled
          content = atob(image.data);
        } else {
          // OTHER: base64 encode the img src
          content = `<img src="data:${image.content_type};base64,${image.data}" height="129" width="129" />`;
        }
        cache.htmlContent[name] = content;
      }
      return cache.htmlContent[name];
    };

    const getHtml = name => {
      const image = getHtmlContent(name);
      return `<span class="partner-image" title="${name}">${image}</span>`;
    };

    const updateDom = $elem => {
      $elem = $elem || $(document.body);
      $elem.find('.partner-image').each(function() {
        const $this = $(this);
        $this.html(getHtmlContent($this.attr('title')));
      });
    };

    const updateResources = () => {
      return DB()
        .get(PARTNER_ID, { attachments: true })
        .then(res => {
          cache.doc = res;
          cache.htmlContent = {};
          updateDom();
        })
        .catch(err => {
          if (err.status !== 404) {
            $log.error('Error updating partners doc', err);
          }
        });
    };

    const getResources = () => {
      return DB().get(PARTNER_ID, { attachments: true})
        .then(doc => {
          const images = _.map(_.pairs(doc.resources), pair => {
            const image = doc._attachments[pair[1]];
            return {
              name: pair[0],
              data: image.data,
              type: image.content_type
            };
          });
          return images;
        })
        .catch(err => {
          $log.err('Error', err);
          return null;
        });
    };

    Changes({
      key: 'partner-images',
      filter: function(change) {
        return change.id === PARTNER_ID;
      },
      callback: updateResources
    });

    const init = updateResources();

    return {
      getImg: name => {
        if (!name) {
          return '';
        }
        return getHtml(name);
      },
      getImages: () => {
        return getResources();
      },
      replacePlaceholders: function($elem) {
        init.then(function() {
          updateDom($elem);
        });
      }
    };

  }
);
