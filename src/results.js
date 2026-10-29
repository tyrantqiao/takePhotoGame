export function rankedEntries(entries) {
  const sorted = [...entries].sort((a, b) => b.score - a.score || a.at - b.at);
  let rank = 1;
  return sorted.map((entry, i) => { if (i && entry.score !== sorted[i - 1].score) rank = i + 1;return { ...entry, rank }; });
}
export function photoTitle(entry, count) {
  return entry.perfect === count ? '完美组照大师' : entry.score >= 85 ? '金镜摄影师' : entry.score >= 70 ? '光影捕手' : '现场观察员';
}
export function bestFrame(entry) {
  return entry?.photos?.filter(p => p?.image).reduce((best, p) => !best || p.score > best.score ? p : best, null) || null;
}
