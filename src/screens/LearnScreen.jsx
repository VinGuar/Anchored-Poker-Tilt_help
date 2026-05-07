const CONCEPTS = [
  {
    title: 'What is tilt?',
    body: 'Tilt is any mental state that causes you to make decisions below your baseline skill level. It does not always look like rage. Running scared, chasing losses, loosening standards while winning, or replaying your own mistakes are all tilt.',
  },
  {
    title: 'Why a check-in works',
    body: 'Tilt is hard to self-diagnose in the moment because the same emotions that cause it also distort your judgment. A structured check-in forces you to rate specific behaviors (rushing, chasing, frustration) rather than asking "am I tilting?" Your brain will almost always answer no to that question.',
  },
  {
    title: 'The session event log',
    body: 'Logging bad beats and losses does two things: it creates an objective record of what actually happened (vs. what it felt like), and it primes the check-in to weight those events correctly in your score.',
  },
  {
    title: 'Accumulated tilt',
    body: 'A bad session raises your risk for the next one. Mental pressure carries over. Anchored tracks this across your last five sessions and adjusts your baseline so you know when you are already starting from a deficit.',
  },
  {
    title: 'Your tilt type',
    body: "Most players have a dominant tilt pattern: injustice, desperation, revenge, winner's tilt, and others. Knowing yours means your check-in can weight the questions that matter most for you and give coaching that fits your specific leak, not generic advice.",
  },
  {
    title: 'The goal is not zero tilt',
    body: "The goal is earlier detection. Catching drift at Warning instead of discovering it at Tilt after two more buy-ins is the whole point. The check isn't a cure. It's an interrupt that gives you a moment to choose.",
  },
];

export default function LearnScreen() {
  return (
    <div className="screen">
      <div className="header">
        <span className="header-title">Learn</span>
        <span className="header-meta">Mental game fundamentals</span>
      </div>

      <div className="card" style={{ marginBottom: '8px' }}>
        <div className="card-title" style={{ marginBottom: '6px' }}>How Anchored Works</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          Log events as you play, check in when something feels off, and let the data build a picture of your mental game over time. The concepts below explain the reasoning behind each piece.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '24px' }}>
        {CONCEPTS.map((c, i) => (
          <div key={i} className="card">
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
              {c.title}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              {c.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
