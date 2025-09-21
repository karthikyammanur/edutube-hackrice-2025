import React from 'react';

type MCChoice = { id: string; text: string };
type MCQuestion = {
  questionType: 'multiple_choice';
  questionText: string;
  choices: MCChoice[];
  answer: string; // id of correct choice
  difficulty: 'easy' | 'medium' | 'hard';
};
type TFQuestion = {
  questionType: 'true_false';
  questionText: string;
  answer: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
};
type SAQuestion = {
  questionType: 'short_answer';
  questionText: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

type Question = MCQuestion | TFQuestion | SAQuestion;

const demo: Question[] = [
  {
    questionType: 'multiple_choice',
    questionText: "What is the formula for calculating the coefficient 'aₙ' in a Fourier series?",
    choices: [
      { id: 'A', text: '(2/T) ∫ x(t) cos(nω₀t) dt' },
      { id: 'B', text: '(1/T) ∫ x(t) sin(nω₀t) dt' },
      { id: 'C', text: '(1/T) ∫ x(t) cos(nω₀t) dt' },
      { id: 'D', text: '(2/T) ∫ x(t) sin(nω₀t) dt' },
    ],
    answer: 'A',
    difficulty: 'easy',
  },
  {
    questionType: 'short_answer',
    questionText: "In the Fourier coefficient formulas, what does the symbol 'T' represent?",
    answer: 'The period of the periodic signal',
    difficulty: 'easy',
  },
  {
    questionType: 'multiple_choice',
    questionText: 'Which formula is used to calculate the coefficient c₀ in a Fourier series?',
    choices: [
      { id: 'A', text: '(2/T) ∫ x(t) cos(nω₀t) dt' },
      { id: 'B', text: '(2/T) ∫ x(t) sin(nω₀t) dt' },
      { id: 'C', text: '(1/T) ∫ x(t) dt' },
      { id: 'D', text: 'None of the above' },
    ],
    answer: 'C',
    difficulty: 'medium',
  },
  {
    questionType: 'true_false',
    questionText:
      'The Fourier coefficients (aₙ, bₙ, c₀) represent the amplitude of each harmonic component in the signal.',
    answer: true,
    difficulty: 'medium',
  },
  {
    questionType: 'short_answer',
    questionText: 'What is the formula for the fundamental frequency (ω₀) in terms of the period (T)?',
    answer: 'ω₀ = 2π/T',
    difficulty: 'easy',
  },
  {
    questionType: 'multiple_choice',
    questionText:
      'The calculation of Fourier coefficients involves definite integrals.  What are the integrands in the formulas for aₙ and bₙ?',
    choices: [
      { id: 'A', text: 'x(t) and x(t)' },
      { id: 'B', text: 'x(t)cos(nω₀t) and x(t)sin(nω₀t)' },
      { id: 'C', text: 'cos(nω₀t) and sin(nω₀t)' },
      { id: 'D', text: 'x(t) and 1' },
    ],
    answer: 'B',
    difficulty: 'medium',
  },
];

export default function Quiz(): JSX.Element {
  const [index, setIndex] = React.useState<number>(0);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [short, setShort] = React.useState<string>('');
  const [showAnswer, setShowAnswer] = React.useState<boolean>(false);
	const [answers, setAnswers] = React.useState<Array<boolean | null>>(
		Array(demo.length).fill(null),
	);
	const [finished, setFinished] = React.useState<boolean>(false);
  const lastIndex = demo.length - 1;
  const safeIndex = Math.min(Math.max(index, 0), lastIndex);
  const q = demo[safeIndex];

	React.useEffect(() => {
    setSelected(null);
    setShort('');
    setShowAnswer(false);
  }, [index]);

	function normalize(text: string): string {
		return text.toLowerCase().trim();
	}

	function evaluateCurrent(): boolean {
		if (q.questionType === 'multiple_choice') {
			return selected === q.answer;
		}
		if (q.questionType === 'true_false') {
			if (selected == null) return false;
			return String(q.answer) === selected;
		}
		// short_answer
		return normalize(short) === normalize(q.answer);
	}

	function recordAnswerIfNeeded(): void {
		setAnswers((prev) => {
			if (prev[safeIndex] !== null) return prev;
			const copy = [...prev];
			copy[safeIndex] = evaluateCurrent();
			return copy;
		});
	}

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <a href="#" className="text-lg font-semibold text-text">EduTube Notes</a>
          <nav className="text-sm"><a href="#upload" className="text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline">Back to upload</a></nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl sm:text-3xl font-semibold text-text">Practice Quiz</h1>
        <div className="mt-6 rounded-2xl border border-border bg-white p-6">
          <p className="text-sm uppercase tracking-wide text-subtext">Question {safeIndex + 1} / {demo.length} · <span className="capitalize">{q.difficulty}</span></p>
          <p className="mt-3 text-lg text-text">{q.questionText}</p>

          {q.questionType === 'multiple_choice' && (
            <div className="mt-4 space-y-2">
              {q.choices.map((c) => {
                const isSelected = selected === c.id;
                const isCorrect = showAnswer && c.id === q.answer;
                const isWrong = showAnswer && isSelected && c.id !== q.answer;
                return (
                  <label key={c.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition ${
                    isCorrect ? 'border-green-500 bg-green-50' : isWrong ? 'border-red-500 bg-red-50' : 'border-border bg-surface hover:shadow-md'
                  }`}>
                    <input
                      type="radio"
                      name={`q-${safeIndex}`}
                      checked={isSelected}
                      onChange={() => setSelected(c.id)}
                      className="h-4 w-4"
                    />
                    <span className="text-text">{c.text}</span>
                  </label>
                );
              })}
            </div>
          )}

          {q.questionType === 'true_false' && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(['True', 'False'] as const).map((label, idx) => {
                const val = idx === 0;
                const isSelected = selected === String(val);
                const isCorrect = showAnswer && val === q.answer;
                const isWrong = showAnswer && isSelected && val !== q.answer;
                return (
                  <label key={label} className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition ${
                    isCorrect ? 'border-green-500 bg-green-50' : isWrong ? 'border-red-500 bg-red-50' : 'border-border bg-surface hover:shadow-md'
                  }`}>
                    <input
                      type="radio"
                      name={`q-${safeIndex}`}
                      checked={isSelected}
                      onChange={() => setSelected(String(val))}
                      className="h-4 w-4"
                    />
                    <span className="text-text">{label}</span>
                  </label>
                );
              })}
            </div>
          )}

          {q.questionType === 'short_answer' && (
            <div className="mt-4">
              <input
                type="text"
                value={short}
                onChange={(e) => setShort(e.target.value)}
                placeholder="Type your answer"
                className="w-full rounded-xl border border-border bg-white px-4 py-3 text-text placeholder:text-subtext focus-visible:outline focus-visible:outline-2 focus-visible:outline-text"
              />
              {showAnswer && (
                <p className="mt-2 text-sm text-subtext">Expected: <span className="text-text">{q.answer}</span></p>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button onClick={() => setShowAnswer(true)} className="inline-flex items-center px-5 py-3 rounded-xl border border-border bg-surface text-text hover:shadow-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-text">Check answer</button>
            <button
              onClick={() => { recordAnswerIfNeeded(); setIndex((i) => Math.max(i - 1, 0)); }}
              disabled={safeIndex === 0}
              className="inline-flex items-center px-5 py-3 rounded-xl border border-border bg-surface text-text hover:shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-text"
            >
              Prev
            </button>
            {safeIndex < lastIndex ? (
              <button
                onClick={() => { recordAnswerIfNeeded(); setIndex((i) => Math.min(i + 1, lastIndex)); }}
                className="inline-flex items-center px-5 py-3 rounded-xl bg-text text-background hover:bg-primaryHover transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-text"
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => { recordAnswerIfNeeded(); setFinished(true); }}
                className="inline-flex items-center px-5 py-3 rounded-xl bg-text text-background hover:bg-primaryHover transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-text"
              >
                Finish
              </button>
            )}
          </div>
        </div>

        {finished && (
          <div className="mt-8 rounded-2xl border border-border bg-white p-6">
            <h2 className="text-xl font-semibold text-text">Recommended snippets</h2>
            <p className="mt-2 text-subtext">Based on questions you missed, here are spots to rewatch.</p>
            <div className="mt-4 space-y-3">
              {answers.map((ok, i) => {
                if (ok !== false) return null;
                const topic = demo[i].questionText;
                return (
                  <div key={i} className="rounded-xl border border-border bg-surface p-4">
                    <p className="text-sm font-medium text-text">Question {i + 1}</p>
                    <p className="text-sm text-subtext mt-1 line-clamp-2">{topic}</p>
                    <div className="mt-3 relative aspect-video w-full rounded-lg overflow-hidden border border-border bg-black/5 grid place-items-center text-subtext">
                      <span>Video snippet placeholder</span>
                    </div>
                  </div>
                );
              })}
              {answers.every((v) => v !== false) && (
                <p className="text-subtext">Nice work — no missed questions to review.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


