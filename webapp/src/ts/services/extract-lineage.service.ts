import { Injectable } from '@angular/core';

import { UserSettingsService } from '@mm-services/user-settings.service';
import { UserContactService } from '@mm-services/user-contact.service';
import { AuthService } from '@mm-services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ExtractLineageService {

  constructor(
    private userSettingsService: UserSettingsService,
    private userContactService: UserContactService,
    private authService: AuthService,
  ) { }

  extract(contact) {
    if (!contact) {
      return contact;
    }

    const result: any = { _id: contact._id };
    let minified = result;

    while (contact.parent) {
      minified.parent = { _id: contact.parent._id };
      minified = minified.parent;
      contact = contact.parent;
    }

    return result;
  }

  async getUserLineageToRemove(): Promise<string | null> {
    if (this.authService.online(true)) {
      return null;
    }

    const { facility_id }:any = await this.userSettingsService.get();
    if (!facility_id || (Array.isArray(facility_id) && facility_id.length > 1)) {
      return null;
    }

    const user = await this.userContactService.get();
    return user?.parent?.name as string;
  }

  removeUserFacility(lineage: string[], userLineageLevel: string): string[] | undefined {
    if (!lineage?.length) {
      return;
    }

    lineage = lineage.filter(level => level);
    if (!userLineageLevel) {
      return lineage;
    }

    if (lineage[lineage.length - 1] === userLineageLevel) {
      lineage.pop();
    }

    return lineage;
  }
}
