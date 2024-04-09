export interface Adapter {
  open(): void;
  read(id: string): unknown;
  write(id: string, data: unknown): Promise<unknown>;
  close(): unknown;
  delete(): unknown;
}
