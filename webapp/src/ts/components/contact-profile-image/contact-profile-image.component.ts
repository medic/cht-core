import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { TranslatePipe } from '@ngx-translate/core';

import { Selectors } from '@mm-selectors/index';
import { Attachment, AttachmentImageComponent } from '@mm-components/attachment-image/attachment-image.component';
import { ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';

const USER_FILE_ATTACHMENT_PREFIX = 'user-file-';
const DEFAULT_PROFILE_IMAGE_FIELD = 'profile_image';

@Component({
  selector: 'mm-contact-profile-image',
  templateUrl: './contact-profile-image.component.html',
  imports: [AttachmentImageComponent, ResourceIconPipe, TranslatePipe]
})
export class ContactProfileImageComponent implements OnInit, OnDestroy {
  subscription: Subscription = new Subscription();

  name?: string;
  fallbackIcon?: string;
  attachment?: Attachment;

  constructor(private readonly store: Store) {}

  ngOnInit() {
    this.subscribeToStore();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private subscribeToStore() {
    const reduxSubscription = this.store
      .select(Selectors.getSelectedContact)
      .pipe(distinctUntilChanged((a, b) => a?.doc === b?.doc))
      .subscribe(selectedContact => this.setSelectedContact(selectedContact));
    this.subscription.add(reduxSubscription);
  }

  private setSelectedContact(selectedContact) {
    const doc = selectedContact?.doc;
    this.name = doc?.name;
    this.fallbackIcon = selectedContact?.type?.icon;

    const field = selectedContact?.type?.profile_image_field || DEFAULT_PROFILE_IMAGE_FIELD;
    const name = `${USER_FILE_ATTACHMENT_PREFIX}${doc?.[field]}`;
    this.attachment = doc?._id && doc._attachments?.[name] ? { docId: doc._id, name } : undefined;
  }
}
