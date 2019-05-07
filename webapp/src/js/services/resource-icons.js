angular.module('inboxServices').factory('ResourceIcons',
  function(
    $log,
    Changes,
    DB
  ) {

    'use strict';
    'ngInject';

    const CSS_CLASS = ['resource-icon', 'header-logo', 'partner-image'];
    const DOC_IDS = ['resources', 'branding', 'partners'];

    const cache = {
      resources: {
        doc: null,
        htmlContent: null
      },
      branding: {
        doc: null,
        htmlContent: null
      },
      partners: {
        doc: null,
        htmlContent: null
      }
    };

    const getAttachment = (name, i) => {
      return cache[i].doc &&
             cache[i].doc.resources[name] &&
             cache[i].doc._attachments[cache[i].doc.resources[name]];
    };

    const getHtmlContent = (name, i) => {
      try {
        if (!cache[i].htmlContent[name]) {
          const icon = getAttachment(name, i);
          if (!icon) {
            return '';
          }
          let content;
          if (icon.content_type === 'image/svg+xml' && i === 'resources') {
            // SVG: include the raw data in the page so it can be styled
            content = atob(icon.data);
          } else {
            // OTHER: base64 encode the img src
            content = `<img src="data:${icon.content_type};base64,${icon.data}" />`;
          }
          cache[i].htmlContent[name] = content;
        }
        return cache[i].htmlContent[name];
      } catch(e) {
        return '&nbsp';
      }
    };

    const getHtml = (name, docId) => {
      const image = getHtmlContent(name, docId);
      // Handle title attribute for branding doc specially
      // https://github.com/medic/medic/issues/5531
      const className = CSS_CLASS[DOC_IDS.indexOf(docId)];
      const titleAttribute = docId === DOC_IDS[1] ? 'data-title' : 'title';
      return `<span class="${className}" ${titleAttribute}="${name}">${image}</span>`;
    };

    const updateDom = ($elem, doc) => {
      $elem = $elem || $(document.body);
      const css = CSS_CLASS[DOC_IDS.indexOf(doc)];
      $elem.find(`.${css}`).each((i, child) => {
        const $this = $(child);
        const name = $this.attr('data-title') || $this.attr('title');
        $this.html(getHtmlContent(name, doc));
      });
    };

    const updateResources = docId => {
      return DB()
        .get(docId, { attachments: true })
        .then(res => {
          cache[docId].doc = res;
          cache[docId].htmlContent = {};
          updateDom($(document.body), docId);
        })
        .catch(err => {
          if (err.status !== 404) {
            $log.error('Error updating icons', err);
          }
        });
    };
    
    DOC_IDS.slice(1).forEach(doc => updateResources(doc));

    var initResources = updateResources(DOC_IDS[0]);

    Changes({
      key: 'resource-icons',
      filter: change => DOC_IDS.includes(change.id),
      callback: change => updateResources(change.id)
    });

    return {
      getImg: (name, docId) => {
        if (!name || !docId) {
          return '';
        }
        return getHtml(name, docId);
      },
      getDocResources: doc => {
        return DB().get(doc).then(res => Object.keys(res.resources));
      },
      getAppTitle: () => DB().get(DOC_IDS[1]).then(doc => doc.title),
      replacePlaceholders: $elem => {
        initResources.then(function() {
          updateDom($elem, DOC_IDS[0]);
        });
      }
    };

  }
);
