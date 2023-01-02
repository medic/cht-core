import { Injectable } from '@angular/core';

import { Transition, Doc } from '@mm-services/transitions/transition';
import { CreateUserForContactsService } from '@mm-services/create-user-for-contacts.service';

@Injectable({
  providedIn: 'root'
})
export class TestUserForContactsTransition extends Transition {
  constructor(private createUserForContactsService: CreateUserForContactsService) {
    super();
  }

  readonly name = 'test_user_for_contacts';
  public readonly isEnabled = true;

  init() {
    return true;
  }

  filter(docs: Doc[]) {
    if (!docs) {
      return false;
    }

    return !!docs.filter(doc => doc?.create_user_for_contact === 'true').length;
  }

  async run(docs: Doc[]) {
    if (!docs) {
      return [];
    }

    docs = docs.filter(Boolean).map(doc => {
      this.createUserForContactsService.setAddUser(doc);
      return doc;
    });

    return docs;
  }
}
