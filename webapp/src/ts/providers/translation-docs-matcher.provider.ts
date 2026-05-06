import { Injectable } from '@angular/core';
import { PREFIXES } from '@medic/constants';

@Injectable()
export class TranslationDocsMatcherProvider {
  private static readonly DOC_ID_PREFIX = PREFIXES.TRANSLATIONS;
  private static readonly translationsDocIdMatcher = new RegExp(
    `^${TranslationDocsMatcherProvider.DOC_ID_PREFIX}(.+)$`
  );

  static test(docId?) {
    return docId && TranslationDocsMatcherProvider.translationsDocIdMatcher.test(docId);
  }

  static getLocaleCode(docId?) {
    if (!docId) {
      return false;
    }
    const match = docId.toString().match(TranslationDocsMatcherProvider.translationsDocIdMatcher);
    return match && match[1];
  }

  static getTranslationsDocId(locale?) {
    if (!locale) {
      return false;
    }

    return TranslationDocsMatcherProvider.DOC_ID_PREFIX + locale;
  }
}
