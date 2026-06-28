export interface VerdictDisplay {
  icon: string;
  color: string;
  bg: string;
  border: string;
  label: string;
}

export function getVerdictDisplay(temperature: 'hot' | 'warm' | 'cold', temperatureLabel: string): VerdictDisplay {
  if (temperature === 'hot') {
    return { icon: '🔥', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', label: temperatureLabel };
  }
  if (temperature === 'warm') {
    return { icon: '🌤️', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', label: temperatureLabel };
  }
  return { icon: '❄️', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.3)', label: temperatureLabel };
}
