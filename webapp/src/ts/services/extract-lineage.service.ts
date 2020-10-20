import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ExtractLineageService {

  constructor() { }

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
}
