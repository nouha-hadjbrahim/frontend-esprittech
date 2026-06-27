import {
  Component, Input, ContentChild, TemplateRef, ViewContainerRef,
  OnInit, OnDestroy, inject, EmbeddedViewRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

@Component({
  selector: 'app-hover-card',
  standalone: true,
  imports: [CommonModule, OverlayModule],
  template: `
    <ng-content select="[appHoverTrigger]"></ng-content>
  `,
  styles: [`
    :host { display: inline-block; }
  `]
})
export class HoverCardComponent implements OnInit, OnDestroy {
  @Input() sideOffset = 4;
  @ContentChild('content') content!: TemplateRef<any>;

  private readonly overlay = inject(Overlay);
  private readonly vcr = inject(ViewContainerRef);
  private overlayRef: OverlayRef | null = null;
  private isOpen = false;
  private hideTimeout: any;
  private showTimeout: any;

  ngOnInit() {
    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().flexibleConnectedTo(this.vcr.element)
        .withPositions([
          { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: this.sideOffset },
          { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: -this.sideOffset },
        ]),
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      disposeOnNavigation: true,
    });
  }

  show() {
    clearTimeout(this.hideTimeout);
    this.showTimeout = setTimeout(() => {
      if (this.overlayRef && this.content && !this.isOpen) {
        const portal = new TemplatePortal(this.content, this.vcr);
        this.overlayRef.attach(portal);
        this.isOpen = true;
      }
    }, 300);
  }

  hide() {
    clearTimeout(this.showTimeout);
    this.hideTimeout = setTimeout(() => {
      if (this.overlayRef && this.isOpen) {
        this.overlayRef.detach();
        this.isOpen = false;
      }
    }, 150);
  }

  ngOnDestroy() {
    this.overlayRef?.dispose();
    clearTimeout(this.showTimeout);
    clearTimeout(this.hideTimeout);
  }
}
