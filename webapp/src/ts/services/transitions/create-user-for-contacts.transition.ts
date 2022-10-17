import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { Transition, Doc } from '@mm-services/transitions/transition';
import { CreateUserForContactsService } from '@mm-services/create-user-for-contacts.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { UserContactService } from '@mm-services/user-contact.service';

@Injectable({
  providedIn: 'root'
})
export class CreateUserForContactsTransition extends Transition {
  constructor(
    private dbService: DbService,
    private createUserForContactsService: CreateUserForContactsService,
    private extractLineageService: ExtractLineageService,
    private userContactService: UserContactService,
  ) {
    super();
  }

  readonly name = 'create_user_for_contacts';
  private readonly REPLACE_PROPERTY = 'replace_forms';
  private replaceForms;

  /**
   * @param {Object} settings - the CHT instance settings
   * @return {Boolean} - whether the required config is present
   */
  init(settings) {
    if(!settings) {
      return false;
    }
    this.replaceForms = this.getReplaceForms(settings);
    if (!this.replaceForms || !Array.isArray(this.replaceForms) || !this.replaceForms.length) {
      console.warn(
        `Configuration error. Config must define have a '${this.name}.${this.REPLACE_PROPERTY}' array defined.`
      );

      return false;
    }
    return true;
  }

  /**
   * @param {Array<Doc>} docs - docs to be saved
   * @return {Boolean} - whether any of the docs from the batch should be processed
   */
  filter(docs: Doc[]) {
    if(!docs) {
      return false;
    }
    return !!docs.filter(doc => doc?.type === 'data_record').length;
  }

  /**
   * @param {Array<Doc>} docs - docs to run the transition over
   * @returns {Promise<Array<Doc>>} - updated docs (may include additional docs)
   */
  async run(docs: Doc[]) {
    if (!docs) {
      return [];
    }
    docs = docs.filter(doc => doc);

    const [originalUserId, originalContact] = await Promise.all([
      this.createUserForContactsService.getUserId(),
      this.userContactService.get({ hydrateLineage: false }),
    ]);
    if (!originalContact) {
      return docs;
    }

    if (this.createUserForContactsService.isReplaced(originalContact)) {
      this.reparentReports(docs, originalContact);
    }
    const userReplaceDoc = this.getUserReplaceDoc(docs);
    if (userReplaceDoc) {
      await this.replaceUser({
        docs,
        userReplaceDoc,
        originalContact,
        originalUserId,
      });
    }

    return docs;
  }

  private getTransitionConfig(settings) {
    return settings[this.name];
  }

  private getReplaceForms(settings) {
    return this.getTransitionConfig(settings)?.[this.REPLACE_PROPERTY] || [];
  }

  private getUserReplaceDoc(docs: Doc[]) {
    const replaceDocs = docs.filter(doc => this.replaceForms.includes(doc.form));
    if(replaceDocs.length > 1) {
      throw new Error('Only one user replace form is allowed to be submitted per transaction.');
    }

    return replaceDocs[0] as UserReplaceDoc;
  }

  private async replaceUser({ docs, userReplaceDoc, originalContact, originalUserId }: ReplaceUserParams) {
    const replacementContactId = userReplaceDoc.fields?.replacement_contact_id;
    if (!replacementContactId) {
      throw new Error('The form for replacing a user must include a replacement_contact_id field ' +
        'containing the id of the new contact.');
    }

    const originalContactId = userReplaceDoc.contact?._id;

    const hasOriginalContactId = originalContact._id === originalContactId;
    const hasReplacedContactId = this.createUserForContactsService.isReplaced(originalContact) &&
      this.createUserForContactsService.getReplacedBy(originalContact) === originalContactId;
    if (!originalContactId || (!hasOriginalContactId && !hasReplacedContactId)) {
      throw new Error('Only the contact associated with the currently logged in user can be replaced.');
    }
    const newContact = await this.getNewContact(docs, replacementContactId);
    if (!newContact) {
      throw new Error(`The new contact could not be found [${replacementContactId}].`);
    }
    this.createUserForContactsService.setReplaced(originalContact, newContact, originalUserId);
    docs.push(originalContact);
    await this.setPrimaryContactForParent(newContact, originalContactId, docs);
  }

  private async setPrimaryContactForParent(newContact: ContactDoc, originalContactId: string, docs: Doc[]) {
    const parentPlace = await this.getParentDoc(newContact);
    if (parentPlace?.contact?._id === originalContactId) {
      parentPlace.contact = this.extractLineageService.extract(newContact);
      docs.push(parentPlace);
    }
  }

  private async getParentDoc(doc: ContactDoc) {
    if(!doc.parent?._id) {
      return;
    }

    return this.dbService
      .get()
      .get(doc.parent._id)
      .catch(err => {
        if (err.status === 404) {
          return;
        }
        throw err;
      }) as ContactDoc;
  }

  private async getNewContact(docs: Doc[], newContactId: string): Promise<ContactDoc> {
    const newContact = docs.find(doc => doc._id === newContactId);
    if (newContact) {
      return newContact as ContactDoc;
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

  private getReportDocsForContact(docs: Doc[], originalContactId: string) {
    return docs.filter(doc => {
      if(doc.type !== 'data_record') {
        return false;
      }
      return (<ReportDoc>doc).contact?._id === originalContactId;
    }) as ReportDoc[];
  }

  private reparentReports(docs: Doc[], originalContact: Doc) {
    const replacedById = this.createUserForContactsService.getReplacedBy(originalContact);
    if (!replacedById) {
      return;
    }
    this.getReportDocsForContact(docs, originalContact._id)
      .forEach(doc => doc.contact._id = replacedById);
  }
}

interface ReplaceUserParams {
  docs: Doc[];
  userReplaceDoc: UserReplaceDoc;
  originalContact: Doc;
  originalUserId: string;
}

interface UserReplaceDoc extends ReportDoc {
  fields: {
    replacement_contact_id: string;
  };
}

interface ReportDoc extends Doc {
  contact: {
    _id: string;
  };
}

interface ContactDoc extends ReportDoc {
  parent: {
    _id: string;
  };
}
