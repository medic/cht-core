import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import { Selectors } from '@mm-selectors/index';
import { DbService } from '@mm-services/db.service';
import { ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';

const USER_FILE_ATTACHMENT_PREFIX = 'user-file-';
const DEFAULT_PROFILE_IMAGE_FIELD = 'profile_image';

@Component({
  selector: 'mm-contact-profile-image',
  templateUrl: './contact-profile-image.component.html',
  imports: [NgIf, ResourceIconPipe, TranslatePipe]
})
export class ContactProfileImageComponent implements OnInit, OnDestroy {
  subscription: Subscription = new Subscription();

  doc;
  fallbackIcon;
  loading = false;
  objectUrl?: string;

  constructor(
    private readonly store: Store,
    private readonly dbService: DbService,
  ) {}

  ngOnInit() {
    this.subscribeToStore();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.revoke();
  }

  private subscribeToStore() {
    const reduxSubscription = this.store
      .select(Selectors.getSelectedContact)
      .pipe(distinctUntilChanged((a, b) => a?.doc === b?.doc))
      .subscribe(selectedContact => {
        this.load(selectedContact)
          .catch(err => console.error('ContactProfileImageComponent :: Error loading profile image.', err));
      });
    this.subscription.add(reduxSubscription);
  }

  private async load(selectedContact) {
    this.revoke();
    this.doc = selectedContact?.doc;
    this.fallbackIcon = selectedContact?.type?.icon;

    const field = selectedContact?.type?.profile_image_field || DEFAULT_PROFILE_IMAGE_FIELD;
    const profileImage = this.doc?.[field];
    const attachmentName = `${USER_FILE_ATTACHMENT_PREFIX}${profileImage}`;
    if (!this.doc?._id || !profileImage || !this.doc._attachments?.[attachmentName]) {
      return;
    }

    this.loading = true;
    try {
      const blob = await this.dbService.get().getAttachment(this.doc._id, attachmentName);
      this.objectUrl = (window.URL || window.webkitURL).createObjectURL(blob);
    } finally {
      this.loading = false;
    }
  }

  private revoke() {
    if (this.objectUrl) {
      (window.URL || window.webkitURL).revokeObjectURL(this.objectUrl);
      this.objectUrl = undefined;
    }
  }
}
