function range(end: number): Generator<number>;
function range(start: number, end: number): Generator<number>;
function range(start: number, end: number, step: number): Generator<number>;
function* range(start: number, end?: number, step = 1) {
  if (end === undefined) {
    end = start;
    start = 0;
  }
  for (; start < end; start += step) {
    yield start;
  }
}

export { range };
