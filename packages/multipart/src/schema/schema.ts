import { z, core, ZodType } from "zod";
import { UploadedFile } from "./uploaded-file.js";

export type ExtractTests = Record<string, FileBuilderDef>;

export interface FileBuilderDef extends core.$ZodTypeDef {
  min?: number;
  max?: number;
  types?: string[];
}
export interface FileBuilderInternals extends core.$ZodTypeInternals<UploadedFile> {
  def: FileBuilderDef;
}
export interface FileSchema extends z.ZodType<UploadedFile, unknown, FileBuilderInternals> {
  max(size: number, message?: string): this;
  min(size: number, message?: string): this;
  accept(types: string[], message?: string): this;
}

export const FileSchema = core.$constructor<FileSchema, FileBuilderDef>("FileSchema", (inst, def) => {
  ZodType.init(inst, def);
  inst._zod.parse = function (payload) {
    return payload;
  };
  inst.max = function (size: number) {
    return new FileSchema({ ...def, max: size });
  };
  inst.min = function (size: number) {
    return new FileSchema({ ...def, min: size });
  };
  inst.accept = function (types: string[]) {
    return new FileSchema({ ...def, types });
  };
});
/**
 * Create a Zod schema for UploadedFile with chainable helper methods via refinements.
 */
function file(): FileSchema {
  return new FileSchema({ type: "custom" });
}

export { file };
