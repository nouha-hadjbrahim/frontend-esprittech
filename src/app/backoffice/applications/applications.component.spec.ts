import { TestBed } from '@angular/core/testing';
import { ApplicationsComponent } from './applications.component';

describe('ApplicationsComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ApplicationsComponent] }));

  it('should create', () => {
    const fixture = TestBed.createComponent(ApplicationsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
