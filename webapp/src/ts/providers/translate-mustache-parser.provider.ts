import { TranslateDefaultParser } from '@ngx-translate/core';
import * as messages from '@medic/message-utils';
import * as extensionLibs from '@medic/extension-libs';

export class TranslateMustacheParserProvider extends TranslateDefaultParser {
  private readonly sectionTemplate = /{{\s*[#^]/;

  interpolate(expression, params?) {
    if (typeof expression === 'string' && this.sectionTemplate.test(expression)) {
      return messages.template({
        config: {},
        translate: value => value,
        doc: params || {},
        content: { message: expression },
        extensionLibs: extensionLibs.getAll(),
      });
    }
    return super.interpolate(expression, params);
  }
}
