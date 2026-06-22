import { TestBed } from '@angular/core/testing';
import { DemandesIndustrialisation } from './demandes-industrialisation';

describe('DemandesIndustrialisation', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [DemandesIndustrialisation] }));

  it('should create', () => {
    const fixture = TestBed.createComponent(DemandesIndustrialisation);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
