import { TestBed } from '@angular/core/testing';
import { SupervisorsComponent } from './supervisors.component';

describe('SupervisorsComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [SupervisorsComponent] }));

  it('should create', () => {
    const fixture = TestBed.createComponent(SupervisorsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
