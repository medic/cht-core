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

  private bindJsonToXml(elem, data, childMatcher?) {
    // Enketo will remove all elements that have the "template" attribute
    // https://github.com/enketo/enketo-core/blob/51c5c2f494f1515a67355543b435f6aaa4b151b4/src/js/form-model.js#L436-L451
    elem.removeAttr('jr:template');
    elem.removeAttr('template');

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

    return elem.children(name);
  }
}
