import { TestBed } from '@angular/core/testing';
import { TableauDeBord } from './tableau-de-bord';

describe('TableauDeBord', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [TableauDeBord] }));

  it('should create', () => {
    const fixture = TestBed.createComponent(TableauDeBord);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
