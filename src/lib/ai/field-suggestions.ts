/**
 * Static keyword -> HSN code lookup for common export materials. Not ML —
 * just a reference table so documentation staff don't have to look these up
 * by hand for the same handful of recurring material types.
 */
const HSN_KEYWORD_MAP: [RegExp, string, string][] = [
  [/granite/i, "6802", "Granite (worked monumental/building stone)"],
  [/marble/i, "2515", "Marble, travertine, ecaussine"],
  [/limestone/i, "2521", "Limestone flux; limestone for cement/lime"],
  [/sandstone/i, "6801", "Sandstone setts, curbstones, flagstones"],
  [/slate/i, "2514", "Slate, worked or unworked"],
  [/quartzite/i, "6802", "Quartzite (worked monumental/building stone)"],
];

export function suggestHsnCode(material: string): { code: string; label: string } | null {
  for (const [pattern, code, label] of HSN_KEYWORD_MAP) {
    if (pattern.test(material)) return { code, label };
  }
  return null;
}
