import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'mm-sender',
  templateUrl: './sender.component.html'
})
export class SenderComponent implements OnInit {

  @Input() message;
  @Input() sentBy;
  @Input() hideLineage;

  constructor() { }

  ngOnInit(): void { }

}
