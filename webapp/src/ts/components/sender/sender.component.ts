import { Component, Input } from '@angular/core';

@Component({
  selector: 'mm-sender',
  templateUrl: './sender.component.html'
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
    return this.message.doc?._id || this.message.contact?._id;
  }
}
