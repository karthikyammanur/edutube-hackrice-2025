import React from 'react';
import { FadeIn } from './components/animate-ui/primitives/core/fade-in';
import { Mic, Send } from 'lucide-react';

export default function Summary(): JSX.Element {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <a href="#" className="text-lg font-semibold text-text">EduTube Notes</a>
          <nav className="text-sm"><a href="#upload" className="text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline">Back to upload</a></nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 pb-40">
        <h1 className="text-2xl sm:text-3xl font-semibold text-text">Signals & Systems: Fourier Series Basics</h1>
        <div className="mt-8 space-y-8">
          <FadeIn once y={8} className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-lg font-medium text-text">Overview</h2>
            <p className="mt-3 text-subtext">
              This lecture introduces the Fourier series, a method for representing periodic signals as a sum of sine and cosine waves (sinusoids). The lecture covers the fundamental concepts, calculation of coefficients, and important considerations for practical applications.
            </p>
          </FadeIn>

          <FadeIn once y={8} className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-lg font-medium text-text">Key Concepts</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2 text-subtext">
              <li><span className="font-medium text-text">Fourier Series:</span> A representation of a periodic signal as a weighted sum of harmonically related sinusoids.</li>
              <li><span className="font-medium text-text">Orthogonality:</span> A property of basis functions where the inner product of any two distinct functions is zero, simplifying coefficient calculations.</li>
              <li><span className="font-medium text-text">Fundamental Frequency (ω₀):</span> The base frequency of a periodic signal, calculated as ω₀ = 2π/T, where T is the period.</li>
              <li><span className="font-medium text-text">Fourier Coefficients (aₙ, bₙ, c₀):</span> Weights representing the contribution of each sinusoidal component to the signal, calculated using definite integrals involving the signal and sinusoidal basis functions.</li>
              <li><span className="font-medium text-text">Symmetry Properties:</span> Even or odd symmetry in a signal can simplify the Fourier series calculation by eliminating certain terms (e.g., odd symmetry implies only sine terms are present).</li>
              <li><span className="font-medium text-text">Gibbs Phenomenon:</span> An overshoot near discontinuities when approximating a signal with a truncated Fourier series; the overshoot is approximately 9% of the jump in the signal.</li>
              <li><span className="font-medium text-text">Truncation and Reconstruction:</span> Approximating a signal using a finite number of terms in the Fourier series leads to a trade-off between accuracy and complexity.</li>
            </ul>
          </FadeIn>

          <FadeIn once y={8} className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-lg font-medium text-text">Important Graphics and Diagrams</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2 text-subtext">
              <li><span className="font-medium text-text">Unit Circle Diagram (02:15):</span> Orthogonal basis functions (sine and cosine) as vectors in 2D space, illustrating orthogonality.</li>
              <li><span className="font-medium text-text">Square Wave Plot (10:20):</span> Shows a square wave with odd symmetry, highlighting that only sine terms are needed.</li>
              <li><span className="font-medium text-text">Step Function with Overshoot (12:10):</span> Illustrates the Gibbs phenomenon near discontinuities when using a truncated Fourier series.</li>
            </ul>
          </FadeIn>

          <FadeIn once y={8} className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-lg font-medium text-text">Formulas</h2>
            <p className="mt-3 text-subtext">The Fourier coefficients are calculated as follows:</p>
            <ul className="mt-3 list-disc pl-5 space-y-2 text-subtext">
              <li>aₙ = (2/T) ∫ x(t) cos(nω₀t) dt</li>
              <li>bₙ = (2/T) ∫ x(t) sin(nω₀t) dt</li>
              <li>c₀ = (1/T) ∫ x(t) dt</li>
            </ul>
            <p className="mt-3 text-subtext">where x(t) is the periodic signal, T is its period, and ω₀ is the fundamental frequency.</p>
          </FadeIn>

          <FadeIn once y={8} className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-lg font-medium text-text">Cautions and Misconceptions</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2 text-subtext">
              <li>Truncating the Fourier series to a finite number of terms results in an approximation of the original signal. Higher accuracy requires more terms.</li>
              <li>The Gibbs phenomenon is inherent to the Fourier series representation of discontinuous functions; it cannot be eliminated entirely but can be mitigated through filtering techniques.</li>
            </ul>
          </FadeIn>
        </div>
        {/* Floating chat assistant bubble */}
        <div className="fixed inset-x-0 bottom-8 z-50 px-4 sm:px-6 lg:px-8">
          <form
            aria-label="Lecture assistant chat"
            className="mx-auto max-w-3xl"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <div className="flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 shadow-lg">
              <label htmlFor="chat-input" className="sr-only">Ask about the notes</label>
              <input
                id="chat-input"
                type="text"
                placeholder="Ask about the notes..."
                className="w-full bg-transparent px-1 py-2 text-text placeholder:text-subtext focus-visible:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-text px-4 py-2 text-background hover:bg-primaryHover transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-text"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}


