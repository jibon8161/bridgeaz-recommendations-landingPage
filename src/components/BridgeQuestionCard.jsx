import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://bridgeaz-recommendations-server.vercel.app";

export default function BridgeQuestionCard({
  token,
  theme,
  variant = "profile",
  onAnswered,
}) {
  const primary = theme?.primary || "#071A4A";
  const secondary = theme?.secondary || "#3B82F6";

  const isBridgePick = variant === "bridge-pick";

  /* =====================================================
     BRIDGE QUESTION STATE
  ===================================================== */

  const [bridgeQuestions, setBridgeQuestions] = useState([]);

  const [answeredQuestionNumbers, setAnsweredQuestionNumbers] = useState([]);

  const [bridgeQuestionsError, setBridgeQuestionsError] = useState("");

  const [bridgeAnswer, setBridgeAnswer] = useState("");

  const [bridgeAnswerSubmitting, setBridgeAnswerSubmitting] = useState(false);

  const [showWhy, setShowWhy] = useState(false);

  /*
   * We use loadedToken instead of setting loading=true/false
   * synchronously inside useEffect.
   *
   * If token !== loadedToken, that token is currently loading.
   */
  const [loadedToken, setLoadedToken] = useState("");

  const bridgeQuestionsLoading = Boolean(token) && loadedToken !== token;

  /* =====================================================
     LOAD EXISTING PERSONALIZED BRIDGE QUESTIONS
  ===================================================== */

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadBridgeQuestions() {
      try {
        const response = await fetch(
          `${API_BASE}/api/profile/${encodeURIComponent(
            token,
          )}/bridge-questions`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "Could not load Bridge Questions.");
        }

        if (controller.signal.aborted) {
          return;
        }

        const questions = Array.isArray(result?.questions)
          ? result.questions
              .map((item) => ({
                id: item?.id || "",

                questionNumber: Number(item?.questionNumber),

                question: item?.question || "",

                bridgeQuestionSet: item?.bridgeQuestionSet || "",

                whyAsked: item?.whyAsked || item?.why_asked || "",
              }))
              .filter(
                (item) =>
                  Number.isFinite(item.questionNumber) &&
                  Boolean(item.question),
              )
          : [];

        const answered = Array.isArray(result?.answeredQuestionNumbers)
          ? result.answeredQuestionNumbers
              .map((value) => Number(value))
              .filter((value) => Number.isFinite(value))
          : [];

        setBridgeQuestions(questions);

        setAnsweredQuestionNumbers([...new Set(answered)]);

        setBridgeQuestionsError("");
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Bridge Questions error:", error);

        setBridgeQuestionsError(
          error?.message || "Bridge Questions are temporarily unavailable.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadedToken(token);
        }
      }
    }

    void loadBridgeQuestions();

    return () => {
      controller.abort();
    };
  }, [token]);

  /* =====================================================
     FIND NEXT EXISTING PERSONALIZED QUESTION
  ===================================================== */

  const nextBridgeQuestion = useMemo(() => {
    const answered = new Set(answeredQuestionNumbers.map(Number));

    return (
      bridgeQuestions.find(
        (item) => !answered.has(Number(item?.questionNumber)),
      ) || null
    );
  }, [bridgeQuestions, answeredQuestionNumbers]);

  /* =====================================================
     QUESTION PROGRESS
  ===================================================== */

  const answeredCount = useMemo(() => {
    const available = new Set(
      bridgeQuestions.map((item) => Number(item.questionNumber)),
    );

    return answeredQuestionNumbers.filter((number) =>
      available.has(Number(number)),
    ).length;
  }, [answeredQuestionNumbers, bridgeQuestions]);

  const bridgeQuestionProgress =
    bridgeQuestions.length > 0
      ? Math.round((answeredCount / bridgeQuestions.length) * 100)
      : 0;

  const bridgeQuestionsComplete =
    !bridgeQuestionsLoading &&
    !bridgeQuestionsError &&
    bridgeQuestions.length > 0 &&
    !nextBridgeQuestion;

  /* =====================================================
     EXISTING ANSWER SUBMIT FLOW
  ===================================================== */

  async function submitBridgeAnswer(event) {
    event.preventDefault();

    if (!token || !nextBridgeQuestion || bridgeAnswerSubmitting) {
      return;
    }

    const cleanAnswer = bridgeAnswer.trim();

    if (!cleanAnswer) {
      setBridgeQuestionsError("Please enter an answer before submitting.");

      return;
    }

    const submittedQuestion = nextBridgeQuestion;

    try {
      setBridgeAnswerSubmitting(true);

      setBridgeQuestionsError("");

      const response = await fetch(
        `${API_BASE}/api/profile/${encodeURIComponent(
          token,
        )}/bridge-questions/answer`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            questionNumber: submittedQuestion.questionNumber,

            questionId: submittedQuestion.id,

            answer: cleanAnswer,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Could not submit your answer.");
      }

      const answeredNumber = Number(submittedQuestion.questionNumber);

      /*
       * Mark this existing question as answered locally.
       *
       * Your existing backend + Make workflow still does
       * the real saving / Member / Interest processing.
       */
      setAnsweredQuestionNumbers((current) => [
        ...new Set([...current.map(Number), answeredNumber]),
      ]);

      setBridgeAnswer("");

      /*
       * Later, when this component is used in
       * Your Bridge Pick, this callback lets the
       * parent immediately refresh recommendation data.
       *
       * We are NOT creating a new answer flow.
       */
      if (typeof onAnswered === "function") {
        try {
          await onAnswered({
            question: submittedQuestion,

            answer: cleanAnswer,

            result,
          });
        } catch (callbackError) {
          console.error("Bridge Question onAnswered error:", callbackError);
        }
      }
    } catch (error) {
      console.error("Bridge Question submit error:", error);

      setBridgeQuestionsError(
        error?.message || "Could not submit your answer. Please try again.",
      );
    } finally {
      setBridgeAnswerSubmitting(false);
    }
  }

  /* =====================================================
     NO TOKEN
  ===================================================== */

  if (!token) {
    return null;
  }

  /* =====================================================
     BRIDGE PICK EMPTY STATE

     If there is no unanswered question,
     don't show an empty Bridge Pick.
  ===================================================== */

  if (
    isBridgePick &&
    !bridgeQuestionsLoading &&
    !bridgeQuestionsError &&
    !nextBridgeQuestion
  ) {
    return null;
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <section
      className="
        relative
        z-10
        px-4
        py-5
        md:px-6
      "
    >
      <div
        className={`
          relative
          mx-auto
      ${isBridgePick ? "max-w-275" : "max-w-350"}
          overflow-hidden
          rounded-[42px]
          border
          border-white/70
          bg-white/80
          shadow-[0_32px_105px_rgba(15,23,42,.10)]
          backdrop-blur-3xl

          ${isBridgePick ? "" : "lg:grid lg:grid-cols-[.82fr_1.18fr]"}
        `}
      >
        {/* =================================================
            LEFT / HEADER
        ================================================= */}

        <div
          className={`
            relative
            overflow-hidden
            text-white

            ${isBridgePick ? "p-6 md:p-8" : "p-7 md:p-10"}
          `}
          style={{
            background: `linear-gradient(
              145deg,
              ${primary},
              ${secondary}
            )`,
          }}
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],

              opacity: [0.12, 0.28, 0.12],
            }}
            transition={{
              repeat: Infinity,
              duration: 6,
            }}
            className="
              absolute
              -right-20
              -top-20
              h-64
              w-64
              rounded-full
              bg-white
              blur-[90px]
            "
          />

          <div className="relative z-10">
            <div
              className="
                flex
                flex-wrap
                items-start
                justify-between
                gap-4
              "
            >
              <div>
                <p
                  className="
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[0.2em]
                    text-white/70
                  "
                >
                  {isBridgePick ? "Your Bridge Pick" : "Bridge Questions"}
                </p>

                <h2
                  className={`
                    mt-4
                    font-black
                    leading-tight
                    tracking-[-0.05em]

                    ${
                      isBridgePick
                        ? "text-3xl md:text-4xl"
                        : "text-4xl md:text-5xl"
                    }
                  `}
                >
                  {isBridgePick
                    ? "One useful thing for you right now."
                    : "Your experience has value."}
                </h2>
              </div>

              {isBridgePick && (
                <span
                  className="
                    rounded-full
                    border
                    border-white/20
                    bg-white/10
                    px-4
                    py-2
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[0.18em]
                    backdrop-blur-xl
                  "
                >
                  Learn
                </span>
              )}
            </div>

            <p
              className="
                mt-5
                max-w-xl
                text-sm
                font-medium
                leading-7
                text-white/75
              "
            >
              {isBridgePick
                ? "Bridge selected this question specifically for you based on what it already knows about your profile, interests, and experience."
                : "Bridge asks one question at a time. Your answers help your Profile become richer and more useful."}
            </p>

            {!isBridgePick && (
              <div
                className="
                  mt-8
                  rounded-[26px]
                  border
                  border-white/10
                  bg-white/10
                  p-5
                  backdrop-blur-xl
                "
              >
                <div
                  className="
                    flex
                    items-end
                    justify-between
                    gap-4
                  "
                >
                  <div>
                    <p
                      className="
                        text-[9px]
                        font-black
                        uppercase
                        tracking-[0.18em]
                        text-white/50
                      "
                    >
                      Progress
                    </p>

                    <p
                      className="
                        mt-2
                        text-3xl
                        font-black
                      "
                    >
                      {answeredCount}/{bridgeQuestions.length || 0}
                    </p>
                  </div>

                  <p
                    className="
                      text-4xl
                      font-black
                      text-white/80
                    "
                  >
                    {bridgeQuestionProgress}%
                  </p>
                </div>

                <div
                  className="
                    mt-4
                    h-2
                    overflow-hidden
                    rounded-full
                    bg-white/10
                  "
                >
                  <motion.div
                    initial={{
                      width: 0,
                    }}
                    animate={{
                      width: `${bridgeQuestionProgress}%`,
                    }}
                    transition={{
                      duration: 0.9,
                    }}
                    className="
                      h-full
                      rounded-full
                      bg-white
                    "
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =================================================
            EXISTING QUESTION + ANSWER FLOW
        ================================================= */}

        <div className={isBridgePick ? "p-5 md:p-6" : "p-7 md:p-10"}>
          {/* LOADING */}

          {bridgeQuestionsLoading && (
            <div
              className="
                animate-pulse
                rounded-[28px]
                border
                border-slate-100
                bg-slate-50/70
                p-6
              "
            >
              <div
                className="
                  h-3
                  w-28
                  rounded-full
                  bg-slate-200
                "
              />

              <div
                className="
                  mt-4
                  h-7
                  w-4/5
                  rounded-full
                  bg-slate-200
                "
              />

              <div
                className="
                  mt-5
                  h-32
                  rounded-3xl
                  bg-slate-100
                "
              />
            </div>
          )}

          {/* CURRENT QUESTION */}

          {!bridgeQuestionsLoading && nextBridgeQuestion && (
            <form onSubmit={submitBridgeAnswer}>
              {nextBridgeQuestion.bridgeQuestionSet && (
                <p
                  className="
                      text-[10px]
                      font-black
                      uppercase
                      tracking-[0.18em]
                    "
                  style={{
                    color: secondary,
                  }}
                >
                  {nextBridgeQuestion.bridgeQuestionSet}
                </p>
              )}

              <p
                className="
                    mt-2
                    text-xs
                    font-black
                    uppercase
                    tracking-[0.14em]
                    text-slate-400
                  "
              >
                Question {nextBridgeQuestion.questionNumber}
              </p>

              <h3
                className="
                    mt-4
                    text-2xl
                    font-black
                    leading-8
                    tracking-[-0.03em]
                    md:text-3xl
                  "
                style={{
                  color: primary,
                }}
              >
                {nextBridgeQuestion.question}
              </h3>

              {/* WHY ARE WE ASKING */}

              {isBridgePick && (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => setShowWhy((current) => !current)}
                    className="
                        text-sm
                        font-black
                        transition
                        hover:opacity-70
                      "
                    style={{
                      color: secondary,
                    }}
                  >
                    {showWhy ? "Hide explanation ↑" : "Why are we asking? ↓"}
                  </button>

                  {showWhy && (
                    <div
                      className="
                          mt-3
                          rounded-2xl
                          border
                          border-slate-100
                          bg-slate-50
                          px-5
                          py-4
                          text-sm
                          font-medium
                          leading-6
                          text-slate-600
                        "
                    >
                      {nextBridgeQuestion.whyAsked ||
                        "Your answer helps Bridge learn what may be more useful and relevant for you, including better recommendations and potential local connections."}
                    </div>
                  )}
                </div>
              )}

              {/* ANSWER */}

              <textarea
                value={bridgeAnswer}
                onChange={(event) => {
                  setBridgeAnswer(event.target.value);

                  if (bridgeQuestionsError) {
                    setBridgeQuestionsError("");
                  }
                }}
                rows={isBridgePick ? 3 : 6}
                maxLength={4000}
                placeholder="Write your answer here..."
                disabled={bridgeAnswerSubmitting}
                className="
                    mt-6
                    w-full
                    resize-y
                    rounded-[26px]
                    border
                    border-slate-200
                    bg-white
                    px-5
                    py-4
                    text-sm
                    font-medium
                    leading-7
                    text-slate-700
                    shadow-sm
                    outline-none
                    transition
                    placeholder:text-slate-300
                    focus:border-blue-300
                    focus:ring-4
                    focus:ring-blue-100/60
                    disabled:opacity-60
                  "
              />

              <div
                className="
                    mt-4
                    flex
                    flex-col
                    gap-3
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
              >
                <p
                  className="
                      text-xs
                      font-semibold
                      text-slate-400
                    "
                >
                  {bridgeAnswer.length}
                  /4000
                </p>

                <motion.button
                  type="submit"
                  disabled={bridgeAnswerSubmitting || !bridgeAnswer.trim()}
                  whileHover={{
                    y: -2,
                  }}
                  whileTap={{
                    scale: 0.98,
                  }}
                  className="
                      rounded-full
                      px-7
                      py-3.5
                      text-sm
                      font-black
                      text-white
                      shadow-[0_14px_35px_rgba(59,130,246,.25)]
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  style={{
                    background: `linear-gradient(
                        135deg,
                        ${primary},
                        ${secondary}
                      )`,
                  }}
                >
                  {bridgeAnswerSubmitting ? "Submitting..." : "Submit Answer"}
                </motion.button>
              </div>

              {bridgeQuestionsError && (
                <p
                  className="
                      mt-4
                      text-sm
                      font-bold
                      text-rose-600
                    "
                >
                  {bridgeQuestionsError}
                </p>
              )}
            </form>
          )}

          {/* ALL QUESTIONS COMPLETE */}

          {bridgeQuestionsComplete && !isBridgePick && (
            <motion.div
              initial={{
                scale: 0.94,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              className="
                  rounded-[30px]
                  border
                  border-emerald-100
                  bg-emerald-50/80
                  p-7
                "
            >
              <div
                className="
                    flex
                    items-start
                    gap-4
                  "
              >
                <div
                  className="
                      flex
                      h-12
                      w-12
                      shrink-0
                      items-center
                      justify-center
                      rounded-2xl
                      bg-white
                      text-xl
                      font-black
                      text-emerald-600
                      shadow-sm
                    "
                >
                  ✓
                </div>

                <div>
                  <h3
                    className="
                        text-xl
                        font-black
                        text-emerald-900
                      "
                  >
                    You’re all caught up.
                  </h3>

                  <p
                    className="
                        mt-2
                        text-sm
                        font-medium
                        leading-6
                        text-emerald-700
                      "
                  >
                    You’ve answered all currently available Bridge Questions.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ERROR */}

          {!bridgeQuestionsLoading &&
            bridgeQuestionsError &&
            !nextBridgeQuestion && (
              <div
                className="
                  rounded-[28px]
                  border
                  border-amber-100
                  bg-amber-50/80
                  p-6
                "
              >
                <p
                  className="
                    text-sm
                    font-bold
                    text-amber-800
                  "
                >
                  {bridgeQuestionsError}
                </p>
              </div>
            )}

          {/* NO QUESTIONS */}

          {!bridgeQuestionsLoading &&
            !bridgeQuestionsError &&
            bridgeQuestions.length === 0 &&
            !isBridgePick && (
              <div
                className="
                  rounded-[28px]
                  border
                  border-dashed
                  border-slate-200
                  bg-slate-50/70
                  p-7
                "
              >
                <p
                  className="
                    text-sm
                    font-bold
                    text-slate-400
                  "
                >
                  There are no Bridge Questions available right now.
                </p>
              </div>
            )}
        </div>
      </div>
    </section>
  );
}
