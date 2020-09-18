import { Component, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Store } from '@ngrx/store';
import { validate, normalize } from '@medic/phone-number';

import { MmModalAbstract } from '../mm-modal/mm-modal';
import { GlobalActions } from '../../actions/global';
import { UpdateSettingsService } from '../../services/update-settings.service';
import { LanguagesService } from '../../services/languages.service';

declare var $: any;

@Component({
  selector: 'guided-setup',
  templateUrl: './guided-setup.component.html'
})
export class GuidedSetupComponent extends MmModalAbstract {
  private globalactions;
  model:{ countryCode?, gatewayNumber? } = {};
  error:{ message? } = {};
  enabledLocales;

  constructor(
    public bsModalRef: BsModalRef,
    private store: Store,
    private updateSettingsService: UpdateSettingsService,
    private langugesService: LanguagesService
  ) {
    super();
    this.globalactions = new GlobalActions(store);
  }

  ngOnInit(): void {
    this.langugesService.get().then(languages => {
      this.enabledLocales = languages;
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
    const valid = this.validatePhoneNumber();
    if (!valid.valid) {
      this.error.message = valid.error;
      return;
    }

    const settings = <any>{};
    let val;

    val = this.model.gatewayNumber;
    if (val) {
      // normalise value        
      const info = { 
        default_country_code: this.model.countryCode,
        phone_validation: 'none'
      };
      
      settings.gateway_number = normalize(info, val);
    }
    val = this.model.countryCode;
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
      .then(function() {
        this.bsModalRef.hide();
      })
      .catch(function(err) {
        this.error.message = 'Error saving settings';
      });
  }

  cancel() {
    // const message = this.model.message 
    this.bsModalRef.hide();
  }
}
