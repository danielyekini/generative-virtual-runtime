/**
 * Story-complexity Generate judgment pack (P020).
 * Bundles the quality-judgment manifest for Studio starter chips.
 */
import pack from "../../../../fixtures/generation/quality-judgment/manifest.json";

export type QualityJudgmentTask = {
  id: string;
  title: string;
  baseline: string;
  prompt: string;
};

export type QualityJudgmentPack = {
  schemaVersion: number;
  split: string;
  purpose: string;
  studioDefaultApproach: string;
  pinnedModel: string;
  checklist: string;
  tasks: QualityJudgmentTask[];
};

export function loadQualityJudgmentPack(): QualityJudgmentPack {
  return pack as QualityJudgmentPack;
}
