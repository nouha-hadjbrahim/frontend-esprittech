import { TestBed } from '@angular/core/testing';
import { MesCandidatures } from './mes-candidatures';

describe('MesCandidatures', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [MesCandidatures] }));

  it('should create', () => {
    const fixture = TestBed.createComponent(MesCandidatures);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
