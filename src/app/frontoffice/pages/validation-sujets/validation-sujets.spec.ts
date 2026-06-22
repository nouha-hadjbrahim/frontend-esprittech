import { TestBed } from '@angular/core/testing';
import { ValidationSujets } from './validation-sujets';

describe('ValidationSujets', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ValidationSujets] }));

  it('should create', () => {
    const fixture = TestBed.createComponent(ValidationSujets);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
