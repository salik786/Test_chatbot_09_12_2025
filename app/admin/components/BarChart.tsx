'use client';

interface BarChartProps {
  data: Record<string, number>;
  color: 'blue' | 'purple' | 'green' | 'orange';
  maxBars?: number;
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

export default function BarChart({ data, color, maxBars = 10 }: BarChartProps) {
  const entries = Object.entries(data).slice(-maxBars);
  const maxValue = Math.max(...entries.map(([_, count]) => count));
  const scheme = colorSchemes[color];

  if (entries.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">No data yet</p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-end justify-between h-48 gap-1">
        {entries.map(([label, value]) => {
          const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;

          return (
            <div key={label} className="flex-1 flex flex-col items-center justify-end group">
              {/* Bar */}
              <div
                className={`w-full bg-gradient-to-t ${scheme.bar} rounded-t-lg transition-all duration-500 relative`}
                style={{ height: `${heightPercent}%`, minHeight: value > 0 ? '8px' : '0px' }}
              >
                {/* Value label on hover */}
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className={`text-xs font-semibold ${scheme.text} whitespace-nowrap`}>
                    {value}
                  </span>
                </div>
              </div>

              {/* X-axis label */}
              <div className="mt-2 text-xs text-gray-600 text-center overflow-hidden">
                <span className="block truncate max-w-full" title={label}>
                  {label.split('/').slice(0, 2).join('/')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Y-axis indicator */}
      <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
        <span>0</span>
        <span className="font-medium">Max: {maxValue}</span>
      </div>

      {/* Summary */}
      <div className="pt-3 border-t border-gray-200 mt-4">
        <p className="text-sm text-gray-600">
          Total: <span className="font-semibold text-gray-900">{Object.values(data).reduce((a, b) => a + b, 0)}</span>
          {' • '}
          Average: <span className="font-semibold text-gray-900">{Math.round(Object.values(data).reduce((a, b) => a + b, 0) / Object.keys(data).length)}</span>
        </p>
      </div>
    </div>
  );
}
