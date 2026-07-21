import { Component, Directive, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';

/** Renders the tooltip text inside the CDK overlay. */
@Component({
  selector: 'mm-mobile-tooltip',
  template: `<div class="mm-mobile-tooltip__content">{{ text }}</div>`,
})
export class MobileTooltipContentComponent {
  @Input() text = '';
}

/**
 * Touch / no-hover devices can't hover to reveal a native `title` tooltip, so elements with a title
 * are made focusable (tabindex="0") and their title is shown on focus. This directive (hosted on the
 * app root) renders that tooltip in a CDK overlay positioned with a flexible strategy, so it stays
 * within the viewport regardless of the trigger's position, the text length, or the direction
 * (LTR/RTL). It replaces the previous `[title]:focus::before` CSS tooltip, which grew from a fixed
 * edge and was clipped off-screen (and by ancestor `overflow`) in several contexts.
 *
 * Desktop is unaffected: the native `title` tooltip is used there, so this only runs on
 * touch / no-hover devices.
 */
@Directive({
  selector: '[mmMobileTooltip]',
})
export class MobileTooltipDirective implements OnInit, OnDestroy {
  private overlayRef: OverlayRef | null = null;
  private readonly focusIn = (event: FocusEvent) => this.show(event);
  private readonly focusOut = () => this.hide();

  constructor(
    private overlay: Overlay,
    @Inject(DOCUMENT) private document: Document,
  ) { }

  ngOnInit() {
    if (!this.isTouchDevice()) {
      return;
    }
    this.document.addEventListener('focusin', this.focusIn);
    this.document.addEventListener('focusout', this.focusOut);
  }

  ngOnDestroy() {
    this.document.removeEventListener('focusin', this.focusIn);
    this.document.removeEventListener('focusout', this.focusOut);
    this.hide();
  }

  private isTouchDevice(): boolean {
    return this.document.defaultView?.matchMedia('(hover: none), (pointer: coarse)').matches ?? false;
  }

  private show(event: FocusEvent) {
    const target = event.target as HTMLElement;
    const title = target?.getAttribute?.('title');
    if (!title) {
      return;
    }

    this.hide();

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(target)
      .withPush(true)
      .withPositions([
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
      ]);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      panelClass: 'mm-mobile-tooltip',
    });

    const componentRef = this.overlayRef.attach(new ComponentPortal(MobileTooltipContentComponent));
    componentRef.instance.text = title;
    componentRef.changeDetectorRef.detectChanges();
  }

  private hide() {
    this.overlayRef?.dispose();
    this.overlayRef = null;
  }
}
