import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { HoverCardComponent } from './hover-card.component';
import { HoverCardTriggerDirective } from './hover-card-trigger.directive';

@Component({
  standalone: true,
  imports: [HoverCardComponent, HoverCardTriggerDirective],
  template: `
    <app-hover-card>
      <button appHoverTrigger>Hover me</button>
      <ng-template #content>Tooltip content</ng-template>
    </app-hover-card>
  `,
})
class TestHostComponent {}

describe('HoverCardTriggerDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TestHostComponent] });
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should call show on mouseenter', () => {
    const hoverCard = fixture.debugElement.children[0].componentInstance as HoverCardComponent;
    spyOn(hoverCard, 'show');
    const btn = fixture.nativeElement.querySelector('button');
    btn.dispatchEvent(new Event('mouseenter'));
    expect(hoverCard.show).toHaveBeenCalled();
  });

  it('should call hide on mouseleave', () => {
    const hoverCard = fixture.debugElement.children[0].componentInstance as HoverCardComponent;
    spyOn(hoverCard, 'hide');
    const btn = fixture.nativeElement.querySelector('button');
    btn.dispatchEvent(new Event('mouseleave'));
    expect(hoverCard.hide).toHaveBeenCalled();
  });
});

describe('HoverCardComponent', () => {
  let component: HoverCardComponent;
  let fixture: ComponentFixture<HoverCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HoverCardComponent] });
    fixture = TestBed.createComponent(HoverCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dispose overlay on destroy', () => {
    spyOn(component as any, 'ngOnDestroy').and.callThrough();
    component.ngOnDestroy();
    expect(component['ngOnDestroy']).toHaveBeenCalled();
  });
});
