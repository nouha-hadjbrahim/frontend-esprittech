import { TestBed } from '@angular/core/testing';
import { EquipesRecherche } from './equipes-recherche';

describe('EquipesRecherche', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [EquipesRecherche] }));

  it('should create', () => {
    const fixture = TestBed.createComponent(EquipesRecherche);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
