import type { DiskDriver } from "./driver.js";

interface DiskOption {
  driver: DiskDriver;
}
export function createDisk(option: DiskOption) {
  return function upload() {};
}
