import { TranslateCompiler } from '@ngx-translate/core';
import * as MessageFormat from 'messageformat';
import { TranslateDefaultParser } from '@ngx-translate/core';
import { isObjectLike, isFunction } from 'lodash-es';
import { Injectable } from '@angular/core';

export class TranslateMessageFormatCompilerProvider extends TranslateCompiler {
  private messageFormat;
  private readonly doubleOrNoneCurlyBraces = new RegExp(/\{{|^[^{]+$/);

  constructor() {
    super();
    this.messageFormat = new MessageFormat([]);
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
      return {
        fn: this.messageFormat.compile(value, lang),
        value: value,
      };
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

// messageformat throws an error when incorrect/incomplete context is passed to the compiled translation.
// if this occurs, fallback to trying to translate the uncompiled value and log a warning.
@Injectable()
export class TranslateParserProvider extends TranslateDefaultParser {
  constructor() {
    super();
  }

  getValue(target, key) {
    return target?.[key] || super.getValue(target, key);
  }

  interpolate(expr, params) {
    if (isObjectLike(expr) && isFunction(expr.fn)) {
      try {
        return super.interpolate(expr.fn, params);
      } catch (err) {
        console.warn('Error while interpolating', expr.value);
        return super.interpolate(expr.value, params);
      }
    }

    return super.interpolate(expr, params);
  }
}
