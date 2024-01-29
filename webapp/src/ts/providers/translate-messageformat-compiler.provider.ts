import { TranslateCompiler } from '@ngx-translate/core';
import MessageFormat from '@messageformat/core';

export class TranslateMessageFormatCompilerProvider extends TranslateCompiler {
  private messageFormat;
  private readonly doubleOrNoneCurlyBraces = new RegExp(/\{{|^[^{]+$/);

  constructor() {
    super();
    this.messageFormat = new MessageFormat([]);
  }

  private getCompiledMessageFormat(value, lang) {
    const compiledMessageFormat = this.messageFormat.compile(value, lang);
    return (params) => {
      try {
        return compiledMessageFormat(params);
      } catch (err) {
        console.warn('Error while interpolating', value);
        return value;
      }
    };
  }

  compile(value, lang) {
    // messageformat uses single curly braces for defining parameters( like `His name is {NAME}` )
    // passing a string that contains open double curly braces to message-format produces an error
    // if the message has either double curly braces or no curly braces at all, bypass messageformat entirely
    const hasDoubleOrNoCurlyBraces = this.doubleOrNoneCurlyBraces.test(value);
    if (hasDoubleOrNoCurlyBraces) {
      return value;
    }

    try {
      return this.getCompiledMessageFormat(value, lang);
    } catch (err) {
      console.error('messageformat compile error', err);
      return value;
    }
  }

  compileTranslations(translations, lang) {
    Object.keys(translations).forEach(key => {
      translations[key] = this.compile(translations[key], lang);
    });
    return translations;
  }
}
