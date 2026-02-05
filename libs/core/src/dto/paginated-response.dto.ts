export class PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;

  constructor(
    data: T[],
    total: number,
    page: number,
    pageSize: number,
    hasNext?: boolean,
  ) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.pageSize = pageSize;
    this.hasNext = hasNext ?? page * pageSize < total;
  }
}
