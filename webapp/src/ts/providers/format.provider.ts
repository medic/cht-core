import { Injectable } from '@angular/core';
import * as _ from 'lodash-es';
import { TranslateService } from '@mm-services/translate.service';

@Injectable({
  providedIn: 'root'
})
export class FormatProvider {
  constructor(
    private translateService:TranslateService
  ) {}

  private formatEntity(entity) {
    if (!entity) {
      return;
    }
    if (_.isString(entity)) {
      return _.escape(entity);
    }
    let part = entity.name || (entity.contact && entity.contact.phone);
    if (part) {
      part = _.escape(part);
      if (entity._id) {
        const url = `/#/contacts/${entity._id}`;
        part = '<a href="' + url + '">' + part + '</a>';
      }
      return part;
    }
  }

  lineage(entity) {
    let parts;
    if (_.isArray(entity)) {
      parts = entity.map((i) => {
        return this.formatEntity(i);
      });
    } else {
      parts = [];
      while (entity) {
        parts.push(this.formatEntity(entity));
        entity = entity.parent;
      }
    }
    const items = _.compact(parts).map((part) => {
      return '<li>' + part + '</li>';
    });
    return '<ol class="horizontal lineage">' + items.join('') + '</ol>';
  }

  // @deprecated
  // use lineage filter instead.
  clinic(entity) {
    return this.lineage(entity);
  }

  sender(options) {
    const parts: string[] = [];
    if (options?.name) {
      parts.push('<span class="name">' + _.escape(options.name) + '</span>');
    }
    if (options?.muted) {
      parts.push('<span class="muted">' + _.escape(this.translateService.instant('contact.muted')) + '</span>');
    }
    if (options?.phone) {
      parts.push('<span test-id="phone">' + _.escape(options.phone) + '</span>');
    }
    const position = this.lineage(options.parent || options.lineage);
    if (position) {
      parts.push('<div class="position">' + position + '</div>');
    }
    return '<span class="sender">' + parts.join('') + '</span>';
  }
}
