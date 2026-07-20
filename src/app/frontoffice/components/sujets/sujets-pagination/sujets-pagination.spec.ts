import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SujetsPagination } from './sujets-pagination';

describe('SujetsPagination', () => {
  let component: SujetsPagination;
  let fixture: ComponentFixture<SujetsPagination>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SujetsPagination],
    }).compileComponents();

    fixture = TestBed.createComponent(SujetsPagination);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return visiblePages for small total (<=7)', () => {
    component.totalPages = 5;
    component.currentPage = 1;
    expect(component.visiblePages).toEqual([1, 2, 3, 4, 5]);
  });

  it('should return visiblePages with ellipsis when total > 7', () => {
    component.totalPages = 20;
    component.currentPage = 10;
    const pages = component.visiblePages;
    expect(pages[0]).toBe(1);
    expect(pages[pages.length - 1]).toBe(20);
    expect(pages).toContain('ellipsis');
  });

  it('should return visiblePages near start when current is 1 with total > 7', () => {
    component.totalPages = 20;
    component.currentPage = 1;
    const pages = component.visiblePages;
    expect(pages[0]).toBe(1);
    expect(pages).toContain(2);
    expect(pages).toContain('ellipsis');
    expect(pages).toContain(20);
  });

  it('should return visiblePages near end when current is last with total > 7', () => {
    component.totalPages = 20;
    component.currentPage = 20;
    const pages = component.visiblePages;
    expect(pages[0]).toBe(1);
    expect(pages).toContain('ellipsis');
    expect(pages).toContain(19);
    expect(pages).toContain(20);
  });

  it('should compute rangeFrom', () => {
    component.currentPage = 1;
    component.pageSize = 10;
    component.totalItems = 0;
    expect(component.rangeFrom).toBe(0);

    component.totalItems = 50;
    expect(component.rangeFrom).toBe(1);

    component.currentPage = 3;
    expect(component.rangeFrom).toBe(21);
  });

  it('should compute rangeTo', () => {
    component.currentPage = 1;
    component.pageSize = 10;
    component.totalItems = 5;
    expect(component.rangeTo).toBe(5);

    component.totalItems = 50;
    expect(component.rangeTo).toBe(10);

    component.currentPage = 5;
    expect(component.rangeTo).toBe(50);
  });

  it('should emit pageChange when goTo is valid', () => {
    spyOn(component.pageChange, 'emit');
    component.totalPages = 5;
    component.currentPage = 1;
    component.goTo(3);
    expect(component.pageChange.emit).toHaveBeenCalledWith(3);
  });

  it('should not emit when goTo is out of bounds', () => {
    spyOn(component.pageChange, 'emit');
    component.totalPages = 5;
    component.currentPage = 1;
    component.goTo(0);
    component.goTo(10);
    component.goTo(1);
    expect(component.pageChange.emit).not.toHaveBeenCalled();
  });

  it('should navigate with previous and next', () => {
    spyOn(component.pageChange, 'emit');
    component.totalPages = 5;
    component.currentPage = 3;
    component.previous();
    expect(component.pageChange.emit).toHaveBeenCalledWith(2);
    component.next();
    expect(component.pageChange.emit).toHaveBeenCalledWith(4);
  });

  it('should not navigate previous when on first page', () => {
    spyOn(component.pageChange, 'emit');
    component.totalPages = 5;
    component.currentPage = 1;
    component.previous();
    expect(component.pageChange.emit).not.toHaveBeenCalled();
  });

  it('should not navigate next when on last page', () => {
    spyOn(component.pageChange, 'emit');
    component.totalPages = 5;
    component.currentPage = 5;
    component.next();
    expect(component.pageChange.emit).not.toHaveBeenCalled();
  });
});
