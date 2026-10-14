import { useEffect, useMemo, useState } from "react";

const API_URL = "https://bridgeaz-recommendations-server.vercel.app";

export default function BridgePick({ token, theme }) {
  const [questions, setQuestions] = useState([]);

  const [answeredQuestionNumbers, setAnsweredQuestionNumbers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [showWhy, setShowWhy] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadBridgeQuestions() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/profile/${encodeURIComponent(
            token,
          )}/bridge-questions`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Could not load your Bridge Pick.");
        }

        if (!active) {
          return;
        }

        setQuestions(Array.isArray(data?.questions) ? data.questions : []);

        setAnsweredQuestionNumbers(
          Array.isArray(data?.answeredQuestionNumbers)
            ? data.answeredQuestionNumbers.map(Number)
            : [],
        );
      } catch (err) {
        console.error("Bridge Pick error:", err);

        if (active) {
          setError(err.message || "Could not load your Bridge Pick.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (token) {
      void loadBridgeQuestions();
    }

    return () => {
      active = false;
    };
  }, [token]);

  const bridgePick = useMemo(() => {
    if (!questions.length) {
      return null;
    }

    return (
      questions.find(
        (question) =>
          !answeredQuestionNumbers.includes(Number(question.questionNumber)),
      ) || null
    );
  }, [questions, answeredQuestionNumbers]);

  if (loading) {
    return (
      <section className="relative z-10 px-4 py-8 md:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
            <div className="h-4 w-36 animate-pulse rounded-full bg-slate-200" />

            <div className="mt-5 h-7 w-3/4 animate-pulse rounded-lg bg-slate-200" />

            <div className="mt-3 h-5 w-1/2 animate-pulse rounded-lg bg-slate-100" />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return null;
  }

  if (!bridgePick) {
    return null;
  }

  const primary = theme?.primary || "#071A4A";

  const secondary = theme?.secondary || "#2563EB";

  return (
    <section className="relative z-10 px-4 py-8 md:px-6">
      <div className="mx-auto w-full max-w-7xl">
        <div
          className="relative overflow-hidden rounded-[30px] border bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-8"
          style={{
            borderColor: `${primary}20`,
          }}
        >
          {/* subtle background */}
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-10 blur-3xl"
            style={{
              background: secondary,
            }}
          />

          <div className="relative">
            {/* heading */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-black text-white shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                  }}
                >
                  ✦
                </div>

                <div>
                  <p
                    className="text-xs font-black uppercase tracking-[0.2em]"
                    style={{
                      color: primary,
                    }}
                  >
                    Your Bridge Pick
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    One useful thing for you right now
                  </p>
                </div>
              </div>

              <span
                className="rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wider"
                style={{
                  backgroundColor: `${secondary}15`,
                  color: primary,
                }}
              >
                Learn
              </span>
            </div>

            {/* question */}
            <div className="mt-7">
              <h2 className="max-w-4xl text-2xl font-black leading-snug text-[#071A4A] md:text-3xl">
                {bridgePick.question}
              </h2>
            </div>

            {/* Why are we asking */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowWhy((current) => !current)}
                className="cursor-pointer text-sm font-black transition hover:opacity-70"
                style={{
                  color: primary,
                }}
              >
                {showWhy ? "Hide explanation ↑" : "Why are we asking? ↓"}
              </button>

              {showWhy && (
                <div className="mt-3 max-w-3xl rounded-2xl bg-slate-50 px-5 py-4 text-sm font-medium leading-6 text-slate-600">
                  Your answers help Bridge understand what may be useful to
                  show, ask, or connect you with. This question does not
                  automatically change your public Profile or interests.
                </div>
              )}
            </div>

            {/* Coming next */}
            <div className="mt-7 border-t border-slate-100 pt-5">
              <p className="text-sm font-semibold text-slate-500">
                Next, we’ll add your answer options and connect this Pick to
                your existing Bridge Question response flow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
