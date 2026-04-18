import './Timer.css';

const SIZE   = 52;
const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CX = SIZE / 2;
const CY = SIZE / 2;

export default function Timer({ timeLeft, totalTime }) {
  const pct    = totalTime > 0 ? Math.max(0, timeLeft / totalTime) : 0;
  const offset = CIRCUMFERENCE * (1 - pct);

  let colorClass = 'timer-green';
  if (pct < 0.3) colorClass = 'timer-red';
  else if (pct < 0.6) colorClass = 'timer-yellow';

  return (
    <div className={`timer ${colorClass} ${pct < 0.15 ? 'timer-pulse' : ''}`}>
      <svg
        width={SIZE} height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="timer-svg"
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Background track */}
        <circle
          cx={CX} cy={CY} r={RADIUS}
          fill="none"
          strokeWidth="4"
        />
        {/* Progress arc */}
        <circle
          cx={CX} cy={CY} r={RADIUS}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="timer-arc"
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 0.9s linear'
          }}
        />
      </svg>
      <span className="timer-number">{timeLeft}</span>
    </div>
  );
}
