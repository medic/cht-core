import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@mm-services/translate.service';

const errors = {
  403: {
    title: 'error.403.title',
    description: 'error.403.description'
  },
  404: {
    title: 'error.404.title',
    description: 'error.404.description'
  },
  418: {
    title: 'error.418.description',
    description: 'error.418.description'
  },
};

@Component({
  templateUrl: './error.component.html'
})
export class ErrorComponent implements OnInit {
  error;
  translationsLoaded;

  constructor(private route: ActivatedRoute, private translateService:TranslateService,) {}

  ngOnInit() {
    this.error = errors[this.route.snapshot.params.code] || errors['404'];
    this.translationsLoaded = this.translateService.instant('error.403.description') !== 'error.403.description';
  }
}
