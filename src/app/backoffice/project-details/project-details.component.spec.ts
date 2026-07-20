import { ProjectDetailsComponent } from './project-details.component';

describe('ProjectDetailsComponent', () => {
  let component: ProjectDetailsComponent;

  beforeEach(() => {
    component = new ProjectDetailsComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have project data', () => {
    expect(component.project).toBeTruthy();
    expect(component.project.title).toBe('Énergie renouvelable — micro-grid campus');
    expect(component.project.type).toBe('PFE');
    expect(component.project.status).toBe('Validé');
    expect(component.project.supervisor).toBe('Dr. Frikha Anis');
    expect(component.project.score).toBe(80);
  });

  it('should initialize activeTab to Informations', () => {
    expect(component.activeTab).toBe('Informations');
  });

  it('should have all tabs', () => {
    expect(component.tabs).toEqual([
      'Informations',
      'Candidatures (0)',
      'Livrables',
      'Progression',
      'Historique',
      'Commentaires',
    ]);
  });

  it('should setActiveTab', () => {
    component.setActiveTab('Livrables');
    expect(component.activeTab).toBe('Livrables');
  });

  it('should change activeTab multiple times', () => {
    component.setActiveTab('Historique');
    expect(component.activeTab).toBe('Historique');

    component.setActiveTab('Commentaires');
    expect(component.activeTab).toBe('Commentaires');

    component.setActiveTab('Informations');
    expect(component.activeTab).toBe('Informations');
  });

  it('should have technologies array', () => {
    expect(component.project.technologies.length).toBe(2);
    expect(component.project.technologies[0].name).toBe('Matlab');
    expect(component.project.technologies[1].name).toBe('Simulink');
  });

  it('should have prerequisites and keywords', () => {
    expect(component.project.prerequisites).toEqual(['4GE']);
    expect(component.project.keywords).toEqual(['Énergie', 'Smart Grid']);
  });
});
