import { Injectable } from '@angular/core';
import { EnketoTranslationUtils } from '../../js/enketo/enketo-translator';

@Injectable({
  providedIn: 'root'
})

export class EnketoTranslationService {
  private findChildNode(root, childNodeName) {
    return EnketoTranslationUtils
      .withElements(root.childNodes)
      .find((node:any) => node.nodeName === childNodeName);
  }

  private repeatsToJs(data) {
    const repeatNode:any = this.findChildNode(data, 'repeat');
    if(!repeatNode) {
      return;
    }

    const repeats = {};

    EnketoTranslationUtils.withElements(repeatNode.childNodes).forEach((repeated:any) => {
      const key = repeated.nodeName + '_data';
      if(!repeats[key]) {
        repeats[key] = [];
      }
      repeats[key].push(EnketoTranslationUtils.nodesToJs(repeated.childNodes));
    });

    return repeats;
  }

  /*
   * Given a record, returns the parsed doc and associated docs
   * result.doc: the main document
   * result.siblings: more documents at the same level. These docs are docs
   *   that must link to the main doc, but the main doc must also link to them,
   *   for example the main doc may be a place, and a CHW a sibling.
   *   see: contacts-edit.component.ts:saveSiblings
   * result.repeats: documents from repeat nodes. These docs are simple docs
   *   that we wish to save independently of the main document.
   *   see: contacts-edit.component.ts:saveRepeated
   */
  contactRecordToJs(record) {
    const root = $.parseXML(record).firstChild;
    const result:any = {
      doc: null,
      siblings: {},
    };

    const repeats = this.repeatsToJs(root);
    if (repeats) {
      result.repeats = repeats;
    }

    const NODE_NAMES_TO_IGNORE = ['meta', 'inputs', 'repeat'];

    EnketoTranslationUtils
      .withElements(root.childNodes)
      .filter((node:any) => !NODE_NAMES_TO_IGNORE.includes(node.nodeName) && node.childElementCount > 0)
      .forEach((child:any) => {
        if (!result.doc) {
          // First child is the main result, rest are siblings
          result.doc = EnketoTranslationUtils.nodesToJs(child.childNodes);
          return;
        }
        result.siblings[child.nodeName] = EnketoTranslationUtils.nodesToJs(child.childNodes);
      });

    return result;
  }
}
