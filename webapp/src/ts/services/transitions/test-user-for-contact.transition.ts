import { Injectable } from '@angular/core';

import { Transition, Doc } from '@mm-services/transitions/transition';

@Injectable({
  providedIn: 'root'
})
export class TestUserForContactsTransition extends Transition {
  constructor(
  ) {
    super();
  }

  readonly name = 'test_user_for_contacts';

  init() {
    return true;
  }

  filter(docs: Doc[]) {
    if (!docs) {
      return false;
    }
    // TODO: keep only contact docs
    return !!docs.filter(doc => doc?.type === 'data_record').length;
  }

  async run(docs: Doc[]) {
    if (!docs) {
      return [];
    }

    docs = docs.filter(Boolean);

    /*if (doc.should_create_user === 'true') {
      doc.user_for_contact = {
        add: { status: UserCreationStatus.READY, roles: [doc.role] },
      };
    }*/

    return docs;
  }
}
