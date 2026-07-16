import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-sujets-pagination',
  standalone: true,
  imports: [],
  templateUrl: './sujets-pagination.html',
  styleUrl: './sujets-pagination.css',
})
export class SujetsPagination {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Input() totalItems = 0;
  @Input() pageSize = 9;
  @Output() pageChange = new EventEmitter<number>();

  get visiblePages(): (number | 'ellipsis')[] {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    if (start > 2) pages.push('ellipsis');
    for (let p = start; p <= end; p++) pages.push(p);
    if (end < total - 1) pages.push('ellipsis');
    pages.push(total);
    return pages;
  }

  get rangeFrom(): number {
    if (this.totalItems === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeTo(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.pageChange.emit(page);
  }

  previous(): void {
    this.goTo(this.currentPage - 1);
  }

  next(): void {
    this.goTo(this.currentPage + 1);
  }
}
