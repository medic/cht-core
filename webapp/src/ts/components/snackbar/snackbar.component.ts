import { Component, OnInit } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Selectors } from '../../selectors';
import { GlobalActions } from '../../actions/global';

@Component({
  selector: 'snackbar',
  templateUrl: './snackbar.component.html'
})
export class SnackbarComponent implements OnInit {
  private readonly SHOW_DURATION = 5000;
  private readonly ANIMATION_DURATION = 250;

  private globalActions;
  private timer;

  content;
  active = false;

  constructor(private store: Store) {
    this.globalActions = new GlobalActions(store);
    store.pipe(select(Selectors.getSnackbarContent)).subscribe(content => {
      if (!content) {
        return;
      }

      if (this.timer) {
        this.hide();
        setTimeout(() => this.show(content), this.ANIMATION_DURATION)
        return;
      }

      this.show(content);
    });
  }

  ngOnInit() {
    this.hide();
  }

  // todo refresh timeout when new show action happens

  private show(content) {
    console.log(content);
    this.content = content;
    this.active = true;

    this.timer = setTimeout(() => this.hide(), this.SHOW_DURATION);
  }

  private hide() {
    this.globalActions.setSnackbarContent();
    this.active = false;
  }
}
