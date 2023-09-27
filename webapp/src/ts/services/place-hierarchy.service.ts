import { Injectable } from '@angular/core';

import { ContactTypesService } from '@mm-services/contact-types.service';
import { SettingsService } from '@mm-services/settings.service';
import { ContactsService } from '@mm-services/contacts.service';
import { DbService } from '@mm-services/db.service';


@Injectable({
  providedIn: 'root'
})
export class PlaceHierarchyService {
  constructor(
    private contactTypesService:ContactTypesService,
    private settingsService:SettingsService,
    private contactsService:ContactsService,
    private dbService:DbService,
  ) {
  }

  private getIdLineage(place) {
    const path: any[] = [];
    while(place && place._id) {
      path.splice(0, 0, place._id);
      place = place.parent;
    }
    return path;
  }

  private addLineageToHierarchy(placeToSort, lineage, children) {
    lineage.forEach(function(idInLineage) {
      let node = children.find(child => child.doc._id === idInLineage);

      if (!node) {
        node = { doc: { _id: idInLineage, stub: true }, children: []};
        children.push(node);
      }

      if (idInLineage === placeToSort._id) {
        // Replace stub by real doc.
        node.doc = placeToSort;
      }

      children = node.children;
    });
  }

  // For restricted users. Hoist the highest place they have access to, to the
  // top of the tree.
  private firstNonStubNode(children) {
    // Only hoist if there is one child. This will be the case for CHWs. There
    // may be situations where the first child is a stub but there are more
    // children, in which case we want to expose that in the UI.
    if (children.length === 1 && children[0].doc.stub) {
      return this.firstNonStubNode(children[0].children);
    } else {
      return children;
    }
  }

  private buildHierarchy(places) {
    const hierarchy = [];
    places.forEach((placeToSort) => {
      this.addLineageToHierarchy(placeToSort, this.getIdLineage(placeToSort), hierarchy);
    });
    return this.firstNonStubNode(hierarchy);
  }

  private getContacts() {
    return this.settingsService
      .get()
      .then((settings:any) => {
        if (settings.place_hierarchy_types) {
          return settings.place_hierarchy_types;
        }
        // Exclude people and clinics (the lowest level)
        // for performance reasons
        return this.contactTypesService
          .getPlaceTypes()
          .then(types => {
            const ids: any[] = [];
            types.forEach(type => {
              if (type.parents) {
                ids.push(...type.parents);
              }
            });
            return ids;
          });
      })
      .then(types => this.contactsService.get(types));
  }

  /**
  * @name PlaceHierarchy
  * @description Returns a Promise to return all places excluding
    *  the leaf types, in a hierarchy tree.
    *   E.g.
    *    [
  *      { doc: c, children: [{ doc: b, children: [] }] },
  *      { doc: f, children: [] }
  *    ]
  */
  get() {
    return this.getContacts().then(places => this.buildHierarchy(places));
  }

  async getDescendants(id, onlyPlaces = false) {
    const results = await this.dbService
      .get()
      .query('medic-client/contacts_by_place', { key: [ id ], include_docs: true });

    if (!onlyPlaces) {
      return results.rows;
    }

    const settings = await this.settingsService.get();
    return results.rows.filter(contact => settings.place_hierarchy_types?.includes(contact.doc.type));
  }
}
