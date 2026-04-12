'use client';

interface ScoreCardProps {
  score: number;
  summary?: Record<string, number>;
}

const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: 'Crítico',
  HIGH: 'Alto',
  MEDIUM: 'Médio',
  LOW: 'Baixo',
  INFO: 'Info',
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-950 border-red-800',
  HIGH: 'text-orange-400 bg-orange-950 border-orange-800',
  MEDIUM: 'text-yellow-400 bg-yellow-950 border-yellow-800',
  LOW: 'text-blue-400 bg-blue-950 border-blue-800',
  INFO: 'text-gray-400 bg-gray-800 border-gray-700',
};

function getScoreColor(score: number) {
  if (score >= 80) return { text: 'text-green-500', ring: 'stroke-green-500', label: 'Bom' };
  if (score >= 50) return { text: 'text-yellow-500', ring: 'stroke-yellow-500', label: 'Moderado' };
  return { text: 'text-red-500', ring: 'stroke-red-500', label: 'Crítico' };
}

export default function ScoreCard({ score, summary }: ScoreCardProps) {
  const { text, ring, label } = getScoreColor(score);
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (score / 100) * circumference;

  const totalIssues = summary
    ? Object.values(summary).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="card mb-6">
      <div className="flex flex-col sm:flex-row items-center gap-8">
        {/* Score circle */}
        <div className="relative flex-shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="54" fill="none" stroke="#1f2937" strokeWidth="12" />
            <circle
              cx="70"
              cy="70"
              r="54"
              fill="none"
              className={ring}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${text}`}>{score}</span>
            <span className={`text-sm font-medium ${text}`}>{label}</span>
          </div>
        </div>

        {/* Summary */}
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-1">Score de Segurança</h2>
          <p className="text-gray-400 text-sm mb-4">
            {totalIssues === 0
              ? 'Nenhum problema encontrado.'
              : `${totalIssues} ${totalIssues === 1 ? 'problema encontrado' : 'problemas encontrados'}`}
          </p>
          {summary && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary)
                .filter(([, count]) => count > 0)
                .map(([severity, count]) => (
                  <span
                    key={severity}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${SEVERITY_COLORS[severity]}`}
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
