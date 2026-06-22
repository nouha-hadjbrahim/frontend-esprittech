import { TestBed } from '@angular/core/testing';
import { MesProjets } from './mes-projets';

describe('MesProjets', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [MesProjets] }));

  it('should create', () => {
    const fixture = TestBed.createComponent(MesProjets);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
