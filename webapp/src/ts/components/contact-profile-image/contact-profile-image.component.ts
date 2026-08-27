import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import { DbService } from '@mm-services/db.service';
import { ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';

const USER_FILE_ATTACHMENT_PREFIX = 'user-file-';
const DEFAULT_PROFILE_IMAGE_FIELD = 'profile_image';

@Component({
  selector: 'mm-contact-profile-image',
  templateUrl: './contact-profile-image.component.html',
  imports: [NgIf, ResourceIconPipe, TranslatePipe]
})
export class ContactProfileImageComponent implements OnChanges, OnDestroy {
  @Input() doc?: { _id?: string; _attachments?: Record<string, any>; [field: string]: any };
  @Input() docId?: string;
  @Input() profileImageField?: string;
  @Input() fallbackIcon?: string;

  loading = false;
  objectUrl?: string;

  constructor(
    private readonly dbService: DbService,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes.doc || changes.docId || changes.profileImageField) {
      this.revoke();
      return this.load();
    }
  }

  ngOnDestroy() {
    this.revoke();
  }

  private async load() {
    const doc = await this.resolveDoc();
    const field = this.profileImageField || DEFAULT_PROFILE_IMAGE_FIELD;
    const profileImage = doc?.[field];
    if (!doc?._id || !profileImage) {
      return;
    }
    const attachmentName = `${USER_FILE_ATTACHMENT_PREFIX}${profileImage}`;
    if (doc._attachments?.[attachmentName]) {
      await this.fetchObjectUrl(doc._id, attachmentName);
    }
  }

  private resolveDoc() {
    if (this.doc) {
      return Promise.resolve(this.doc);
    }
    if (this.docId) {
      return this.dbService.get().get(this.docId);
    }
    return Promise.resolve(null);
  }

  private async fetchObjectUrl(docId: string, attachmentName: string) {
    this.loading = true;
    try {
      const blob = await this.dbService.get().getAttachment(docId, attachmentName);
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
