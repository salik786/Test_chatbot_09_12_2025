'use client';

interface HorizontalBarChartProps {
  data: Record<string, number>;
  color: 'blue' | 'purple' | 'green' | 'orange';
  showPercentage?: boolean;
  total?: number;
}

const colorSchemes = {
  blue: {
    bar: 'from-blue-500 to-blue-600',
    text: 'text-blue-600',
  },
  purple: {
    bar: 'from-purple-500 to-purple-600',
    text: 'text-purple-600',
  },
  green: {
    bar: 'from-green-500 to-teal-600',
    text: 'text-green-600',
  },
  orange: {
    bar: 'from-orange-500 to-orange-600',
    text: 'text-orange-600',
  },
};

export default function HorizontalBarChart({ data, color, showPercentage = false, total }: HorizontalBarChartProps) {
  const entries = Object.entries(data);
  const maxValue = Math.max(...entries.map(([_, count]) => count));
  const scheme = colorSchemes[color];
  const totalValue = total || Object.values(data).reduce((a, b) => a + b, 0);

  if (entries.length === 0) {
    return (
      <p className="text-gray-500 text-center py-4">No data yet</p>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map(([label, value]) => {
        const widthPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const actualPercent = totalValue > 0 ? Math.round((value / totalValue) * 100) : 0;

        return (
          <div key={label}>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-gray-900">{label}</span>
              <span className={`font-semibold ${scheme.text}`}>
                {value} {showPercentage && `(${actualPercent}%)`}
              </span>
            </div>
            <div className="relative h-8 bg-gray-200 rounded-lg overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${scheme.bar} rounded-lg transition-all duration-500 flex items-center justify-end pr-2`}
                style={{ width: `${widthPercent}%` }}
              >
                {widthPercent > 15 && (
                  <span className="text-xs font-medium text-white">
                    {showPercentage ? `${actualPercent}%` : value}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
