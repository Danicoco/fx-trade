export class GenericStatus<T> {
  status?: number;
  description: string;
  data?: T;

  constructor({
    status,
    description,
    data,
  }: {
    status?: number;
    description: string;
    data?: T;
  }) {
    this.status = status || 200;
    this.description = description;
    this.data = data;
  }
}
