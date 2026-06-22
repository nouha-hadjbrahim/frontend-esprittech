import { TestBed } from '@angular/core/testing';
import { SubjectsComponent } from './subjects.component';

describe('SubjectsComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [SubjectsComponent] }));

  it('should create', () => {
    const fixture = TestBed.createComponent(SubjectsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
