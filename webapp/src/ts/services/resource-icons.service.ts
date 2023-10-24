import { Injectable } from '@angular/core';

import {ChangesService} from '@mm-services/changes.service';
import {DbService} from '@mm-services/db.service';

@Injectable({
  providedIn: 'root'
})
export class ResourceIconsService {
  private readonly CSS_CLASS = ['resource-icon', 'header-logo', 'partner-image'];
  private readonly DOC_IDS = ['resources', 'branding', 'partners'];

  private initResources;

  private readonly cache = {
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

  constructor(
    private changes: ChangesService,
    private db: DbService,
  ) {
    this.DOC_IDS.slice(1).forEach(doc => this.updateResources(doc));
    this.initResources = this.updateResources(this.DOC_IDS[0]);

    this.changes.subscribe({
      key: 'resource-icons',
      filter: change => this.DOC_IDS.includes(change.id),
      callback: change => this.updateResources(change.id),
    });
  }

  private getAttachment (name, i) {
    return this.cache[i].doc &&
      this.cache[i].doc.resources[name] &&
      this.cache[i].doc._attachments[this.cache[i].doc.resources[name]];
  }

  private getHtmlContent(name, i, faPlaceholder) {
    try {
      if (!this.cache[i].htmlContent[name]) {
        const icon = this.getAttachment(name, i);
        if (!icon) {
          return faPlaceholder ? `<span class="fa ${faPlaceholder}"/>` : '';
        }
        let content;
        if (icon.content_type === 'image/svg+xml' && i === 'resources') {
          // SVG: include the raw data in the page so it can be styled
          content = atob(icon.data);
        } else {
          // OTHER: base64 encode the img src
          content = `<img src="data:${icon.content_type};base64,${icon.data}" />`;
        }
        this.cache[i].htmlContent[name] = content;
      }
      return this.cache[i].htmlContent[name];
    } catch (e) {
      return '&nbsp';
    }
  }

  private getHtml (name, docId, faPlaceholder) {
    const image = this.getHtmlContent(name, docId, faPlaceholder);
    // Handle title attribute for branding doc specially
    // https://github.com/medic/medic/issues/5531
    const className = this.CSS_CLASS[this.DOC_IDS.indexOf(docId)];
    const titleAttribute = `${docId === this.DOC_IDS[1] ? 'data-title' : 'title'}="${name}"`;
    const faPlaceholderAttribute = faPlaceholder ? `data-fa-placeholder="${faPlaceholder}"` : '';
    return `<span class="${className}" ${titleAttribute} ${faPlaceholderAttribute}>${image}</span>`;
  }

  private updateDom ($elem, doc) {
    $elem = $elem || $(document.body);
    const css = this.CSS_CLASS[this.DOC_IDS.indexOf(doc)];
    $elem.find(`.${css}`).each((i, child) => {
      const $this = $(child);
      const name = $this.data('title') || $this.attr('title');
      const faPlaceholder = $this.data('faPlaceholder');
      $this.html(this.getHtmlContent(name, doc, faPlaceholder));
    });
  }

  private updateResources(docId) {
    return this.db.get()
      .get(docId, { attachments: true })
      .then(res => {
        this.cache[docId].doc = res;
        this.cache[docId].htmlContent = {};
        this.updateDom($(document.body), docId);
      })
      .catch(err => {
        if (err.status !== 404) {
          console.error('Error updating icons', err);
        }
      });
  }

  getImg(name?, docId?, faPlaceholder?) {
    if (!name || !docId) {
      return '';
    }
    return this.getHtml(name, docId, faPlaceholder);
  }

  getDocResources(doc) {
    return this.db.get().get(doc).then(res => Object.keys(res.resources));
  }

  getAppTitle() {
    return this.db.get().get(this.DOC_IDS[1]).then(doc => doc.title);
  }

  replacePlaceholders($elem) {
    return this.initResources.then(() => {
      this.updateDom($elem, this.DOC_IDS[0]);
    });
  }
}
