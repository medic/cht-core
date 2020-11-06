import { TranslateCompiler } from '@ngx-translate/core';
import * as MessageFormat from 'messageformat';

const defaultConfig = {
  biDiSupport: false,
  formatters: undefined,
  locales: undefined,
  strictNumberSign: false,
  disablePluralKeyChecks: false,
};

export class TranslateMessageFormatCompilerProvider extends TranslateCompiler {
  private messageFormat;

  constructor() {
    super();
    this.messageFormat = new MessageFormat(defaultConfig.locales);
  }

  compile(value, lang) {
    // use default interpolation for these values
    // message-format doesn't support the double curly braces notation
    if (value.includes('{{')) {
      return value;
    }

    try {
      return this.messageFormat.compile(value, lang);
    } catch (err) {
      console.error('messageformat compile error', err);
      return value;
    }
  }

  compileTranslations(translations, lang) {
    Object.keys(translations).map(key => {
      translations[key] = this.compile(translations[key], lang)
    });
    return translations;
  }
}
