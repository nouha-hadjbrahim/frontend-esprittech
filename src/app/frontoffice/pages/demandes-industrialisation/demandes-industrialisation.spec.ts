import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { IndustrialisationService } from '../../../core/services/industrialisation.service';
import { DemandesIndustrialisation } from './demandes-industrialisation';

describe('DemandesIndustrialisation', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [DemandesIndustrialisation],
      providers: [
        { provide: AuthService, useValue: { getRole: () => 'ROLE_ENSEIGNANT' } },
        { provide: IndustrialisationService, useValue: { mesDemandes: () => of([]) } },
      ],
    })
  );

  it('should create', () => {
    const fixture = TestBed.createComponent(DemandesIndustrialisation);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
