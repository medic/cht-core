import { Component, Directive, Inject, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Direction } from '@angular/cdk/bidi';

/** Renders the tooltip text inside the CDK overlay. */
@Component({
  selector: 'mm-mobile-tooltip',
  template: `<div class="mm-mobile-tooltip__content">{{ text }}</div>`,
})
export class MobileTooltipContentComponent {
  @Input() text = '';
}

// Anchor at the start edge (grow toward the end), falling back to the end edge; each above the
// trigger then below. `withPush` keeps whichever is chosen inside the viewport.
const POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
];

/**
 * Touch / no-hover devices can't hover to reveal a native `title` tooltip, so elements with a title
 * are made focusable (tabindex="0") and their title is shown on focus. This directive (hosted on the
 * app root) renders that tooltip in a CDK overlay positioned with a flexible strategy, so it stays
 * within the viewport regardless of the trigger's position, the text length, or the direction
 * (LTR/RTL). It replaces the previous `[title]:focus::before` CSS tooltip, which grew from a fixed
 * edge and was clipped off-screen (and by ancestor `overflow`) in several contexts.
 *
 * Hover-capable devices are unaffected: the native `title` tooltip is used there, so this only
 * shows on no-hover devices.
 */
@Directive({
  selector: '[mmMobileTooltip]',
})
export class MobileTooltipDirective implements OnInit, OnDestroy {
  private overlayRef: OverlayRef | null = null;
  private removalObserver: MutationObserver | null = null;
  private visibilityObserver: IntersectionObserver | null = null;
  private noHoverQuery: MediaQueryList | null = null;
  private readonly focusIn = (event: FocusEvent) => this.show(event);
  private readonly dismiss = () => this.hide();

  constructor(
    private readonly overlay: Overlay,
    private readonly zone: NgZone,
    @Inject(DOCUMENT) private readonly document: Document,
  ) { }

  ngOnInit() {
    // `hover: none` alone, NOT `pointer: coarse`: a device that can hover shows the native `title`
    // tooltip, so rendering this overlay as well displays two tooltips at once (click + hover) —
    // touchscreen laptops, for instance, can match `pointer: coarse` while the mouse still hovers.
    // The overlay is only warranted where hovering is impossible.
    this.noHoverQuery = this.document.defaultView?.matchMedia('(hover: none)') ?? null;
    // Outside the Angular zone: these fire on every focus/scroll on the page and must not trigger
    // app-wide change detection. The overlay's content is rendered with a manual detectChanges().
    this.zone.runOutsideAngular(() => {
      this.document.addEventListener('focusin', this.focusIn);
      this.document.addEventListener('focusout', this.dismiss);
      // Capture phase so scrolls in plain CSS `overflow` containers (which the CDK ScrollDispatcher
      // doesn't observe) still dismiss the tooltip instead of leaving it floating.
      this.document.addEventListener('scroll', this.dismiss, true);
    });
  }

  ngOnDestroy() {
    this.document.removeEventListener('focusin', this.focusIn);
    this.document.removeEventListener('focusout', this.dismiss);
    this.document.removeEventListener('scroll', this.dismiss, true);
    this.hide();
  }

  private show(event: FocusEvent) {
    // Always clear any existing tooltip first — even when focus lands on a title-less element — so a
    // previous one can't be left behind.
    this.hide();

    // Checked live on every focus rather than once at startup, so input-capability changes
    // (DevTools device emulation toggled, a convertible docking/undocking) apply without a reload.
    if (!this.noHoverQuery?.matches) {
      return;
    }

    const target = event.target as HTMLElement;
    const title = target?.getAttribute?.('title');
    if (!title) {
      return;
    }

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(target)
      .withPush(true)
      .withPositions(POSITIONS);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      // Dismiss on scroll rather than reposition — a transient tooltip shouldn't chase the page.
      scrollStrategy: this.overlay.scrollStrategies.close(),
      // Resolve direction from the trigger so `start`/`end` and bidi text are correct in RTL; the
      // overlay lives on <body>, outside the app's `[dir]` subtree, so it can't inherit it.
      direction: (this.document.defaultView?.getComputedStyle(target).direction as Direction) || 'ltr',
      panelClass: 'mm-mobile-tooltip',
    });

    const componentRef = this.overlayRef.attach(new ComponentPortal(MobileTooltipContentComponent));
    componentRef.instance.text = title;
    componentRef.changeDetectorRef.detectChanges();

    // Browsers don't fire `focusout` when a focused element is detached (e.g. the sidebar last-sync
    // span re-rendering on a sync update, or list rows refreshing on the changes feed) — focus
    // silently resets to <body>. Watch for the trigger leaving the DOM and dismiss, so the tooltip
    // can't be stranded on a detached node.
    this.removalObserver = new MutationObserver(() => {
      if (!target.isConnected) {
        this.hide();
      }
    });
    this.removalObserver.observe(this.document.body, { childList: true, subtree: true });

    // The trigger can also stop being visible without leaving the DOM, gaining a focusout, or
    // scrolling: on single-pane (mobile) layouts, tapping a list-row date opens the report and
    // slides the still-focused list off-screen (`.show-content .left-pane { left: -100% }`), which
    // would leave the tooltip hovering over the report. Dismiss when the trigger leaves the
    // viewport. On two-pane layouts the list — and the tooltip — correctly stay put, which is why
    // this watches visibility instead of router navigation events: every list-row tap navigates
    // (or is skipped as a same-URL navigation), visible trigger or not.
    this.visibilityObserver = new IntersectionObserver((entries) => {
      if (entries.some(entry => !entry.isIntersecting)) {
        this.hide();
      }
    });
    this.visibilityObserver.observe(target);
  }

  private hide() {
    this.removalObserver?.disconnect();
    this.removalObserver = null;
    this.visibilityObserver?.disconnect();
    this.visibilityObserver = null;
    this.overlayRef?.dispose();
    this.overlayRef = null;
  }
}
