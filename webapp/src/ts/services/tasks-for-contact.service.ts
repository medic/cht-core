import { Injectable } from '@angular/core';

import { ContactTypesService } from '@mm-services/contact-types.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';

@Injectable({
  providedIn: 'root'
})
export class TasksForContactService {
  private leafPlaceTypes$;

  constructor(
    private contactTypesService:ContactTypesService,
    private rulesEngineService:RulesEngineService,
    private lineageModelGeneratorService:LineageModelGeneratorService,
  ) {
    this.leafPlaceTypes$ = this.contactTypesService.getLeafPlaceTypes();
  }

  getIdsForTasks(model) {
    const contactIds: string[] = [];
    if (!model?.type?.person && model?.children) {
      model.children.forEach(child => {
        if (child?.type?.person && child?.contacts?.length) {
          contactIds.push(...child.contacts.map(contact => contact.id));
        }
      });
    }
    contactIds.push(model.doc._id);
    return contactIds;
  }

  private areTasksEnabled(type) {
    if (!type) {
      return Promise.resolve(false);
    }

    return this.rulesEngineService
      .isEnabled()
      .then(isRulesEngineEnabled => {
        if (!isRulesEngineEnabled) {
          return false;
        }

        // must be either a person type
        if (type.person) {
          return true;
        }

        // ... or a leaf place type
        return this.isLeafPlaceType(type);
      });
  }

  private isLeafPlaceType(type) {
    return this
      .leafPlaceTypes$
      .then(leafPlaceTypes => this.contactTypesService.isLeafPlaceType(leafPlaceTypes, type.id));
  }

  async get(model) {
    const enabled = await this.areTasksEnabled(model.type);
    if (!enabled) {
      return [];
    }

    const contactIds = this.getIdsForTasks(model);
    const tasks = await this.rulesEngineService.fetchTaskDocsFor(contactIds);
    return tasks.sort((a, b) => a.emission.dueDate < b.emission.dueDate ? -1 : 1);
  }

  async getTasksBreakdown(model, contactIds) {
    const enabled = await this.areTasksEnabled(model.type);
    if (!enabled) {
      return;
    }
    return this.rulesEngineService.fetchTasksBreakdown(contactIds);
  }

  async getLeafPlaceAncestor(contactId) {
    if (!contactId) {
      return false;
    }

    const { doc, lineage } = await this.lineageModelGeneratorService.contact(contactId, { hydrate: false });
    if (!doc || !lineage) {
      return false;
    }

    const leafPlaceTypes = await this.leafPlaceTypes$;
    const leafPlace = [doc, ...lineage].find(contact => {
      const typeId = this.contactTypesService.getTypeId(contact);
      return this.contactTypesService.isLeafPlaceType(leafPlaceTypes, typeId);
    });

    if (!leafPlace) {
      return false;
    }

    const typeId = this.contactTypesService.getTypeId(leafPlace);
    const type = this.contactTypesService.getTypeById(leafPlaceTypes, typeId);
    return { doc: leafPlace, type };
  }
}
