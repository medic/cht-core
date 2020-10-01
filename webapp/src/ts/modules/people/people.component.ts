import { Component, OnInit } from '@angular/core';

@Component({
  templateUrl: './people.component.html'
})
export class PeopleComponent implements OnInit{
  loading = false;
  error;
  appending;
  filtered = false;
  hasContacts = true;
  constructor() {}

  ngOnInit() {}
}
