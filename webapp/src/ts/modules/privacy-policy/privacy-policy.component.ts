import { Component, OnInit, Input } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { PrivacyPoliciesService } from '@mm-services/privacy-policies.service';
import { NgIf } from '@angular/common';
import { ToolBarComponent } from '@mm-components/tool-bar/tool-bar.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'mm-privacy-policy',
  templateUrl: './privacy-policy.component.html',
  imports: [
    NgIf,
    ToolBarComponent,
    TranslatePipe,
  ],
})
export class PrivacyPolicyComponent implements OnInit {
  @Input() overlay;
  private globalActions: GlobalActions;
  loading = false;
  accepting = false;
  privacyPolicy;

  constructor(
    private store: Store,
    private privacyPoliciesService: PrivacyPoliciesService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit(): void {
    this.getPrivatePolicy();
  }

  getPrivatePolicy() {
    this.loading = true;
    return this.privacyPoliciesService
      .getPrivacyPolicy()
      .then(privacyPolicy => {
        this.loading = false;

        if (!privacyPolicy) {
          this.globalActions.setPrivacyPolicyAccepted(true);
          this.globalActions.setShowPrivacyPolicy(false);
          return;
        }

        this.privacyPolicy = privacyPolicy;
      })
      .catch(() => this.loading = false);
  }

  accept() {
    this.accepting = true;
    return this.privacyPoliciesService
      .accept(this.privacyPolicy)
      .catch(err => console.warn('Error accepting privacy policy - continuing.', err))
      .then(() => this.globalActions.setPrivacyPolicyAccepted(true));
  }
}
