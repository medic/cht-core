import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Pipe that resolves a translatable label to a string.
 * Handles three formats:
 *   - Array: [{ locale: 'en', content: 'Hello' }] finds the active locale, falls back to first entry
 *   - Object: { en: 'Hello', fr: 'Bonjour' } finds the active locale, falls back to first value
 *   - String: 'Hello' returns as-is
 * Returns undefined if the input is null or undefined.
 */
@Pipe({
  name: 'translateFrom',
  standalone: true,
})
export class TranslateFromPipe implements PipeTransform {

  constructor(private translate: TranslateService) {}

  /**
   * Transforms a translatable label into a string using the active locale.
   * 
   * @param {any} labels - the label to transform, can be an array, object or string
   * @returns {string | undefined} the resolved string, or undefined if labels is falsy
   */
  transform(labels: any): string | undefined {
    if (!labels) {
      return undefined;
    }

    const locale = this.translate.currentLang || 'en';

    if (Array.isArray(labels)) {
      const match = labels.find(l => l.locale === locale);
      if (match) {
        return match.content;
      }
      return labels[0]?.content;
    }

    if (typeof labels === 'object') {
      return labels[locale] || Object.values(labels)[0] as string;
    }

    return labels;
  }
}
