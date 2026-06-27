import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { Livrable } from '../../core/models/livrable.model';
import { LivrableService } from '../../core/services/livrable.service';
import { LivrablesAdminComponent } from './livrables-admin.component';

describe('LivrablesAdminComponent', () => {
  let component: LivrablesAdminComponent;
  let fixture: ComponentFixture<LivrablesAdminComponent>;
  let service: jasmine.SpyObj<LivrableService>;

  const livrable: Livrable = {
    id: 1,
    sujetProjetId: 42,
    projetTitre: 'Plateforme IoT',
    typeLivrable: 'RAPPORT',
    nom: 'Rapport final',
    description: 'Desc',
    originalFileName: 'rapport.pdf',
    objectName: 'obj',
    contentType: 'application/pdf',
    size: 2048,
    lienExterne: null,
    deposantId: 7,
    deposantNom: 'Jean Dupont',
    dateDepot: new Date().toISOString(),
    actif: true,
  };

  beforeEach(async () => {
    service = jasmine.createSpyObj<LivrableService>('LivrableService', ['findAllAdmin', 'updateAdmin', 'deleteAdmin', 'downloadUrl']);
    service.findAllAdmin.and.returnValue(of([livrable]));
    service.updateAdmin.and.returnValue(of(livrable));
    service.deleteAdmin.and.returnValue(of(void 0));
    service.downloadUrl.and.returnValue('http://download');

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, LivrablesAdminComponent],
      providers: [{ provide: LivrableService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(LivrablesAdminComponent);
    component = fixture.componentInstance;
  });

  it('should load livrables on init and filter them', () => {
    component.ngOnInit();

    expect(service.findAllAdmin).toHaveBeenCalled();
    expect(component.filteredLivrables().length).toBe(1);

    component.selectedType.set('RAPPORT');
    expect(component.filteredLivrables().length).toBe(1);

    component.selectedType.set('DOCUMENTATION');
    expect(component.filteredLivrables().length).toBe(0);

    component.selectedType.set('');
    component.query.set('plateforme');
    expect(component.filteredLivrables().length).toBe(1);

    component.query.set('unknown');
    expect(component.filteredLivrables().length).toBe(0);
  });

  it('should open edit, validate and save the livrable', fakeAsync(() => {
    component.openEdit(livrable);
    expect(component.selectedLivrable()?.id).toBe(1);
    expect(component.editForm.nom).toBe('Rapport final');

    component.editForm.nom = '  Nouveau nom  ';
    component.editForm.description = '  Nouvelle desc  ';
    component.editForm.lienExterne = '  https://example.com  ';
    component.saveEdit();

    expect(service.updateAdmin).toHaveBeenCalledWith(1, jasmine.objectContaining({
      nom: 'Nouveau nom',
      description: 'Nouvelle desc',
      lienExterne: 'https://example.com',
      actif: true,
    }));

    tick(2500);
  }));

  it('should reject save when name is empty and support delete / helpers', () => {
    component.openEdit(livrable);
    component.editForm.nom = '   ';
    component.saveEdit();
    expect(component.error()).toBe('Le nom est obligatoire.');

    component.delete(livrable);
    expect(service.deleteAdmin).toHaveBeenCalledWith(1);

    expect(component.download(livrable)).toBe('http://download');
    expect(component.formatSize(null)).toBe('-');
    expect(component.formatSize(1024)).toBe('1 Ko');
    expect(component.formatSize(2 * 1024 * 1024)).toBe('2.0 Mo');
  });

  it('should expose an error when load fails', () => {
    service.findAllAdmin.and.returnValue(throwError(() => new Error('boom')));
    component.load();
    expect(component.error()).toBe('Impossible de charger les livrables.');
  });

  it('should expose update and delete errors', () => {
    component.openEdit(livrable);
    component.editForm.nom = 'Nouveau nom';
    service.updateAdmin.and.returnValue(throwError(() => ({ error: { detail: 'Nom invalide' } })));

    component.saveEdit();

    expect(component.error()).toBe('Nom invalide');

    service.updateAdmin.and.returnValue(throwError(() => new Error('boom')));
    component.saveEdit();
    expect(component.error()).toBe('Mise a jour impossible.');

    service.deleteAdmin.and.returnValue(throwError(() => new Error('boom')));
    component.delete(livrable);

    expect(component.error()).toBe('Suppression impossible.');
  });
});
