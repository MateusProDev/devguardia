'use client';

interface ScoreCardProps {
  score: number;
  summary?: Record<string, number>;
}

const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO',
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-400 border-red-800/50',
  HIGH: 'text-orange-400 border-orange-800/50',
  MEDIUM: 'text-yellow-400 border-yellow-800/50',
  LOW: 'text-cyan-400 border-cyan-800/50',
  INFO: 'text-gray-500 border-gray-700/50',
};

function getScoreColor(score: number) {
  if (score >= 80) return { text: 'text-green-500', ring: 'stroke-green-500', label: 'SECURE' };
  if (score >= 50) return { text: 'text-yellow-500', ring: 'stroke-yellow-500', label: 'WARNING' };
  return { text: 'text-red-500', ring: 'stroke-red-500', label: 'CRITICAL' };
}

export default function ScoreCard({ score, summary }: ScoreCardProps) {
  const { text, ring, label } = getScoreColor(score);
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (score / 100) * circumference;

  const totalIssues = summary
    ? Object.values(summary).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="border border-green-500/20 bg-black p-6 mb-6">
      <div className="flex flex-col sm:flex-row items-center gap-8">
        {/* Score circle */}
        <div className="relative flex-shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(34, 197, 94, 0.1)" strokeWidth="12" />
            <circle
              cx="70"
              cy="70"
              r="54"
              fill="none"
              className={ring}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              transform="rotate(-90 70 70)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold font-mono ${text}`}>{score}</span>
            <span className={`text-xs font-mono ${text}`}>{label}</span>
          </div>
        </div>

        {/* Summary */}
        <div className="flex-1 font-mono">
          <h2 className="text-sm font-bold mb-1 text-green-400 uppercase tracking-wider">SECURITY_SCORE</h2>
          <p className="text-gray-600 text-xs mb-4">
            {totalIssues === 0
              ? '// No issues detected'
              : `// ${totalIssues} ${totalIssues === 1 ? 'issue' : 'issues'} detected`}
          </p>
          {summary && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary)
                .filter(([, count]) => count > 0)
                .map(([severity, count]) => (
                  <span
                    key={severity}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-mono border ${SEVERITY_COLORS[severity]}`}
                  >
                    {count} {SEVERITY_LABELS[severity] || severity}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
