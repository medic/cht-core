import { Component, Input } from '@angular/core';

@Component({
  selector: 'mm-privacy-policy',
  templateUrl: './privacy-policy.component.html'
})
export class PrivacyPolicyComponent {
  @Input() loading: boolean;
  @Input() accepting: boolean;
  @Input() accept;
  @Input() privacyPolicy = { html: '' };

  constructor() { }

}
