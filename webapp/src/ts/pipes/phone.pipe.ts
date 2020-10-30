import { Injectable, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import * as phoneNumber from '@medic/phone-number';
import { SettingsService } from '@mm-services/settings.service';

@Pipe({
  name: 'phone'
})
@Injectable({
  providedIn: 'root'
})
export class PhonePipe implements PipeTransform {
  private settings;
  constructor(
    private settingsService:SettingsService,
    private sanitizer: DomSanitizer,
  ) {
    // todo test if this indeed gets initialized before views are rendered
    this.settingsService.get().then(settings => this.settings = settings);
  }

  private format(phone) {
    if (this.settings) {
      // if valid return the formatted number,
      // if invalid return the given string
      return phoneNumber.format(this.settings, phone) || phone;
    }
    return phone; // unformatted placeholder
  };

  transform(phone) {
    if (!phone) {
      return;
    }

    const formatted = this.format(phone);
    const html = '<p>' +
                 '<a href="tel:' + phone + '" class="mobile-only">' + formatted + '</a>' +
                 '<span class="desktop-only">' + formatted + '</span>' +
                 '</p>';
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
