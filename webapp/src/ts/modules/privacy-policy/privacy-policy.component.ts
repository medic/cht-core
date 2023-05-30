import { Component, OnInit, Input } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { PrivacyPoliciesService } from '@mm-services/privacy-policies.service';
import { TrainingCardsService } from '@mm-services/training-cards.service';

@Component({
  selector: 'mm-privacy-policy',
  templateUrl: './privacy-policy.component.html',
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
    private trainingCardsService: TrainingCardsService,
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
      .then(() => this.globalActions.setPrivacyPolicyAccepted(true))
      .then(() => this.trainingCardsService.showTrainingCards());
  }
}
