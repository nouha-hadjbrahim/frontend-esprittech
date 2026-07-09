import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SubjectsComponent } from './subjects.component';
import { environment } from '../../../environments/environment';

describe('SubjectsComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SubjectsComponent, HttpClientTestingModule],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    const fixture = TestBed.createComponent(SubjectsComponent);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/admin/sujet-projets?page=0&size=8`).flush({
      content: [],
      page: 0,
      size: 8,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    });
    httpMock.expectOne(`${environment.apiUrl}/admin/sujet-projets/demandes?page=0&size=1`).flush({
      content: [],
      page: 0,
      size: 1,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    });

    const flushMatching = (urlPart: string) => {
      httpMock.match((req) => req.url.includes(urlPart)).forEach((req) => req.flush({
        content: [],
        page: 0,
        size: 1000,
        totalElements: 0,
        totalPages: 0,
        first: true,
        last: true,
      }));
    };
    flushMatching('/sujet-projets/admin/references/technologies');
    flushMatching('/sujet-projets/admin/references/domaines');
    flushMatching('/sujet-projets/admin/references/prerequis');

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should map distinct badge classes for type and status', () => {
    const fixture = TestBed.createComponent(SubjectsComponent);
    const component = fixture.componentInstance;

    expect(component.getCategorieClass('PFE')).toBe('badge--pfe');
    expect(component.getCategorieClass('STAGE_INGENIEUR')).toBe('badge--stage');
    expect(component.getCategorieClass('RDI')).toBe('badge--rdi');
    expect(component.getStatutClass('VALIDE')).toBe('badge--statut-valide');
    expect(component.getStatutClass('REALISATION_EN_COURS')).toBe('badge--statut-realisation');
  });
});
