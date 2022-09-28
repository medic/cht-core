import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { Transition, Doc } from '@mm-services/transitions/transition';
import { CreateUserForContactsService } from '@mm-services/create-user-for-contacts.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';

@Injectable({
  providedIn: 'root'
})
export class CreateUserForContactsTransition extends Transition {
  constructor(
    private dbService: DbService,
    private createUserForContactsService: CreateUserForContactsService,
    private extractLineageService:ExtractLineageService,
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
    return !!docs.filter(doc => doc.type === 'data_record').length;
  }

  /**
   * @param {Array<Doc>} docs - docs to run the transition over
   * @returns {Promise<Array<Doc>>} - updated docs (may include additional docs)
   */
  async run(docs: Doc[]) {
    const originalContact = await this.createUserForContactsService.getUserContact();
    if (!originalContact) {
      return docs;
    }

    if (this.createUserForContactsService.isReplaced(originalContact)) {
      this.reparentReports(docs, originalContact);
    }
    const userReplaceDoc = this.getUserReplaceDoc(docs);
    if (userReplaceDoc) {
      return this.replaceUser(docs, userReplaceDoc, originalContact);
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
    return docs.find(doc => this.replaceForms.includes(doc.form)) as UserReplaceDoc;
  }

  private async replaceUser(docs: Doc[], userReplaceDoc: UserReplaceDoc, originalContact: Doc) {
    const { new_contact_uuid } = userReplaceDoc.fields;
    const originalContactId = userReplaceDoc.contact._id;

    const isOriginalContact = () => originalContact._id === originalContactId;
    const isReplacedContact = () => this.createUserForContactsService.isReplaced(originalContact) &&
      this.createUserForContactsService.getReplacedBy(originalContact) === originalContactId;
    if (!isOriginalContact() && !isReplacedContact()) {
      throw new Error('Only the contact associated with the currently logged in user can be replaced.');
    }
    const newContact = await this.getNewContact(docs, new_contact_uuid);
    if (!newContact) {
      throw new Error(`The new contact could not be found [${new_contact_uuid}].`);
    }
    this.createUserForContactsService.setReplaced(originalContact, newContact);
    const updatedDocs = [...docs, originalContact];

    const parentPlace = await this.getParentDoc(newContact);
    if (parentPlace?.contact?._id === originalContactId) {
      parentPlace.contact = this.extractLineageService.extract(newContact);
      updatedDocs.push(parentPlace);
    }

    return updatedDocs;
  }

  private async getParentDoc(doc: ContactDoc) {
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

  private getReportDocs(docs: Doc[]) {
    return docs
      .filter(doc => doc.type === 'data_record')
      .filter(doc => doc.contact) as ReportDoc[];
  }

  private reparentReports(docs: Doc[], originalContact: Doc) {
    const replacedById = this.createUserForContactsService.getReplacedBy(originalContact);
    if (!replacedById) {
      return;
    }
    this.getReportDocs(docs)
      .filter(doc => doc.contact._id === originalContact._id)
      .forEach(doc => doc.contact._id = replacedById);
  }
}

interface UserReplaceDoc extends ReportDoc {
  fields: {
    new_contact_uuid: string;
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
