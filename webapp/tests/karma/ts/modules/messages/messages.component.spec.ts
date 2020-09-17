import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from "rxjs";
import { Store } from "@ngrx/store";
import { expect } from 'chai';
import { stub } from 'sinon';

import { MessagesComponent } from "../../../../../src/ts/modules/messages/messages.component";
import { ChangesService } from "../../../../../src/ts/services/changes.service";
import { MessageContactService } from "../../../../../src/ts/services/message-contact.service";

describe('Messages Component', () => {
  let component: MessagesComponent;
  let fixture: ComponentFixture<MessagesComponent>;
  const store = {
    pipe: stub().returns(of({})),
    dispatch: stub()
  };
  const messageContactService = {
    getList: stub().returns(Promise.resolve([]))
  };
  const changesService = {
    subscribe: stub().returns(Promise.resolve(of({})))
  };

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        MessagesComponent
      ],
      providers: [
        { provide: Store, useValue: store },
        { provide: ChangesService, useValue: changesService },
        { provide: MessageContactService, useValue: messageContactService },
      ]
    }).compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(MessagesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  it('should create MessagesComponent', () => {
    expect(component).to.exist;
    expect(store.pipe.callCount).to.equal(4);
  });
});
