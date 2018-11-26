angular.module('inboxServices').factory('BrandingImages',
  function(
    $log,
    Changes,
    DB
  ) {

    'use strict';
    'ngInject';

    const BRANDING_ID = 'branding';

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
        const content = `<img src="data:${image.content_type};base64,${image.data}" />`;
        cache.htmlContent[name] = content;
      }
      return cache.htmlContent[name];
    };

    const getHtml = name => {
      const image = getHtmlContent(name);
      return `<span class="header-logo" title="${name}">${image}</span>`;
    };

    const updateDom = $elem => {
      $elem = $elem || $(document.body);
      $elem.find('.header-logo').each((i, child) => {
        const $this = $(child);
        $this.html(getHtmlContent($this.attr('title')));
      });
      if(document.getElementById('app')) {
        document.getElementById('app').innerHTML = cache.doc.title;
      }
    };

    const updateResources = () => {
      return DB()
        .get(BRANDING_ID, { attachments: true })
        .then(res => {
          cache.doc = res;
          cache.htmlContent = {};
          updateDom();
        })
        .catch(err => {
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

    const init = updateResources();

    return {
      getLogo: name => {
        if (!name) {
          return '';
        }
        const html = getHtml(name);
        return html;
      },
      getAppTitle: () => DB().get(BRANDING_ID).then(doc => doc.title),
      replacePlaceholders: $elem => {
        init.then(() => {
          updateDom($elem);
        });
      }
    };

  }
);
