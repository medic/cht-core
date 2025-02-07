import { Component, Input } from '@angular/core';
import { NgIf, NgClass } from '@angular/common';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { LineagePipe } from '@mm-pipes/message.pipe';

@Component({
  selector: 'mm-sender',
  templateUrl: './sender.component.html',
  imports: [NgIf, NgClass, TranslateDirective, RouterLink, TranslatePipe, LineagePipe]
})
export class SenderComponent {

  @Input() message;
  @Input() sentBy;
  @Input() hideLineage;

  getName() {
    return this.message.doc?.name
      || this.message.contact?.name
      || (!this.message.form && this.message.name)
      || this.message.from
      || this.message.sent_by
      || this.message.doc?.from;
  }

  getId() {
    return this.message.contact?._id || this.message.doc?._id;
  }
}
