import { Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class CountMessageService {

  gsmChars = new RegExp('^[A-Za-z0-9 \\r\\n@£$¥èéùìòÇØøÅå\u0394_\u03A6\u0393\u039B\u03A9\u03A0\u03A8\u03A3\u0398\u039EÆæßÉ!"#$%&\'()*+,\\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\\\\\[~\\]|\u20AC]*$'); // eslint-disable-line

  constructor(
    private translateService: TranslateService,
    private settingsService: SettingsService
  ) { }

  private getMax(message) {
    return this.gsmChars.test(message) ? 160 : 70;
  }

  private calculate(message) {
    const max = this.getMax(message);
     return {
       messages: Math.ceil(message.length / max),
       characters: max - ((message.length - 1) % max) - 1
     };
  }

  private label(value, many) {
    const count = this.calculate(value);
    let key = 'message.characters.left';

    if (count.messages > 1) {
      key = 'message.characters.left.multiple';
      if (many) {
        key = 'message.characters.left.multiple.many';
      }
    }

    return this.translateService.instant(key, count);
  }

  init() {
    this.settingsService
      .get()
      .then((settings:any) => {
        $('body').on('keyup', '[name=message]', (e) => {

          const target = $(e.target);
          const message = target.val();

          const count = this.calculate(message);
          const settingsMaximumSMSPart = settings.multipart_sms_limit || 10;

          const alertMessage = target.closest('.message-form')
            .find('.count');
          target.closest('.message-form')
            .find('.count')
            .text(this.label(message, (count.messages > settingsMaximumSMSPart)));

          if (count.messages > settingsMaximumSMSPart) {
            if (alertMessage.siblings('.btn.submit').length) {
              alertMessage.addClass('alert-danger')
                .siblings('.btn.submit')
                .addClass('disabled');
            } else {
              alertMessage.addClass('alert-danger')
                .closest('mm-modal')
                .find('.btn.submit')
                .addClass('disabled');
            }
          } else {
            if (alertMessage.siblings('.btn.submit').length) {
              alertMessage.removeClass('alert-danger')
                .siblings('.btn.submit')
                .removeClass('disabled');
            } else {
              alertMessage.removeClass('alert-danger')
                .closest('mm-modal')
                .find('.btn.submit')
                .removeClass('disabled');
            }
          }
        });
      });
  }

}
