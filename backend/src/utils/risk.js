export function buildSummary(findings) {
  const bySeverity = { critical: 0, medium: 0, low: 0 };
  const byType = {};
  let riskScore = 0;

  findings.forEach((finding) => {
    const label = finding.severityLabel.toLowerCase();
    bySeverity[label] = (bySeverity[label] || 0) + 1;
    byType[finding.type] = (byType[finding.type] || 0) + 1;
    riskScore = Math.max(riskScore, finding.severity);
  });

  return {
    total: findings.length,
    riskScore,
    riskLabel: riskScore >= 71 ? "Critical" : riskScore >= 31 ? "Medium" : "Low",
    bySeverity,
    byType
  };
}
