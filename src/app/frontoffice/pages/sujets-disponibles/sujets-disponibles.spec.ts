import { TestBed } from '@angular/core/testing';
import { SujetsDisponibles } from './sujets-disponibles';

describe('SujetsDisponibles', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [SujetsDisponibles] }));

  it('should create', () => {
    const fixture = TestBed.createComponent(SujetsDisponibles);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
