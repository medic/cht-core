import { Injectable } from '@angular/core';

import {ChangesService} from '@mm-services/changes.service';
import {DbService} from '@mm-services/db.service';
import { DOC_IDS } from '@medic/constants';

@Injectable({
  providedIn: 'root'
})
export class CustomResourceService {
  private readonly CSS_CLASS = ['resource-icon', 'header-logo', 'partner-image'];
  private readonly RESOURCE_DOC_IDS = [DOC_IDS.RESOURCES, DOC_IDS.BRANDING, DOC_IDS.PARTNERS];

  private readonly initResources;

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
    private readonly changes: ChangesService,
    private readonly db: DbService,
  ) {
    this.RESOURCE_DOC_IDS.slice(1).forEach(doc => this.updateResources(doc));
    this.initResources = this.updateResources(this.RESOURCE_DOC_IDS[0]);

    this.changes.subscribe({
      key: 'resource-icons',
      filter: change => this.RESOURCE_DOC_IDS.includes(change.id),
      callback: change => this.updateResources(change.id),
    });
  }

  private getAttachment(name, docId) {
    const doc = this.cache[docId]?.doc;
    const resourcePath = doc?.resources?.[name];
    return resourcePath ? doc?._attachments?.[resourcePath] : null;
  }

  private formatIconContent(icon, docId) {
    if (icon.content_type === 'image/svg+xml' && docId === DOC_IDS.RESOURCES) {
      // SVG: include the raw data in the page so it can be styled
      return atob(icon.data);
    }
    // OTHER: base64 encode the img src
    return `<img src="data:${icon.content_type};base64,${icon.data}" />`;
  }

  private getFallbackContent(faPlaceholder) {
    return faPlaceholder ? `<span class="fa ${faPlaceholder}"/>` : '';
  }

  private buildAndCacheContent(name, docId, faPlaceholder) {
    const icon = this.getAttachment(name, docId);
    if (!icon) {
      return this.getFallbackContent(faPlaceholder);
    }
    this.cache[docId].htmlContent[name] = this.formatIconContent(icon, docId);
    return this.cache[docId].htmlContent[name];
  }

  private getHtmlContent(name, docId, faPlaceholder) {
    if (!this.cache[docId]?.htmlContent) {
      return '&nbsp';
    }

    if (this.cache[docId].htmlContent[name]) {
      return this.cache[docId].htmlContent[name];
    }
    
    return this.buildAndCacheContent(name, docId, faPlaceholder);
  }

  private getHtml (name, docId, faPlaceholder) {
    const image = this.getHtmlContent(name, docId, faPlaceholder);
    // Handle title attribute for branding doc specially
    // https://github.com/medic/medic/issues/5531
    const className = this.CSS_CLASS[this.RESOURCE_DOC_IDS.indexOf(docId)];
    const titleAttribute = `${docId === this.RESOURCE_DOC_IDS[1] ? 'data-title' : 'title'}="${name}"`;
    const faPlaceholderAttribute = faPlaceholder ? `data-fa-placeholder="${faPlaceholder}"` : '';
    return `<span class="${className}" ${titleAttribute} ${faPlaceholderAttribute}>${image}</span>`;
  }

  private updateDom ($elem, doc) {
    $elem = $elem || $(document.body);
    const css = this.CSS_CLASS[this.RESOURCE_DOC_IDS.indexOf(doc)];
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
    return this.db.get().get(doc).then(res => {
      return Object.keys(res?.resources ?? {});
    });
  }

  getAppTitle() {
    return this.db.get().get(this.RESOURCE_DOC_IDS[1]).then(doc => doc.title);
  }

  getResource(name: string): { content_type: string, data: string } | null {
    return this.getAttachment(name, DOC_IDS.RESOURCES);
  }

  replacePlaceholders($elem) {
    return this.initResources.then(() => {
      this.updateDom($elem, this.RESOURCE_DOC_IDS[0]);
    });
  }
}
