import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HistoriqueService } from '../../core/services/historique.service';
import { HistoryComponent } from './history.component';

describe('HistoryComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [HistoryComponent],
    providers: [
      {
        provide: HistoriqueService,
        useValue: {
          search: jasmine.createSpy('search').and.returnValue(of({
            content: [],
            totalElements: 0,
            totalPages: 0,
            size: 100,
            number: 0,
            first: true,
            last: true,
            empty: true,
          })),
        },
      },
    ],
  }));

  it('should create', () => {
    const fixture = TestBed.createComponent(HistoryComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
