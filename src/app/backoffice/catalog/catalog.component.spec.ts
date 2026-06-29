import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CatalogComponent } from './catalog.component';

describe('CatalogComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [CatalogComponent], providers: [provideRouter([])] }));

  it('should create', () => {
    const fixture = TestBed.createComponent(CatalogComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
