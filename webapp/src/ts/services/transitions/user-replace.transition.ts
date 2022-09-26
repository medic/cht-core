import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { Transition, Doc } from '@mm-services/transitions/transition';
import { UserReplaceService } from '@mm-services/user-replace.service';

@Injectable({
  providedIn: 'root'
})
export class UserReplaceTransition extends Transition {
  constructor(
    private dbService: DbService,
    private userReplaceService: UserReplaceService,
  ) {
    super();
  }

  readonly name = 'user_replace';

  init() {
    // TODO Update this to load configured forms based on passed in settings
    return true;
  }

  /**
   * @param {Array<Doc>} docs - docs to be saved
   * @return {Boolean} - whether any of the docs from the batch should be processed
   */
  filter(docs: Doc[]) {
    return !!docs.filter(doc => doc.type === 'data_record').length;
  }

  /**
   * @param {Array<Doc>} docs - docs to run the transition over
   * @returns {Promise<Array<Doc>>} - updated docs (may include additional docs)
   */
  async run(docs: Doc[]): Promise<Doc[]> {
    const originalContact = await this.userReplaceService.getUserContact();
    if (!originalContact) {
      return docs;
    }

    const userReplaceDoc = this.getUserReplaceDoc(docs);
    if (userReplaceDoc) {
      return this.replaceUser(docs, userReplaceDoc, originalContact);
    }
    if (this.userReplaceService.isReplaced(originalContact)) {
      this.reparentReports(docs as ReportDoc[], originalContact);
    }

    return docs;
  }

  private getUserReplaceDoc(docs: Doc[]): UserReplaceDoc {
    return docs.find(doc => doc.form === 'replace_user') as UserReplaceDoc;
  }

  private async replaceUser(docs: Doc[], userReplaceDoc: UserReplaceDoc, originalContact: Doc): Promise<Doc[]> {
    const { original_contact_uuid, new_contact_uuid } = userReplaceDoc.fields;
    if (originalContact._id !== original_contact_uuid) {
      throw new Error('The only the contact associated with the currently logged in user can be replaced.');
    }
    const newContact = await this.getNewContact(docs, new_contact_uuid);
    if (!newContact) {
      throw new Error(`The new contact could not be found [${new_contact_uuid}].`);
    }

    this.userReplaceService.setReplaced(originalContact, newContact);
    return [...docs, originalContact];
  }

  private async getNewContact(docs: Doc[], newContactId: string): Promise<Doc> {
    const newContact = docs.find(doc => doc._id === newContactId);
    if (newContact) {
      return newContact;
    }
    return this.dbService
      .get()
      .get(newContactId)
      .catch(err => {
        if (err.status === 404) {
          return;
        }
        throw err;
      });
  }

  private reparentReports(docs: ReportDoc[], originalContact: Doc) {
    const replacedById = this.userReplaceService.getReplacedBy(originalContact);
    if (!replacedById) {
      return;
    }
    docs
      .filter(doc => doc.type === 'data_record')
      .filter(doc => doc.contact?._id === originalContact._id)
      .forEach(doc => doc.contact._id = replacedById);
  }
}

interface UserReplaceDoc extends Doc {
  fields: {
    original_contact_uuid: string;
    new_contact_uuid: string;
  };
}

interface ReportDoc extends Doc {
  contact: {
    _id: string;
  };
}
