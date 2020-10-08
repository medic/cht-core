import { Component, OnInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { GlobalActions } from '@mm-actions/global';


@Component({
  templateUrl: './contacts-content.component.html'
})
export class ContactsContentComponent implements OnInit {
  private globalActions;
  loadingContent;
  selectedContact;

  constructor(
    private store: Store,
  ){
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {

  }
}
