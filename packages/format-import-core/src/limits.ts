import { DEFAULT_LIMITS } from "@gvr/schema";

export interface ImportLimits {
  maxSourceBytes: number;
}

export const DEFAULT_IMPORT_LIMITS: ImportLimits = {
  maxSourceBytes: DEFAULT_LIMITS.maxSourceBytes,
};
