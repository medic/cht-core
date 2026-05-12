import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import { DbService } from '@mm-services/db.service';
import { ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';

const USER_FILE_ATTACHMENT_PREFIX = 'user-file-';
const DEFAULT_PHOTO_FIELD = 'photo';

@Component({
  selector: 'mm-contact-photo',
  templateUrl: './contact-photo.component.html',
  imports: [NgIf, ResourceIconPipe, TranslatePipe]
})
export class ContactPhotoComponent implements OnChanges, OnDestroy {
  @Input() doc?: { _id?: string; _attachments?: Record<string, any>; [field: string]: any };
  @Input() docId?: string;
  @Input() photoField?: string;
  @Input() fallbackIcon?: string;

  loading = false;
  objectUrl?: string;

  constructor(
    private readonly dbService: DbService,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes.doc || changes.docId || changes.photoField) {
      this.revoke();
      return this.load();
    }
  }

  ngOnDestroy() {
    this.revoke();
  }

  private async load() {
    const doc = await this.resolveDoc();
    const field = this.photoField || DEFAULT_PHOTO_FIELD;
    const photo = doc?.[field];
    if (!doc?._id || !photo) {
      return;
    }
    const attachmentName = `${USER_FILE_ATTACHMENT_PREFIX}${photo}`;
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
    } catch (err) {
      if ((err as { status?: number })?.status !== 404) {
        throw err;
      }
      console.warn(`ContactPhotoComponent: attachment ${attachmentName} missing on ${docId}`);
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
