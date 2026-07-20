import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogueLivrableService } from './catalogue-livrable.service';
import { LivrableCatalogue } from '../models/livrable-catalogue.model';

describe('CatalogueLivrableService', () => {
  let service: CatalogueLivrableService;
  let httpMock: HttpTestingController;

  const mockLivrable: LivrableCatalogue = {
    id: 1,
    projetId: 10,
    projetTitre: 'Projet Test',
    typeLivrable: 'RAPPORT',
    nom: 'Rapport',
    description: 'Description',
    originalFileName: 'rapport.pdf',
    objectName: 'obj/rapport.pdf',
    contentType: 'application/pdf',
    size: 1024,
    lienExterne: null,
    deposantId: 5,
    deposantNom: 'Dupont',
    dateDepot: '2026-01-15',
    actif: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CatalogueLivrableService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CatalogueLivrableService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('upload', () => {
    it('should upload a livrable with description', () => {
      const file = new File(['content'], 'rapport.pdf', { type: 'application/pdf' });

      service.upload(10, {
        typeLivrable: 'RAPPORT',
        nom: 'Rapport',
        description: 'Description',
        file,
      }).subscribe((result) => {
        expect(result).toEqual(mockLivrable);
      });

      const req = httpMock.expectOne('/api/projets-catalogue/10/livrables/upload');
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBeTrue();
      req.flush(mockLivrable);
    });

    it('should upload a livrable without description', () => {
      const file = new File(['content'], 'rapport.pdf', { type: 'application/pdf' });

      service.upload(10, {
        typeLivrable: 'RAPPORT',
        nom: 'Rapport',
        file,
      }).subscribe();

      const req = httpMock.expectOne('/api/projets-catalogue/10/livrables/upload');
      expect(req.request.method).toBe('POST');
      req.flush(mockLivrable);
    });
  });

  describe('addLink', () => {
    it('should post a livrable link', () => {
      const linkRequest = { typeLivrable: 'RAPPORT' as const, nom: 'Lien', lienExterne: 'https://example.com' };

      service.addLink(10, linkRequest).subscribe((result) => {
        expect(result).toEqual(mockLivrable);
      });

      const req = httpMock.expectOne('/api/projets-catalogue/10/livrables/link');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(linkRequest);
      req.flush(mockLivrable);
    });
  });

  describe('findByProjet', () => {
    it('should get livrables for a projet', () => {
      service.findByProjet(10).subscribe((result) => {
        expect(result).toEqual([mockLivrable]);
      });

      const req = httpMock.expectOne('/api/projets-catalogue/10/livrables');
      expect(req.request.method).toBe('GET');
      req.flush([mockLivrable]);
    });
  });

  describe('delete', () => {
    it('should delete a livrable by id', () => {
      service.delete(1).subscribe();

      const req = httpMock.expectOne('/api/livrables-catalogue/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('downloadUrl', () => {
    it('should return the download URL', () => {
      expect(service.downloadUrl(5)).toBe('/api/livrables-catalogue/5/download');
    });
  });

  describe('downloadPublishedUrl', () => {
    it('should return URL without fromSujet by default', () => {
      expect(service.downloadPublishedUrl(10, 5)).toBe('/api/catalogue/10/livrables/5/download');
    });

    it('should return URL with fromSujet=true when true', () => {
      expect(service.downloadPublishedUrl(10, 5, true)).toBe('/api/catalogue/10/livrables/5/download?fromSujet=true');
    });

    it('should return URL without query when fromSujet is false', () => {
      expect(service.downloadPublishedUrl(10, 5, false)).toBe('/api/catalogue/10/livrables/5/download');
    });
  });

  describe('findPublishedByProjet', () => {
    it('should get published livrables for a projet', () => {
      service.findPublishedByProjet(10).subscribe((result) => {
        expect(result).toEqual([mockLivrable]);
      });

      const req = httpMock.expectOne('/api/catalogue/10/livrables');
      expect(req.request.method).toBe('GET');
      req.flush([mockLivrable]);
    });
  });
});