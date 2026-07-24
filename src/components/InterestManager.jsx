import { useMemo, useState } from "react";
import toast from "react-hot-toast";
const SUGGESTION_WEBHOOK_URL =
  "https://hook.us2.make.com/vauks401yxgsetpc4q69m8hca47hgpzs";

const SAVE_INTERESTS_WEBHOOK_URL =
  "https://hook.us2.make.com/vkxm4381skpmqty8xkgbkbbgw7bk8c4m";

export default function InterestManager({ rawData, profile }) {
  const initialInterestTags = useMemo(() => {
    const tagsText =
      rawData?.interestTags ||
      rawData?.["Interest Tags"] ||
      rawData?.member?.interestTags ||
      rawData?.member?.["Interest Tags"] ||
      rawData?.recommendations?.interestTags ||
      "";

    return tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }, [rawData]);

  const [interestTags, setInterestTags] = useState(initialInterestTags);
  const [savedInterestTags, setSavedInterestTags] =
    useState(initialInterestTags);
  const [newInterest, setNewInterest] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [interestStatus, setInterestStatus] = useState("");
  const [statusType, setStatusType] = useState("");
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [inputWarning, setInputWarning] = useState("");

  const minRequired = 9;

  const hasChanges =
    JSON.stringify([...interestTags].sort()) !==
    JSON.stringify([...savedInterestTags].sort());

  function addInterest(tag) {
    const clean = tag.trim();
    if (!clean) return;

    setInterestTags((prev) => {
      const exists = prev.some(
        (item) => item.toLowerCase() === clean.toLowerCase(),
      );

      if (exists) return prev;
      return [...prev, clean];
    });

    setSuggestions((prev) =>
      prev.filter((item) => item.toLowerCase() !== clean.toLowerCase()),
    );

    setNewInterest("");
    setInterestStatus("");
    setStatusType("");
    setInputWarning("");
  }

  function deleteInterest(tagToDelete) {
    if (interestTags.length - 1 < minRequired) {
      setInterestStatus(`You must keep at least ${minRequired} interests.`);
      setStatusType("error");
      return;
    }

    setInterestTags((prev) => prev.filter((tag) => tag !== tagToDelete));
    setInterestStatus("");
    setStatusType("");
  }

  function handleInterestTyping(value) {
    setNewInterest(value);
    setSuggestions([]);
    setInterestStatus("");
    setStatusType("");
    setInputWarning("");
  }

  async function getAiSuggestions() {
    if (!newInterest.trim()) return;

    try {
      setSuggestionLoading(true);
      setSuggestions([]);
      setInterestStatus("");
      setStatusType("");

      const res = await fetch(SUGGESTION_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: newInterest.trim(),
          currentInterests: interestTags,
          interestBuckets: rawData?.interestBuckets || "",
        }),
      });

      const data = await res.json();

      const cleanSuggestions = (data.suggestions || [])
        .map((tag) => String(tag).trim())
        .filter(Boolean)
        .filter(
          (tag) =>
            !interestTags.some(
              (existing) => existing.toLowerCase() === tag.toLowerCase(),
            ),
        )
        .slice(0, 8);

      setSuggestions(cleanSuggestions);
    } catch (error) {
      console.error("AI suggestion error:", error);
      setInterestStatus("Could not load suggestions. Please try again.");
      setStatusType("error");
    } finally {
      setSuggestionLoading(false);
    }
  }

  async function saveInterests() {
    if (newInterest.trim()) {
      toast.error(`Click + Add “${newInterest.trim()}” first.`);
      return;
    }

    if (!hasChanges) {
      toast("No interest changes to update.");
      return;
    }

    try {
      setSaveLoading(true);
      setInterestStatus("");
      setStatusType("");
      setInputWarning("");

      const res = await fetch(SAVE_INTERESTS_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: rawData?.email,
          interestTags,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSavedInterestTags(interestTags);
        toast.success("Interests updated successfully!");
        setStatusType("success");
      } else {
        setInterestStatus("Could not update interests. Please try again.");
        setStatusType("error");
      }
    } catch (error) {
      console.error("Save interests error:", error);
      setInterestStatus("Could not update interests. Please try again.");
      setStatusType("error");
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <section className="relative z-10 px-4 pb-10 md:px-6">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-[-0.02em] text-[#071A4A]">
              ⚙ Interests
            </h2>

            <p className="mt-1 text-sm font-medium text-slate-500">
              Update your interests to improve your local recommendations.
            </p>
          </div>

          <div className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500">
            {interestTags.length} selected
          </div>
        </div>

        <div className="mt-5">
          <input
            value={newInterest}
            disabled={suggestionLoading}
            onChange={(e) => handleInterestTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addInterest(newInterest);
              }
            }}
            placeholder={
              suggestionLoading
                ? "Finding related interests..."
                : "Type an interest, like hiking or networking..."
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#071A4A] outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        {newInterest.trim() && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={suggestionLoading}
              onClick={() => addInterest(newInterest)}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              + Add “{newInterest.trim()}”
            </button>

            <button
              type="button"
              onClick={getAiSuggestions}
              disabled={suggestionLoading}
              className="rounded-full px-3 py-1.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: `linear-gradient(135deg, ${
                  profile?.theme?.primary || "#071A4A"
                }, ${profile?.theme?.secondary || "#E67E22"})`,
              }}
            >
              {suggestionLoading
                ? "Finding suggestions..."
                : "✨ Suggest related"}
            </button>

            {inputWarning && (
              <div className="rounded-2xl bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 shadow-sm ring-1 ring-amber-200">
                {inputWarning}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black text-slate-700">Current</p>

            <p className="text-xs font-bold text-slate-400">
              Keep at least {minRequired}
            </p>
          </div>

          {interestTags.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center">
              <p className="text-sm font-bold text-slate-500">
                No interests found yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {interestTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => deleteInterest(tag)}
                  className="group rounded-full border bg-white px-3 py-1.5 text-sm font-bold shadow-sm transition"
                  style={{
                    borderColor: "#E2E8F0",
                    color: "#334155",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      profile?.theme?.primary || "#071A4A";
                    e.currentTarget.style.backgroundColor = `${
                      profile?.theme?.primary || "#071A4A"
                    }15`;
                    e.currentTarget.style.color =
                      profile?.theme?.primary || "#071A4A";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#E2E8F0";
                    e.currentTarget.style.backgroundColor = "white";
                    e.currentTarget.style.color = "#334155";
                  }}
                >
                  {tag}
                  <span className="ml-1.5 opacity-60">×</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {(suggestionLoading || suggestions.length > 0) && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="mb-3 text-sm font-black text-slate-700">
              Suggested for you
            </p>

            {suggestionLoading ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-transparent"
                    style={{
                      borderTopColor: profile?.theme?.primary || "#071A4A",
                    }}
                  />

                  <div>
                    <p className="text-sm font-black text-[#071A4A]">
                      Finding related interests
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      Matching your topic with community, events, and lifestyle
                      signals.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {[
                    "Reading your interest",
                    "Checking your profile",
                    "Finding matches",
                  ].map((label, index) => (
                    <div
                      key={label}
                      className="animate-pulse rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-400 shadow-sm"
                      style={{
                        animationDelay: `${index * 180}ms`,
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full w-1/3 animate-[interestLoading_1.2s_ease-in-out_infinite] rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${
                        profile?.theme?.primary || "#071A4A"
                      }, ${profile?.theme?.secondary || "#E67E22"})`,
                    }}
                  />
                </div>

                <style>
                  {`
                    @keyframes interestLoading {
                      0% { transform: translateX(-120%); }
                      100% { transform: translateX(320%); }
                    }
                  `}
                </style>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addInterest(tag)}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {interestStatus && (
          <p
            className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold ${
              statusType === "success"
                ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                : statusType === "info"
                  ? "bg-slate-50 text-slate-600 ring-1 ring-slate-200"
                  : "bg-red-50 text-red-600 ring-1 ring-red-200"
            }`}
          >
            {interestStatus}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-500">
            Your interests help personalize future recommendations.
          </p>

          <button
            type="button"
            onClick={saveInterests}
            disabled={saveLoading || !hasChanges}
            className="rounded-2xl px-5 py-2.5 text-sm font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
            style={{
              background: `linear-gradient(135deg, ${
                profile?.theme?.primary || "#071A4A"
              }, ${profile?.theme?.secondary || "#E67E22"})`,
            }}
          >
            {saveLoading ? "Saving..." : "Update Interests"}
          </button>
        </div>
      </div>
    </section>
  );
}
