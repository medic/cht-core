import { Component, AfterViewInit, AfterViewChecked } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { validate as validatePhoneNumber, normalize as normalizePhoneNumber } from '@medic/phone-number';

import { MmModalAbstract } from '../mm-modal/mm-modal';
import { UpdateSettingsService } from '../../services/update-settings.service';
import { LanguagesService } from '../../services/languages.service';
import { SettingsService } from '../../services/settings.service';
import { COUNTRY_LIST } from '../../providers/countries.provider';

@Component({
  selector: 'guided-setup',
  templateUrl: './guided-setup.component.html'
})
export class GuidedSetupComponent extends MmModalAbstract implements AfterViewInit, AfterViewChecked {
  model:{ countryCode?; gatewayNumber? } = {};
  error:{ message? } = {};
  enabledLocales;
  countryList;
  settingsLoaded = false;
  settings = <any>{};

  static id = 'guided-setup-modal';

  constructor(
    bsModalRef: BsModalRef,
    private updateSettingsService: UpdateSettingsService,
    private languagesService: LanguagesService,
    private settingsService: SettingsService,
  ) {
    super(bsModalRef);
  }

  private updateNumbers() {
    const gatewayNumber = $('#guided-setup [name=gateway-number]').val();
    const defaultCountryCode = $('#guided-setup [name=default-country-code]').val();
    const parts = [];
    if (defaultCountryCode) {
      parts.push('+' + defaultCountryCode);
    }
    if (gatewayNumber) {
      parts.push(gatewayNumber);
    }
    $(this).closest('.panel').find('.panel-heading .value').text(parts.join(', '));
    if (gatewayNumber && defaultCountryCode) {
      $(this).closest('.panel').addClass('panel-complete');
    }
  }

  private selectOption(e) {
    e.preventDefault();
    const elem = $(e.currentTarget);
    elem.closest('.horizontal-options')
      .find('.selected')
      .removeClass('selected');
    elem.addClass('selected');
    const panel = elem.closest('.panel');
    const label = [];
    panel.find('.horizontal-options .selected').each(function() {
      label.push($(this).text().trim());
    });
    panel
      .addClass('panel-complete')
      .find('.panel-heading .value')
      .text(label.join(', '));
  }

  ngAfterViewInit() {
    this.bsModalRef.setClass('modal-lg');
    this.languagesService.get().then(languages => {
      this.enabledLocales = languages;
      this.countryList = COUNTRY_LIST;
      $('#guided-setup').on('click', '.horizontal-options a', this.selectOption);
      $('#guided-setup [name=gateway-number]').on('input', this.updateNumbers);
      (<any>$('#guided-setup [name=default-country-code]')).select2({ width: '20em', data: this.countryList });
      $('#guided-setup [name=default-country-code]').on('change', this.updateNumbers);
      this.settingsService.get().then((res: any) => {
        this.settingsLoaded = true;
        this.settings = res;
        if (this.settings.setup_complete) {
          $('#guided-setup [name=gateway-number]').val(this.settings.gateway_number).trigger('input');
          $('#primary-contact-content a[data-value=' + this.settings.care_coordinator + ']').trigger('click');
          $('#registration-form-content a[data-value=' + this.settings.anc_registration_lmp + ']').trigger('click');
        }
      });
    });
  }

  ngAfterViewChecked() {
    if (this.settingsLoaded && this.settings.setup_complete) {
      $('#guided-setup [name=default-country-code]').val(this.settings.default_country_code).change();
      $('#language-preference-content .locale a[data-value=' + this.settings.locale + ']').trigger('click');
      $('#language-preference-content .locale-outgoing a[data-value=' + this.settings.locale_outgoing + ']')
        .trigger('click');
      this.settingsLoaded = false;
    }
  }

  private validatePhoneNumber() {
    const countryCode = this.model.countryCode;
    const gatewayNumber = this.model.gatewayNumber;
    if (gatewayNumber &&
      !validatePhoneNumber({ default_country_code: countryCode, phone_validation: 'none' }, gatewayNumber)) {
      return {
        valid: false,
        error: 'Phone number not valid'
      };
    }
    return { valid: true };
  }

  submit() {
    this.setProcessing();

    const valid = this.validatePhoneNumber();
    if (!valid.valid) {
      this.setError(null, valid.error);
      return;
    }

    const settings = <any>{};
    let val;

    val = $('#guided-setup [name=gateway-number]').val();
    if (val) {
      // normalise value
      const info = {
        default_country_code: this.model.countryCode,
        phone_validation: 'none'
      };

      settings.gateway_number = normalizePhoneNumber(info, val);
    }
    val = $('#guided-setup [name=default-country-code]').val();
    if (val) {
      settings.default_country_code = val;
    }
    val = $('#primary-contact-content .horizontal-options .selected').attr('data-value');
    if (val) {
      settings.care_coordinator = val;
    }
    val = $('#language-preference-content .locale .selected').attr('data-value');
    if (val) {
      settings.locale = val;
    }
    val = $('#language-preference-content .locale-outgoing .selected').attr('data-value');
    if (val) {
      settings.locale_outgoing = val;
    }
    val = $('#registration-form-content .horizontal-options .selected').attr('data-value');
    if (val) {
      settings.anc_registration_lmp = val === 'true';
    }

    return this.updateSettingsService
      .update(settings)
      .then(() => {
        this.setFinished();
        this.close();
      })
      .catch((err) => {
        this.setError(err, 'Error saving settings');
      });
  }
}
