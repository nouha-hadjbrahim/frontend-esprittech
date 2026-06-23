import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Equipe } from '../../core/models/equipe.model';
import { User } from '../../core/models/user.model';
import { AdminService } from '../../core/services/admin.service';
import { EquipeService } from '../../core/services/equipe.service';
import { ResearchTeamsComponent } from './research-teams.component';

const CHEF = { prenom: 'Jean', nom: 'Dupont' } as User;

function equipe(over: Partial<Equipe> = {}): Equipe {
  return { id: 1, nom: 'Alpha', description: 'desc', chef: CHEF, nbMembres: 3, createdAt: '2025-02-01T00:00:00Z', ...over };
}

describe('ResearchTeamsComponent', () => {
  let component: ResearchTeamsComponent;
  let equipeService: jasmine.SpyObj<EquipeService>;
  let adminService: jasmine.SpyObj<AdminService>;

  beforeEach(() => {
    equipeService = jasmine.createSpyObj<EquipeService>('EquipeService', ['getAll']);
    adminService = jasmine.createSpyObj<AdminService>('AdminService', ['createEquipe']);
    equipeService.getAll.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [ResearchTeamsComponent],
      providers: [
        { provide: EquipeService, useValue: equipeService },
        { provide: AdminService, useValue: adminService },
      ],
    });
    component = TestBed.createComponent(ResearchTeamsComponent).componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load teams on init', () => {
    equipeService.getAll.and.returnValue(of([equipe()]));
    component.ngOnInit();
    expect(equipeService.getAll).toHaveBeenCalled();
    expect(component.teams().length).toBe(1);
  });

  it('should load teams and compute stats', () => {
    equipeService.getAll.and.returnValue(of([
      equipe(),
      equipe({ id: 2, nom: 'Beta', chef: null, description: null, nbMembres: 0, createdAt: '' }),
    ]));
    component.loadTeams();

    const teams = component.teams();
    expect(teams.length).toBe(2);
    expect(teams[0].lead).toBe('Jean Dupont');
    expect(teams[0].status).toBe('Active');
    expect(teams[1].lead).toBe('Aucun chef désigné');
    expect(teams[1].description).toBe('—');
    expect(teams[1].created).toBe('—');
    expect(teams[1].status).toBe('Inactive');

    const stats = component.stats();
    expect(stats[0].count).toBe(2); // équipes
    expect(stats[1].count).toBe(3); // membres
    expect(stats[2].count).toBe(1); // chefs désignés
  });

  it('should set a load error on failure', () => {
    equipeService.getAll.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.loadTeams();
    expect(component.loadError()).toContain('Impossible de charger');
  });

  it('should open, close and reset the modal', () => {
    component.openModal();
    expect(component.isModalOpen).toBeTrue();
    component.newTeam = { nom: 'X', description: 'Y', chefId: 5 };
    component.closeModal();
    expect(component.isModalOpen).toBeFalse();
    expect(component.newTeam).toEqual({ nom: '', description: '', chefId: null });
  });

  it('should not create a team without a name or a chef', () => {
    component.newTeam = { nom: '', description: '', chefId: null };
    component.createTeam();
    expect(adminService.createEquipe).not.toHaveBeenCalled();
  });

  it('should create a team and reload', () => {
    component.newTeam = { nom: 'Gamma', description: '', chefId: 7 };
    adminService.createEquipe.and.returnValue(of(equipe()));
    component.createTeam();
    expect(adminService.createEquipe).toHaveBeenCalledWith({ nom: 'Gamma', description: undefined, chefId: 7 });
    expect(component.isModalOpen).toBeFalse();
  });

  it('should pass the description when provided', () => {
    component.newTeam = { nom: 'Gamma', description: 'Research', chefId: 7 };
    adminService.createEquipe.and.returnValue(of(equipe()));
    component.createTeam();
    expect(adminService.createEquipe).toHaveBeenCalledWith({ nom: 'Gamma', description: 'Research', chefId: 7 });
  });

  it('should show a create error on failure', () => {
    component.newTeam = { nom: 'Gamma', description: '', chefId: 7 };
    adminService.createEquipe.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.createTeam();
    expect(component.createError()).toContain('création de l\'équipe');
  });
});
