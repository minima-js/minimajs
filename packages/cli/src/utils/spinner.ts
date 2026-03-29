const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const INTERVAL = 80;

export interface Spinner {
  start(text?: string): void;
  text: string;
  succeed(text?: string): void;
  fail(text?: string): void;
  stop(): void;
}

export function createSpinner(): Spinner {
  let frame = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let currentText = "";

  function clear(): void {
    process.stderr.write("\r\x1b[K");
  }

  function render(): void {
    process.stderr.write(`\r${FRAMES[frame % FRAMES.length]} ${currentText}`);
    frame++;
  }

  return {
    get text() {
      return currentText;
    },
    set text(val: string) {
      currentText = val;
    },
    start(text?: string) {
      if (text) currentText = text;
      frame = 0;
      if (timer) clearInterval(timer);
      timer = setInterval(render, INTERVAL);
    },
    succeed(text?: string) {
      if (timer) clearInterval(timer);
      timer = null;
      clear();
      process.stderr.write(`✔ ${text ?? currentText}\n`);
    },
    fail(text?: string) {
      if (timer) clearInterval(timer);
      timer = null;
      clear();
      process.stderr.write(`✘ ${text ?? currentText}\n`);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      clear();
    },
  };
}
