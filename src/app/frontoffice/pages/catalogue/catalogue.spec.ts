import { TestBed } from '@angular/core/testing';
import { Catalogue } from './catalogue';

describe('Catalogue', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Catalogue] }));

  it('should create', () => {
    const fixture = TestBed.createComponent(Catalogue);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
