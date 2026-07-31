import { Injectable } from '@angular/core';
import { isString as _isString } from 'lodash-es';

@Injectable({
  providedIn: 'root'
})
export class EnketoPrepopulationDataService {
  get(userSettings, model, data) {
    if (data && _isString(data)) {
      return data;
    }

    const xml = $($.parseXML(model));
    const bindRoot = xml.find('model instance').children().first();

    const userRoot = bindRoot.find('>inputs>user');

    if (data) {
      this.bindJsonToXml(bindRoot, data, (name) => {
        // Either a direct child or a direct child of inputs
        return '>%, >inputs>%'.replace(/%/g, name);
      });
    }

    if (userRoot.length) {
      this.bindJsonToXml(userRoot, userSettings);
    }

    return new XMLSerializer().serializeToString(bindRoot[0]);
  }

  /** True for a `[type=binary]` form field (an inline-binary / media node). */
  private isBinaryField(elem): boolean {
    const typeAttr = elem.attr ? elem.attr('type') : elem[0]?.getAttribute?.('type');
    return typeAttr === 'binary';
  }

  // Stash a binary field's prior value so the attachment-routing pipeline can restore
  // an untouched field on save; binary values are never loaded into the model (a
  // relative reference can't be told apart from inline base64).
  private stashBinaryReference(elem, data) {
    if (![ null, undefined, '' ].includes(data)) {
      elem.attr('data-attachment-ref', data);
    }
  }

  private bindJsonToXml(elem, data, childMatcher?) {
    // Enketo will remove all elements that have the "template" attribute
    // https://github.com/enketo/enketo-core/blob/51c5c2f494f1515a67355543b435f6aaa4b151b4/src/js/form-model.js#L436-L451
    elem.removeAttr('jr:template');
    elem.removeAttr('template');

    if (this.isBinaryField(elem)) {
      this.stashBinaryReference(elem, data);
      return;
    }

    if (data === null || typeof data !== 'object') {
      elem.text(data);
      return;
    }

    if (Array.isArray(data)) {
      const parent = elem.parent();
      elem.remove();

      data.forEach((dataEntry) => {
        const clone = elem.clone();
        this.bindJsonToXml(clone, dataEntry);
        parent.append(clone);
      });
      return;
    }

    if (!elem.children().length) {
      this.bindJsonToXml(elem, data._id);
    }

    Object.keys(data).forEach((key) => {
      const value = data[key];
      const current = this.findCurrentElement(elem, key, childMatcher);
      this.bindJsonToXml(current, value);
    });
  }

  private findCurrentElement(elem, name, childMatcher) {
    if (childMatcher) {
      const matcher = childMatcher(name);
      const found = elem.find(matcher);
      if (found.length > 1) {
        console.warn(`Enketo bindJsonToXml: Using the matcher "${matcher}" we found ${found.length} elements. ` +
          'We should only ever bind one.', elem, name);
      }
      return found;
    }

    // Match by node name in JS rather than passing `name` to the jQuery selector:
    // data keys can be `_attachments` names containing ':' / '/' (form-id-derived),
    // which jQuery would reject as an invalid selector.
    return elem.children().filter((_idx, child) => child.nodeName === name);
  }
}
