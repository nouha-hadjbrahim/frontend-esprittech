import { TestBed } from '@angular/core/testing';
import { HistoryComponent } from './history.component';

describe('HistoryComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [HistoryComponent] }));

  it('should create', () => {
    const fixture = TestBed.createComponent(HistoryComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
