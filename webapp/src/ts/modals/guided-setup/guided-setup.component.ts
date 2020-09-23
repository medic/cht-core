import { Component, AfterViewInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Store } from '@ngrx/store';
import { validate, normalize } from '@medic/phone-number';

import { MmModalAbstract } from '../mm-modal/mm-modal';
import { GlobalActions } from '../../actions/global';
import { UpdateSettingsService } from '../../services/update-settings.service';
import { LanguagesService } from '../../services/languages.service';
import { SettingsService } from '../../services/settings.service';
import { COUNTRY_LIST } from '../../providers/countries.provider';

declare let $: any;
const countries = require('../../../js/modules/countries');


@Component({
  selector: 'guided-setup',
  templateUrl: './guided-setup.component.html'
})
export class GuidedSetupComponent extends MmModalAbstract implements AfterViewInit {
  private globalactions;
  model:{ countryCode?, gatewayNumber? } = {};
  error:{ message? } = {};
  enabledLocales;
  countryList;

  constructor(
    public bsModalRef: BsModalRef,
    private store: Store,
    private updateSettingsService: UpdateSettingsService,
    private langugesService: LanguagesService,
    private settingsService: SettingsService,
  ) {
    super();
    this.globalactions = new GlobalActions(store);
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
  };

  private selectOption = function(e) {
    e.preventDefault();
    const elem = $(this);
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
  };

  ngAfterViewInit() {
    this.langugesService.get().then(languages => {
      this.enabledLocales = languages;
      this.countryList = COUNTRY_LIST;
      $('#guided-setup').on('click', '.horizontal-options a', this.selectOption);
      $('#guided-setup [name=gateway-number]').on('input', this.updateNumbers);
      $('#guided-setup [name=default-country-code]').select2({ width: '20em', data: countries.list });
      $('#guided-setup [name=default-country-code]').on('change', this.updateNumbers);
      this.settingsService.get().then((res: any) => {
        if (res.setup_complete) {
          $('#guided-setup [name=default-country-code]').val(res.default_country_code).change();
          $('#guided-setup [name=gateway-number]').val(res.gateway_number).trigger('input');
          $('#primary-contact-content a[data-value=' + res.care_coordinator + ']').trigger('click');
          $('#registration-form-content a[data-value=' + res.anc_registration_lmp + ']').trigger('click');
          setTimeout(() => { // setTimeout used to make sure ngFor generated list is ready
            $('#language-preference-content .locale a[data-value=' + res.locale + ']').trigger('click');
            $('#language-preference-content .locale-outgoing a[data-value=' + res.locale_outgoing + ']')
              .trigger('click');
          }, 10);
        }
      })
    });
  }

  private validatePhoneNumber() {
    const countryCode = this.model.countryCode;
    const gatewayNumber = this.model.gatewayNumber;
    if (gatewayNumber &&
      !validate({ default_country_code: countryCode, phone_validation: 'none' }, gatewayNumber)) {
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
      
      settings.gateway_number = normalize(info, val);
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
    return this.updateSettingsService.update(settings)
      .then(() => {
        this.setFinished();
        this.bsModalRef.hide();
      })
      .catch((err) => {
        this.setError(err, 'Error saving settings');
      });
  }

  cancel() {
    this.bsModalRef.hide();
  }
}
