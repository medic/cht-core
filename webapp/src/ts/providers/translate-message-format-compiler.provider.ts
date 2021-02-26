import { TranslateCompiler } from '@ngx-translate/core';
import * as MessageFormat from 'messageformat';

export class TranslateMessageFormatCompilerProvider extends TranslateCompiler {
  private messageFormat;
  private readonly doubleOrNoneCurlyBraces = new RegExp(/\{{|^[^{]+$/);

  constructor() {
    super();
    this.messageFormat = new MessageFormat([]);
  }

  compile(value, lang) {
    // message-format uses single curly braces for defining parameters( like `His name is {NAME}` )
    // passing a string that contains open double curly braces to message-format produces an error
    // if the message has either double curly braces or no curly braces at all, bypass message-format entirely
    const hasDoubleOrNoCurlyBraces = this.doubleOrNoneCurlyBraces.test(value);
    if (hasDoubleOrNoCurlyBraces) {
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
      translations[key] = this.compile(translations[key], lang);
    });
    return translations;
  }
}
