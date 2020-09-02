import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

const errors = {
  403: {
    title: 'error.403.title',
    description: 'error.403.description'
  },
  404: {
    title: 'error.404.title',
    description: 'error.404.description'
  }
};

@Component({
  templateUrl: './error.component.html'
})
export class ErrorComponent implements OnInit {
  error;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.error = errors[this.route.snapshot.params.code] || errors['404'];
  }
}
