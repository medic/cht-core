import { AfterViewInit, Component } from '@angular/core';
import * as phoneNumber from '@medic/phone-number';
import { TranslateService } from '@ngx-translate/core';
import { filter as _filter, map as _map, partial as _partial } from 'lodash-es';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { FormatProvider } from '@mm-providers/format.provider';
import { SettingsService } from '@mm-services/settings.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { SendMessageService } from '@mm-services/send-message.service';
import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';
import { Select2SearchService } from '@mm-services/select2-search.service';

@Component({
  selector: 'send-message',
  templateUrl: './send-message.component.html',
})
export class SendMessageComponent extends MmModalAbstract implements AfterViewInit {
  id = 'send-message';

  errors = {
    message: false,
    phone: false
  };
  fields = { // Field values are automatically assigned by BsModal, if initialState defined.
    to: '',
    message: '',
    phone: ''
  };

  constructor(
    private translateService: TranslateService,
    private formatProvider: FormatProvider,
    private settingsService: SettingsService,
    private contactTypesService: ContactTypesService,
    public bsModalRef: BsModalRef,
    private sendMessageService: SendMessageService,
    private select2SearchService: Select2SearchService
  ) {
    super(bsModalRef);
  }

  ngAfterViewInit(): void {
    const to = this.fields.to;
    const phoneField = $('.message-form #send-message-phone');
    $('.message-form .count').text('');
    this.initPhoneField(phoneField, to);
  }

  private validateMessage(message) {
    if (message) {
      this.errors.message = false;
      return;
    }

    const fieldLabel = this.translateService.instant('tasks.0.messages.0.message');
    this.errors.message = this.translateService.instant('field is required', { field: fieldLabel });
  }

  private validatePhoneNumber(settings, data) {
    if (data.everyoneAt) {
      return true;
    }

    if (data.doc) {
      const contact = data.doc.contact || data.doc;
      return contact && phoneNumber.validate(settings, contact.phone);
    }

    return phoneNumber.validate(settings, data.id);
  }

  private validatePhoneNumbers(settings, recipients) {
    // Recipients is mandatory
    if (!recipients || !recipients.length) {
      const fieldLabel = this.translateService.instant('tasks.0.messages.0.to');
      this.errors.phone = this.translateService.instant('field is required', { field: fieldLabel });
      return;
    }

    // All recipients must have a valid phone number
    const errors = _filter(recipients, (data) => !this.validatePhoneNumber(settings, data));

    if (errors.length) {
      const errorRecipients = _map(errors, (error) => this.templateSelection(error)).join(', ');
      this.errors.phone = this.translateService.instant('Invalid contact numbers', { recipients: errorRecipients });
      return;
    }

    this.errors.phone = false;
  }

  private formatPlace(row) {
    return this.translateService.instant('Everyone at', {
      facility: row.doc && row.doc.name,
      count: row.descendants ? row.descendants.length : ''
    });
  }

  private templateResult(contactTypes = [], row) {
    if (!row) {
      return;
    }

    if (row.text) {
      // Either Select2 detritus such as 'Searching…', or any custom value
      // you enter, such as a raw phone number
      return row.text;
    }

    const typeId = row.doc.contact_type || row.doc.type;
    const type = contactTypes.find(type => type.id === typeId) || {};
    let contact;

    if (row.everyoneAt) {
      // TODO: maybe with everyone at we want to change the icon to something else?
      contact = this.formatProvider.sender({
        name: this.formatPlace(row),
        parent: row.doc.place
      });
    } else {
      contact = this.formatProvider.sender(row.doc);
    }

    return $('<span class="fa fa-fw ' + type.icon + '"></span>' + contact);
  }

  private templateSelection(row) {
    if (!row) {
      return;
    }

    if (!row.doc) {
      return row.text;
    }

    if (row.everyoneAt) {
      return this.formatPlace(row);
    }

    // TODO: should this be first_name / last_name as well? How does this work?
    return row.doc.name || row.doc.phone;
  }

  private getSelect2Options(settings, personTypes, contactTypes, initialValue) {
    return {
      tags: true,
      templateResult: _partial((contactTypes, row) => this.templateResult(contactTypes, row), contactTypes),
      templateSelection: (row) => this.templateSelection(row),
      initialValue: initialValue,
      sendMessageExtras: (results) => {
        const messages = [ ...results ];
        results.forEach(result => {
          if (personTypes.includes(result.doc.contact_type || result.doc.type)) {
            return;
          }
          messages.push({
            id: 'everyoneAt:' + result.id,
            doc: result.doc,
            everyoneAt: true
          });
        });

        return messages.filter(message => this.validatePhoneNumber(settings, message));
      }
    };
  }

  private initPhoneField($phone, initialValue) {
    return Promise
      .all([
        this.settingsService.get(),
        this.contactTypesService.getAll()
      ])
      .then(([settings, contactTypes = []]) => {
        const searchIds = contactTypes.map(type => type.id);
        const personTypes = contactTypes
          .filter(type => type.person)
          .map(type => type.id);
        const select2Options = this.getSelect2Options(settings, personTypes, contactTypes, initialValue);

        return this.select2SearchService.init($phone, searchIds, select2Options);
      });
  }

  submit() {
    this.setProcessing();

    this.settingsService
      .get()
      .then((settings) => {
        const message = this.fields.message && this.fields.message.trim();
        const recipients = (<any>$('.message-form #send-message-phone')).select2('data');
        this.validateMessage(message);
        this.validatePhoneNumbers(settings, recipients);

        if (!this.errors.message && !this.errors.phone) {
          return this.sendMessageService
            .send(recipients, message)
            .then(() => this.close());
        }
      })
      .then(() => this.setFinished())
      .catch((err) => this.setError(err, 'Error sending message'));
  }
}
