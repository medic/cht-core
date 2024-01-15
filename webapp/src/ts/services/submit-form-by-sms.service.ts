import { Injectable } from '@angular/core';

import { Form2smsService } from '@mm-services/form2sms.service';
import { SettingsService } from '@mm-services/settings.service';

@Injectable({
  providedIn: 'root'
})
export class SubmitFormBySmsService {
  constructor(
    private form2SmsService:Form2smsService,
    private settingsService:SettingsService,
  ) {}

  submit(doc){
    if (!window.medicmobile_android) {
      console.info('Not in android wrapper.');
      return;
    }

    if (!window.medicmobile_android.sms_available) {
      console.info('Android wrapper does not have SMS hooks.');
      return;
    }

    if (!window.medicmobile_android.sms_available()) {
      console.warn(
        'Android wrapper does not have SMS enabled. Check stacktrace to see why the SmsSender failed to initialise.'
      );
      return;
    }

    return Promise
      .resolve()
      .then(() => {
        return this.form2SmsService
          .transform(doc)
          .then((smsContent) => {
            if (!smsContent) {
              console.debug('Form2Sms did not return any form content for doc:', doc);
              return;
            }

            return this.settingsService
              .get()
              .then((settings:any) => {
                const gatewayPhoneNumber = settings.gateway_number;
                if (gatewayPhoneNumber) {
                  window.medicmobile_android.sms_send(doc._id, gatewayPhoneNumber, smsContent);
                } else {
                  console.error('No gateway_number provided in app_settings.  Form cannot be submitted by SMS.');
                }
              })
              .catch((err) => {
                console.error('submitFormBySmsIfApplicable() failed: ' + err);
              });

          });
      });
  }
}
