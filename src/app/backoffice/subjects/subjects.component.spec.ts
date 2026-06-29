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
    httpMock.expectOne(`${environment.apiUrl}/sujet-projets/technologies`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/sujet-projets/suggestions/domaines`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/sujet-projets/suggestions/prerequis`).flush([]);

    expect(fixture.componentInstance).toBeTruthy();
  });
});
