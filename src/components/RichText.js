// Very small formatter for help articles: blank line = new paragraph, lines starting "1." = numbered list.
export default function RichText({ text }) {
  const blocks = String(text || '').split(/\n\s*\n/);
  return (
    <div className="richtext">
      {blocks.map((b, i) => {
        const lines = b.split('\n').filter(Boolean);
        if (lines.length && lines.every((l) => /^\d+\.\s/.test(l))) {
          return <ol key={i}>{lines.map((l, j) => <li key={j}>{l.replace(/^\d+\.\s/, '')}</li>)}</ol>;
        }
        // A paragraph followed by a numbered list in the same block
        const firstList = lines.findIndex((l) => /^\d+\.\s/.test(l));
        if (firstList > 0) {
          return (
            <div key={i}>
              <p>{lines.slice(0, firstList).join(' ')}</p>
              <ol>{lines.slice(firstList).map((l, j) => <li key={j}>{l.replace(/^\d+\.\s/, '')}</li>)}</ol>
            </div>
          );
        }
        return <p key={i}>{lines.join(' ')}</p>;
      })}
    </div>
  );
}
