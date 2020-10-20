import { Component, Input } from '@angular/core';

@Component({
  selector: 'mm-sender',
  templateUrl: './sender.component.html'
})
export class SenderComponent {

  @Input() message;
  @Input() sentBy;
  @Input() hideLineage;

  constructor() { }
}
