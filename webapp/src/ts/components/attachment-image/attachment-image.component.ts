import { Component, Input, OnDestroy } from '@angular/core';

import { DbService } from '@mm-services/db.service';

export interface Attachment {
  readonly docId: string;
  readonly name: string;
}

@Component({
  selector: 'mm-attachment-image',
  templateUrl: './attachment-image.component.html',
})
export class AttachmentImageComponent implements OnDestroy {
  @Input() alt = '';

  loading = false;
  objectUrl?: string;

  constructor(private readonly dbService: DbService) {
  }

  @Input() set attachment(attachment: Attachment | undefined) {
    this.revoke();
    if (attachment) {
      this.load(attachment)
        .catch(err => console.error('AttachmentImageComponent :: Error loading attachment.', err));
    }
  }

  ngOnDestroy() {
    this.revoke();
  }

  private async load({ docId, name }: Attachment) {
    this.loading = true;
    try {
      const blob = await this.dbService.get().getAttachment(docId, name);
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
