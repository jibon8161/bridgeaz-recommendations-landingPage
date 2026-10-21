import { useState } from "react";
import { Link } from "react-router-dom";

import {
  ArrowLeft,
  FileClock,
  Layers3,
  Link2,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";

import { auth } from "./firebase";

export default function ShareWithBridgePage() {
  const [screen, setScreen] = useState("menu");

  const [sessionId, setSessionId] = useState("");
  const [submissionId, setSubmissionId] = useState("");

  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const [question, setQuestion] = useState("");
  const [followUpAnswer, setFollowUpAnswer] = useState("");

  const [starting, setStarting] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");
  const [reviewRecords, setReviewRecords] = useState([]);
  const [reviewForms, setReviewForms] = useState({});
  const [savingReviewId, setSavingReviewId] = useState("");
  const [reviewSavedId, setReviewSavedId] = useState("");
  const [approvingReviewId, setApprovingReviewId] = useState("");
  const [reviewApprovedId, setReviewApprovedId] = useState("");
  const [savedSessions, setSavedSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionTab, setSessionTab] = useState("drafts");
  const getReviewRecordKey = (record, index = 0) =>
    String(
      record?.id || record?.fields?.["Submission ID"] || `review-${index}`,
    );

  const getReviewText = (fields, fieldName) => {
    const value = fields?.[fieldName];

    if (value === null || value === undefined) {
      return "";
    }

    if (Array.isArray(value)) {
      return value.join(", ");
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  };

  const parseKeywordList = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((keyword) => String(keyword || "").trim())
        .filter(Boolean);
    }

    return String(value || "")
      .split(/[,\n]+/)
      .map((keyword) => keyword.trim())
      .filter(Boolean);
  };

  const createReviewForm = (record) => {
    const fields = record?.fields || {};

    return {
      title: getReviewText(fields, "Working Title"),
      description: getReviewText(fields, "Description"),
      category: getReviewText(fields, "Category"),
      distributionRecommendation: getReviewText(
        fields,
        "Distribution Recommendation",
      ),
      approvedKeywords: parseKeywordList(fields["Approved Keywords"]),
      keywordDraft: "",
    };
  };

  const buildReviewPayload = (record, form) => {
    const fields = record?.fields || {};

    return {
      title: form.title.trim(),
      description: form.description.trim(),
      submissionType: getReviewText(fields, "Submission Type"),
      guidedContributionPath: getReviewText(fields, "Guided Contribution Path"),
      contributorRelationship: getReviewText(
        fields,
        "Contributor Relationship",
      ),
      sourceCredit: getReviewText(fields, "Source Credit"),
      authorityConfirmed: fields["Authority Confirmed"] === true,
      link: getReviewText(fields, "Link"),
      sourceExcerptLocator: getReviewText(fields, "Source Excerpt / Locator"),
      category: form.category.trim(),
      organizationBusiness: getReviewText(fields, "Organization / Business"),
      contactEmail: getReviewText(fields, "Contact Email"),
      contactPhone: getReviewText(fields, "Contact Phone"),
      startDateTime: getReviewText(fields, "Start Date & Time"),
      endDateTime: getReviewText(fields, "End Date & Time"),
      location: getReviewText(fields, "Location"),
      cost: getReviewText(fields, "Cost"),
      callToAction: getReviewText(fields, "Call To Action"),
      whoItHelps: getReviewText(fields, "Who It Helps"),
      problemItSolves: getReviewText(fields, "Problem It Solves"),
      additionalDetails: getReviewText(fields, "Additional Details"),
      isRecurring: fields["Is Recurring"] === true,
      recurrenceFrequency: getReviewText(fields, "Recurrence Frequency"),
      recurrenceDetails: getReviewText(fields, "Recurrence Details"),
      recurrenceRule: getReviewText(fields, "Recurrence Rule"),
      recurrenceUntil: getReviewText(fields, "Recurrence Until"),
      approvedKeywords: Array.isArray(form.approvedKeywords)
        ? form.approvedKeywords
        : [],
      publicValueScore: getReviewText(fields, "Public Value Score"),
      geographicScope: getReviewText(fields, "Geographic Scope"),
      distributionRecommendation: form.distributionRecommendation.trim(),
      repurposingSuggestions: getReviewText(fields, "Repurposing Suggestions"),
      duplicateCheckStatus: getReviewText(fields, "Duplicate Check Status"),
      duplicateCheckResults: getReviewText(fields, "Duplicate Check Results"),
      verificationStatus: getReviewText(fields, "Verification Status"),
      verificationNotes: getReviewText(fields, "Verification Notes"),
      expiresOn: getReviewText(fields, "Expires On"),
      expirationBasis: getReviewText(fields, "Expiration Basis"),
    };
  };

  const handleReviewFieldChange = (recordKey, fieldName, value) => {
    setReviewForms((current) => ({
      ...current,
      [recordKey]: {
        ...(current[recordKey] || {}),
        [fieldName]: value,
      },
    }));

    if (reviewSavedId === recordKey) {
      setReviewSavedId("");
    }
  };

  const handleAddApprovedKeyword = (recordKey, rawKeyword) => {
    const keyword = String(rawKeyword || "").trim();

    if (!keyword) {
      return;
    }

    setReviewForms((current) => {
      const currentForm = current[recordKey] || {};
      const currentKeywords = Array.isArray(currentForm.approvedKeywords)
        ? currentForm.approvedKeywords
        : [];

      const alreadyExists = currentKeywords.some(
        (item) => item.toLowerCase() === keyword.toLowerCase(),
      );

      return {
        ...current,
        [recordKey]: {
          ...currentForm,
          approvedKeywords: alreadyExists
            ? currentKeywords
            : [...currentKeywords, keyword],
          keywordDraft: "",
        },
      };
    });

    if (reviewSavedId === recordKey) {
      setReviewSavedId("");
    }
  };

  const handleRemoveApprovedKeyword = (recordKey, keywordToRemove) => {
    setReviewForms((current) => {
      const currentForm = current[recordKey] || {};
      const currentKeywords = Array.isArray(currentForm.approvedKeywords)
        ? currentForm.approvedKeywords
        : [];

      return {
        ...current,
        [recordKey]: {
          ...currentForm,
          approvedKeywords: currentKeywords.filter(
            (keyword) => keyword !== keywordToRemove,
          ),
        },
      };
    });

    if (reviewSavedId === recordKey) {
      setReviewSavedId("");
    }
  };

  /* =====================================================
     START NEW SESSION
  ===================================================== */

  const handleNewSubmission = async () => {
    try {
      setStarting(true);
      setError("");

      const currentUser = auth.currentUser;

      if (!currentUser) {
        setError("You need to be signed in.");
        return;
      }

      const idToken = await currentUser.getIdToken();

      const response = await fetch(
        "https://bridgeaz-recommendations-server.vercel.app/api/share-with-bridge/start",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
        },
      );

      const data = await response.json();

      console.log("SHARE WITH BRIDGE START:", response.status, data);

      if (!response.ok || !data?.success || !data?.sessionId) {
        setError(
          data?.error || "Could not start your Share With Bridge session.",
        );

        return;
      }

      setSessionId(data.sessionId);
      setScreen("new");
    } catch (error) {
      console.error("Share With Bridge START failed:", error);

      setError("Could not start your Share With Bridge session.");
    } finally {
      setStarting(false);
    }
  };

  /* =====================================================
     FIRST PROCESS
  ===================================================== */

  const handleProcessSubmission = async () => {
    try {
      setError("");

      const cleanDescription = description.trim();
      const cleanSourceUrl = sourceUrl.trim();

      if (!cleanDescription && !cleanSourceUrl) {
        setError("Please describe what you want to share or add a link.");
        return;
      }

      if (!sessionId) {
        setError("Your Share With Bridge session is missing.");
        return;
      }

      const currentUser = auth.currentUser;

      if (!currentUser) {
        setError("You need to be signed in.");
        return;
      }

      setProcessing(true);

      const idToken = await currentUser.getIdToken();

      const response = await fetch(
        "https://bridgeaz-recommendations-server.vercel.app/api/share-with-bridge/process",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },

          body: JSON.stringify({
            sessionId,

            description: cleanDescription,

            sources: cleanSourceUrl
              ? [
                  {
                    url: cleanSourceUrl,
                    kind: "website",
                  },
                ]
              : [],
          }),
        },
      );

      const data = await response.json();

      console.log("SHARE WITH BRIDGE PROCESS:", response.status, data);

      if (!response.ok || !data?.success) {
        setError(
          data?.message ||
            data?.error ||
            "Bridge could not process this submission.",
        );

        return;
      }

      const returnedSubmissionId =
        data?.submissionId ||
        data?.draftSubmissionIds?.[0] ||
        data?.items?.[0]?.submissionId ||
        "";

      if (returnedSubmissionId) {
        setSubmissionId(returnedSubmissionId);
      }

      /* =====================================================
         AI NEEDS MORE INFORMATION
      ===================================================== */

      if (
        data?.nextAction === "ask_question" &&
        Array.isArray(data?.questions) &&
        data.questions.length > 0
      ) {
        setQuestion(
          data.questions[0]?.question ||
            "Bridge needs a little more information.",
        );

        setFollowUpAnswer("");

        setScreen("question");

        return;
      }

      /* =====================================================
         READY FOR REVIEW
      ===================================================== */

      if (data?.nextAction === "ready_for_review") {
        setScreen("ready");
      }
    } catch (error) {
      console.error("Share With Bridge PROCESS failed:", error);

      setError("Bridge could not process this submission.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveForLater = async () => {
    try {
      setError("");

      if (!sessionId) {
        setError("Your Share With Bridge session is missing.");
        return;
      }

      const currentUser = auth.currentUser;

      if (!currentUser) {
        setError("You need to be signed in.");
        return;
      }

      setProcessing(true);

      const idToken = await currentUser.getIdToken();

      const response = await fetch(
        "https://bridgeaz-recommendations-server.vercel.app/api/share-with-bridge/save",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },

          body: JSON.stringify({
            sessionId,

            description: description.trim(),

            sourceUrl: sourceUrl.trim(),

            sources: sourceUrl.trim()
              ? [
                  {
                    url: sourceUrl.trim(),
                    kind: "website",
                  },
                ]
              : [],

            saveAndFinishLater: true,
          }),
        },
      );

      const data = await response.json();

      console.log("SHARE WITH BRIDGE SAVE:", response.status, data);

      if (!response.ok || !data?.success) {
        setError(data?.message || data?.error || "Could not save your draft.");

        return;
      }

      setSessionId("");
      setSubmissionId("");
      setDescription("");
      setSourceUrl("");
      setQuestion("");
      setFollowUpAnswer("");

      setScreen("menu");
    } catch (error) {
      console.error("Share With Bridge SAVE failed:", error);

      setError("Could not save your draft.");
    } finally {
      setProcessing(false);
    }
  };

const handleResumeSession = async (resumeSessionId, savedFields = {}) => {
  try {
    setError("");

    const cleanSessionId = String(resumeSessionId || "").trim();

    if (!cleanSessionId) {
      setError("This saved draft could not be identified.");
      return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("You need to be signed in.");
      return;
    }

    setProcessing(true);

    const idToken = await currentUser.getIdToken();

    const response = await fetch(
      "https://bridgeaz-recommendations-server.vercel.app/api/share-with-bridge/resume",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          sessionId: cleanSessionId,
        }),
      },
    );

    const data = await response.json();

    console.log("SHARE WITH BRIDGE RESUME:", response.status, data);

    if (!response.ok || !data?.success) {
      setError(data?.message || data?.error || "Could not resume this draft.");
      return;
    }

    /* =====================================================
       NORMALIZE SESSION LOOKUP
    ===================================================== */

    let sessionLookup = data?.sessionLookup || data?.session || null;

    if (typeof sessionLookup === "string") {
      try {
        sessionLookup = JSON.parse(sessionLookup);
      } catch {
        sessionLookup = null;
      }
    }

    const sessionRecord =
      sessionLookup?.records?.[0] ||
      sessionLookup?.body?.records?.[0] ||
      sessionLookup ||
      null;

  const fields =
    sessionRecord?.fields && Object.keys(sessionRecord.fields).length > 0
      ? sessionRecord.fields
      : savedFields;

    /* =====================================================
       RESTORE SAVED DRAFT
    ===================================================== */

    setSessionId(cleanSessionId);

    setDescription(String(fields["Source Text"] || fields.description || ""));

    setSourceUrl(String(fields["Source Links"] || fields.source || ""));

    setSubmissionId("");
    setQuestion("");
    setFollowUpAnswer("");

    setScreen("new");
  } catch (error) {
    console.error("Share With Bridge RESUME failed:", error);

    setError("Could not resume this draft.");
  } finally {
    setProcessing(false);
  }
};

  const handleLoadSessions = async () => {
    try {
      setError("");
      setLoadingSessions(true);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        setError("You need to be signed in.");
        return;
      }

      const idToken = await currentUser.getIdToken();

      const response = await fetch(
        "https://bridgeaz-recommendations-server.vercel.app/api/share-with-bridge/sessions",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        },
      );

      const data = await response.json();

      console.log("SHARE WITH BRIDGE LIST_SESSIONS:", response.status, data);

      if (!response.ok || !data?.success) {
        setError(
          data?.message ||
            data?.error ||
            "Could not load your saved submissions.",
        );

        return;
      }

      setSavedSessions(Array.isArray(data?.sessions) ? data.sessions : []);
      setScreen("sessions");
    } catch (error) {
      console.error("Share With Bridge LIST_SESSIONS failed:", error);

      setError("Could not load your saved submissions.");
    } finally {
      setLoadingSessions(false);
    }
  };

  /* =====================================================
     SEND CLARIFICATION ANSWER
  ===================================================== */

  const handleFollowUp = async () => {
    try {
      setError("");

      const cleanAnswer = followUpAnswer.trim();

      if (!cleanAnswer) {
        setError("Please answer Bridge's question.");
        return;
      }

      if (!sessionId || !submissionId) {
        setError("Your Share With Bridge submission could not be identified.");
        return;
      }

      const currentUser = auth.currentUser;

      if (!currentUser) {
        setError("You need to be signed in.");
        return;
      }

      setProcessing(true);

      const idToken = await currentUser.getIdToken();

      const response = await fetch(
        "https://bridgeaz-recommendations-server.vercel.app/api/share-with-bridge/process",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },

          body: JSON.stringify({
            sessionId,

            /*
              IMPORTANT:
              Reuse the SAME submission.
            */
            submissionId,

            description: description.trim(),

            sources: sourceUrl.trim()
              ? [
                  {
                    url: sourceUrl.trim(),
                    kind: "website",
                  },
                ]
              : [],

            followUpAnswer: cleanAnswer,
          }),
        },
      );

      const data = await response.json();

      console.log("SHARE WITH BRIDGE FOLLOW-UP:", response.status, data);

      if (!response.ok || !data?.success) {
        setError(
          data?.message ||
            data?.error ||
            "Bridge could not process your answer.",
        );

        return;
      }

      /*
        Bridge may ask another focused clarification.
      */

      if (
        data?.nextAction === "ask_question" &&
        Array.isArray(data?.questions) &&
        data.questions.length > 0
      ) {
        setQuestion(
          data.questions[0]?.question ||
            "Bridge needs a little more information.",
        );

        setFollowUpAnswer("");

        return;
      }

      /*
        Otherwise the draft is ready for review.
      */

      if (data?.nextAction === "ready_for_review") {
        setScreen("ready");
      }
    } catch (error) {
      console.error("Share With Bridge FOLLOW-UP failed:", error);

      setError("Bridge could not process your answer.");
    } finally {
      setProcessing(false);
    }
  };

  const handleLoadReview = async () => {
    try {
      setError("");

      if (!sessionId) {
        setError("Your Share With Bridge session is missing.");
        return;
      }

      const currentUser = auth.currentUser;

      if (!currentUser) {
        setError("You need to be signed in.");
        return;
      }

      const idToken = await currentUser.getIdToken();

      const response = await fetch(
        "https://bridgeaz-recommendations-server.vercel.app/api/share-with-bridge/review",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },

          body: JSON.stringify({
            sessionId,
          }),
        },
      );

      const data = await response.json();

      console.log("SHARE WITH BRIDGE REVIEW_GET:", response.status, data);

      if (!response.ok || !data?.success) {
        setError(data?.message || data?.error || "Could not load your review.");

        return;
      }

      const records = Array.isArray(data?.records) ? data.records : [];
      const forms = {};

      records.forEach((record, index) => {
        forms[getReviewRecordKey(record, index)] = createReviewForm(record);
      });

      setReviewRecords(records);
      setReviewForms(forms);
      setReviewSavedId("");
      setScreen("review");
    } catch (error) {
      console.error("Share With Bridge REVIEW_GET failed:", error);

      setError("Could not load your review.");
    }
  };

  const handleSaveReview = async (record, index) => {
    const recordKey = getReviewRecordKey(record, index);
    const fields = record?.fields || {};
    const currentSubmissionId = String(fields["Submission ID"] || "").trim();
    const form = reviewForms[recordKey] || createReviewForm(record);

    try {
      setError("");
      setReviewSavedId("");

      if (!sessionId) {
        setError("Your Share With Bridge session is missing.");
        return;
      }

      if (!currentSubmissionId) {
        setError("This Share With Bridge submission ID is missing.");
        return;
      }

      if (!form.title.trim()) {
        setError("Please add a title before saving your review.");
        return;
      }

      if (!form.description.trim()) {
        setError("Please add a description before saving your review.");
        return;
      }

      const currentUser = auth.currentUser;

      if (!currentUser) {
        setError("You need to be signed in.");
        return;
      }

      setSavingReviewId(recordKey);

      const idToken = await currentUser.getIdToken();
      const reviewPayload = buildReviewPayload(record, form);

      const response = await fetch(
        "https://bridgeaz-recommendations-server.vercel.app/api/share-with-bridge/review-update",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },

          body: JSON.stringify({
            sessionId,
            submissionId: currentSubmissionId,
            reviewPayload,
          }),
        },
      );

      const data = await response.json();

      console.log("SHARE WITH BRIDGE REVIEW_UPDATE:", response.status, data);

      if (!response.ok || !data?.success) {
        setError(
          data?.message || data?.error || "Could not save your review changes.",
        );
        return;
      }

      const returnedFields = data?.record?.fields || null;

      setReviewRecords((current) =>
        current.map((item, itemIndex) => {
          const itemKey = getReviewRecordKey(item, itemIndex);

          if (itemKey !== recordKey) {
            return item;
          }

          return {
            ...item,
            fields: {
              ...(item?.fields || {}),
              ...(returnedFields || {}),
              "Working Title": form.title.trim(),
              Description: form.description.trim(),
              Category: form.category.trim(),
              "Approved Keywords": form.approvedKeywords.join(", "),
              "Distribution Recommendation":
                form.distributionRecommendation.trim(),
            },
          };
        }),
      );

      setReviewSavedId(recordKey);
      setReviewApprovedId("");
    } catch (error) {
      console.error("Share With Bridge REVIEW_UPDATE failed:", error);

      setError("Could not save your review changes.");
    } finally {
      setSavingReviewId("");
    }
  };

  const handleApproveReview = async (record, index) => {
    const recordKey = getReviewRecordKey(record, index);
    const fields = record?.fields || {};
    const currentSubmissionId = String(fields["Submission ID"] || "").trim();

    try {
      setError("");
      setReviewApprovedId("");

      if (!sessionId) {
        setError("Your Share With Bridge session is missing.");
        return;
      }

      if (!currentSubmissionId) {
        setError("This Share With Bridge submission ID is missing.");
        return;
      }

      /*
      Require the member to save their latest edits first.
    */
      if (reviewSavedId !== recordKey) {
        setError(
          "Please save your latest changes before approving this submission.",
        );
        return;
      }

      const currentUser = auth.currentUser;

      if (!currentUser) {
        setError("You need to be signed in.");
        return;
      }

      setApprovingReviewId(recordKey);

      const idToken = await currentUser.getIdToken();

      const response = await fetch(
        "https://bridgeaz-recommendations-server.vercel.app/api/share-with-bridge/review-approve",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },

          body: JSON.stringify({
            sessionId,
            submissionId: currentSubmissionId,
            confirmApproval: true,
          }),
        },
      );

      const data = await response.json();

      console.log("SHARE WITH BRIDGE REVIEW_APPROVE:", response.status, data);

      if (!response.ok || !data?.success) {
        setError(
          data?.message || data?.error || "Could not approve this submission.",
        );

        return;
      }

      const returnedFields = data?.record?.fields || null;

      setReviewRecords((current) =>
        current.map((item, itemIndex) => {
          const itemKey = getReviewRecordKey(item, itemIndex);

          if (itemKey !== recordKey) {
            return item;
          }

          return {
            ...item,
            fields: {
              ...(item?.fields || {}),
              ...(returnedFields || {}),
              Status: "Signed Off",
              "Contributor Signed Off": true,
            },
          };
        }),
      );

      setReviewApprovedId(recordKey);
      setReviewSavedId("");
    } catch (error) {
      console.error("Share With Bridge REVIEW_APPROVE failed:", error);

      setError("Could not approve this submission.");
    } finally {
      setApprovingReviewId("");
    }
  };

  /* =====================================================
     RESET
  ===================================================== */

  const handleBackToMenu = () => {
    setScreen("menu");

    setSessionId("");
    setSubmissionId("");

    setDescription("");
    setSourceUrl("");

    setQuestion("");
    setFollowUpAnswer("");

    setReviewRecords([]);
    setReviewForms({});
    setSavingReviewId("");
    setReviewSavedId("");

    setError("");
  };

  /* =====================================================
   DRAFTS & PREVIOUS SCREEN
===================================================== */

  if (screen === "sessions") {
    
    const filteredSessions = savedSessions.filter((session) => {
      const fields = session?.fields || session || {};

      const status = String(fields.Status || fields.status || "").trim();

      const description = String(
        fields["Source Text"] || fields.description || "",
      ).trim();

      const hasContent = Boolean(description);

      if (sessionTab === "drafts") {
        return (
          status === "Saved - Finish Later" ||
          status === "Collecting" ||
          (status === "Started" && hasContent)
        );
      }

      if (sessionTab === "previous") {
        return status === "Completed" || status === "In Review";
      }

      return false;
    });
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FBF8FF] via-white to-[#F7F3FF]">
        <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
          <button
            type="button"
            onClick={() => setScreen("menu")}
            className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#7C3AED]"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="mt-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0E7FF] text-[#7C3AED]">
              <FileClock size={23} />
            </div>

            <h1 className="mt-5 text-3xl font-bold text-slate-900">
              Drafts & Previous
            </h1>

            <p className="mt-3 text-base leading-7 text-slate-600">
              Continue an unfinished submission or review something you shared
              before.
            </p>
            <div className="mt-6 flex gap-2 rounded-2xl bg-purple-50 p-1">
              <button
                type="button"
                onClick={() => setSessionTab("drafts")}
                className={`flex-1 cursor-pointer rounded-xl px-4 py-3 text-sm font-black transition ${
                  sessionTab === "drafts"
                    ? "bg-white text-[#7C3AED] shadow-sm"
                    : "text-slate-500 hover:text-[#7C3AED]"
                }`}
              >
                Drafts
              </button>

              <button
                type="button"
                onClick={() => setSessionTab("previous")}
                className={`flex-1 cursor-pointer rounded-xl px-4 py-3 text-sm font-black transition ${
                  sessionTab === "previous"
                    ? "bg-white text-[#7C3AED] shadow-sm"
                    : "text-slate-500 hover:text-[#7C3AED]"
                }`}
              >
                Previous
              </button>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {filteredSessions.length === 0 ? (
              <div className="rounded-3xl border border-purple-100 bg-white p-6 text-center shadow-sm">
                <p className="text-sm font-semibold text-slate-700">
                  No saved submissions found.
                </p>
              </div>
            ) : (
              filteredSessions.map((session, index) => {
                const fields = session?.fields || session || {};

                const currentSessionId =
                  fields["Session ID"] || fields.sessionId || "";

             const rawStatus = fields.Status || fields.status || "Unknown";

             const status = sessionTab === "previous" ? "Complete" : rawStatus;

                const description =
                  fields["Source Text"] ||
                  fields.description ||
                  "Untitled submission";

                return (
                  <div
                    key={currentSessionId || index}
                    className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-[#7C3AED]">
                          {status}
                        </p>

                        <p className="mt-2 text-base font-semibold text-slate-900">
                          {description}
                        </p>
                      </div>

                      {currentSessionId && sessionTab === "drafts" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleResumeSession(currentSessionId, fields)
                          }
                          disabled={processing}
                          className="cursor-pointer rounded-2xl bg-[#7C3AED] px-5 py-3 text-sm font-black text-white transition hover:bg-[#6D28D9] disabled:cursor-wait disabled:opacity-60"
                        >
                          Continue
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     CLARIFICATION QUESTION SCREEN
  ===================================================== */

  if (screen === "question") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FBF8FF] via-white to-[#F7F3FF]">
        <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
          <button
            type="button"
            onClick={() => setScreen("new")}
            className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#7C3AED]"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="mt-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0E7FF] text-[#7C3AED]">
              <Sparkles size={23} />
            </div>

            <h1 className="mt-5 text-3xl font-bold text-slate-900">
              Bridge needs one more detail
            </h1>

            <p className="mt-3 text-base leading-7 text-slate-600">
              Bridge AI found most of what it needs, but it needs a little more
              information before preparing your submission for review.
            </p>
          </div>

          <div className="mt-8 rounded-3xl border border-purple-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="rounded-2xl bg-purple-50 p-5">
              <p className="text-xs font-black uppercase tracking-wide text-[#7C3AED]">
                Bridge asks
              </p>

              <p className="mt-2 text-base font-semibold leading-7 text-slate-800">
                {question}
              </p>
            </div>

            <textarea
              value={followUpAnswer}
              onChange={(event) => setFollowUpAnswer(event.target.value)}
              placeholder="Type your answer here..."
              rows={6}
              className="mt-6 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#9A4DFF] focus:ring-4 focus:ring-purple-100"
            />

            {error && (
              <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleFollowUp}
              disabled={processing}
              className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#A92EFF] px-5 py-4 text-sm font-black text-white transition ${
                processing
                  ? "cursor-wait opacity-70"
                  : "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg"
              }`}
            >
              {processing && <Loader2 size={18} className="animate-spin" />}

              {processing ? "Bridge AI is updating..." : "Continue"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     REVIEW SCREEN
  ===================================================== */

  if (screen === "review") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FBF8FF] via-white to-[#F7F3FF]">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
          <button
            type="button"
            onClick={() => setScreen("ready")}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full px-1 py-2 text-sm font-semibold text-slate-600 transition hover:text-[#7C3AED]"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="mt-8 overflow-hidden rounded-[32px] border border-purple-100 bg-white shadow-[0_20px_70px_rgba(124,58,237,0.10)]">
            <div className="border-b border-purple-100 bg-gradient-to-br from-[#FBF8FF] via-white to-[#F4ECFF] px-6 py-8 sm:px-10 sm:py-10">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-white text-[#7C3AED] shadow-sm ring-1 ring-purple-100">
                    <Sparkles size={25} />
                  </div>

                  <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#8B5CF6]">
                    Bridge AI review
                  </p>

                  <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                    Review your submission
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                    Check Bridge&apos;s draft, make any corrections, choose the
                    keywords you approve, then save your changes.
                  </p>
                </div>

                <div className="rounded-2xl border border-purple-100 bg-white/90 px-4 py-3 text-sm shadow-sm">
                  <p className="font-bold text-slate-800">
                    {reviewRecords.length}{" "}
                    {reviewRecords.length === 1 ? "submission" : "submissions"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Ready for your review
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-8">
              {error && (
                <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}

              {reviewRecords.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                  <p className="text-base font-bold text-slate-800">
                    No reviewable submissions found
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Bridge did not return any reviewable items for this session.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {reviewRecords.map((record, index) => {
                    const fields = record?.fields || {};
                    const recordKey = getReviewRecordKey(record, index);
                    const form =
                      reviewForms[recordKey] || createReviewForm(record);

                    const suggestedKeywords = parseKeywordList(
                      fields["AI Suggested Keywords"],
                    );

                    const submissionType =
                      fields["Submission Type"] || "Submission";

                    const status = fields["Status"] || "In review";

                    const currentSubmissionId = fields["Submission ID"] || "";
                    const isSaving = savingReviewId === recordKey;
                    const isSaved = reviewSavedId === recordKey;
                    const isApproving = approvingReviewId === recordKey;
                    const isApproved = reviewApprovedId === recordKey;

                    if (isApproved) {
                      return (
                        <article
                          key={recordKey}
                          className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm"
                        >
                          <div className="px-6 py-12 text-center sm:px-10 sm:py-16">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                              <Sparkles size={28} />
                            </div>

                            <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                              Complete
                            </p>

                            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                              Thank you! Your submission is complete.
                            </h2>

                            <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-600">
                              Bridge has saved your final version.
                            </p>
                            <Link
                              to="/"
                              className="mx-auto mt-7 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#A92EFF] px-6 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-lg"
                            >
                              <ArrowLeft size={17} />
                              Back to Home
                            </Link>
                          </div>
                        </article>
                      );
                    }

                    return (
                      <article
                        key={recordKey}
                        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                      >
                        <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-black text-[#7C3AED]">
                                  {submissionType}
                                </span>

                                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                                  {status}
                                </span>
                              </div>

                              <label className="mt-5 block">
                                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                  Title
                                </span>

                                <input
                                  type="text"
                                  value={form.title}
                                  onChange={(event) =>
                                    handleReviewFieldChange(
                                      recordKey,
                                      "title",
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-lg font-bold text-slate-900 outline-none transition focus:border-[#9A4DFF] focus:ring-4 focus:ring-purple-100"
                                />
                              </label>
                            </div>

                            <div className="shrink-0 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                              Item {index + 1}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.35fr_0.65fr]">
                          <div className="space-y-6">
                            <label className="block">
                              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                Description
                              </span>

                              <textarea
                                value={form.description}
                                onChange={(event) =>
                                  handleReviewFieldChange(
                                    recordKey,
                                    "description",
                                    event.target.value,
                                  )
                                }
                                rows={8}
                                className="mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-[#9A4DFF] focus:bg-white focus:ring-4 focus:ring-purple-100"
                              />
                            </label>

                            <label className="block">
                              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                Distribution recommendation
                              </span>

                              <textarea
                                value={form.distributionRecommendation}
                                onChange={(event) =>
                                  handleReviewFieldChange(
                                    recordKey,
                                    "distributionRecommendation",
                                    event.target.value,
                                  )
                                }
                                placeholder="No distribution recommendation yet."
                                rows={5}
                                className="mt-3 w-full resize-y rounded-2xl border border-purple-100 bg-purple-50/60 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-[#9A4DFF] focus:bg-white focus:ring-4 focus:ring-purple-100"
                              />
                            </label>
                          </div>

                          <div className="space-y-4">
                            <label className="block rounded-2xl border border-slate-200 p-4">
                              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                Category
                              </span>

                              <input
                                type="text"
                                value={form.category}
                                onChange={(event) =>
                                  handleReviewFieldChange(
                                    recordKey,
                                    "category",
                                    event.target.value,
                                  )
                                }
                                placeholder="Add a category"
                                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#9A4DFF] focus:ring-4 focus:ring-purple-100"
                              />
                            </label>

                            <section className="rounded-2xl border border-slate-200 p-4">
                              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                AI suggested keywords
                              </p>

                              {suggestedKeywords.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {suggestedKeywords.map((keyword) => (
                                    <button
                                      key={keyword}
                                      type="button"
                                      onClick={() =>
                                        handleAddApprovedKeyword(
                                          recordKey,
                                          keyword,
                                        )
                                      }
                                      className="cursor-pointer rounded-full bg-purple-50 px-3 py-1.5 text-xs font-bold text-[#7C3AED] transition hover:bg-purple-100"
                                      title="Add to approved keywords"
                                    >
                                      + {keyword}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-2 text-sm text-slate-500">
                                  None
                                </p>
                              )}
                            </section>

                            <section className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4">
                              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#7C3AED]">
                                Approved keywords
                              </p>

                              {form.approvedKeywords.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {form.approvedKeywords.map((keyword) => (
                                    <button
                                      key={keyword}
                                      type="button"
                                      onClick={() =>
                                        handleRemoveApprovedKeyword(
                                          recordKey,
                                          keyword,
                                        )
                                      }
                                      className="cursor-pointer rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-purple-100 transition hover:text-red-600 hover:ring-red-100"
                                      title="Remove approved keyword"
                                    >
                                      {keyword} ×
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-2 text-xs leading-5 text-slate-500">
                                  None selected. Saving with this empty
                                  intentionally approves no keywords.
                                </p>
                              )}

                              <div className="mt-3 flex gap-2">
                                <input
                                  type="text"
                                  value={form.keywordDraft}
                                  onChange={(event) =>
                                    handleReviewFieldChange(
                                      recordKey,
                                      "keywordDraft",
                                      event.target.value,
                                    )
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      handleAddApprovedKeyword(
                                        recordKey,
                                        form.keywordDraft,
                                      );
                                    }
                                  }}
                                  placeholder="Add keyword"
                                  className="min-w-0 flex-1 rounded-xl border border-purple-100 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#9A4DFF] focus:ring-4 focus:ring-purple-100"
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAddApprovedKeyword(
                                      recordKey,
                                      form.keywordDraft,
                                    )
                                  }
                                  className="cursor-pointer rounded-xl bg-white px-3 py-2.5 text-xs font-black text-[#7C3AED] shadow-sm ring-1 ring-purple-100 transition hover:bg-purple-50"
                                >
                                  Add
                                </button>
                              </div>
                            </section>

                            <section className="rounded-2xl border border-slate-200 p-4">
                              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                Submission ID
                              </p>

                              <p className="mt-2 break-all font-mono text-[11px] leading-5 text-slate-500">
                                {currentSubmissionId || "Not available"}
                              </p>
                            </section>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-7">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-xs leading-5 text-slate-500">
                                Save your corrections before approving this
                                submission.
                              </p>

                              {isSaved && (
                                <p className="mt-1 text-sm font-bold text-emerald-700">
                                  Changes saved successfully.
                                </p>
                              )}
                              {isSaved && (
                                <p className="mt-1 text-xs leading-5 text-emerald-700">
                                  Your updates have been saved. Review
                                  everything above, then approve when you're
                                  ready.
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSaveReview(record, index)}
                              disabled={isSaving}
                              className={`flex min-w-[150px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#A92EFF] px-5 py-3 text-sm font-black text-white transition ${
                                isSaving
                                  ? "cursor-wait opacity-70"
                                  : "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg"
                              }`}
                            >
                              {isSaving && (
                                <Loader2 size={17} className="animate-spin" />
                              )}

                              {isSaving ? "Saving..." : "Save Changes"}
                            </button>
                            {isSaved && !isApproved && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleApproveReview(record, index)
                                }
                                disabled={isApproving}
                                className={`flex min-w-[180px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition ${
                                  isApproving
                                    ? "cursor-wait opacity-70"
                                    : "cursor-pointer hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg"
                                }`}
                              >
                                {isApproving && (
                                  <Loader2 size={17} className="animate-spin" />
                                )}

                                {isApproving
                                  ? "Approving..."
                                  : "Approve Final Version"}
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     TEMP READY FOR REVIEW SCREEN
  ===================================================== */

  if (screen === "ready") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FBF8FF] via-white to-[#F7F3FF]">
        <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
          <div className="rounded-3xl border border-purple-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-[#7C3AED]">
              <Sparkles size={27} />
            </div>

            <h1 className="mt-5 text-3xl font-bold text-slate-900">
              Ready for review
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-600">
              Bridge AI has prepared your submission. The review screen is the
              next part we&apos;ll connect.
            </p>

            <p className="mt-6 break-all text-xs text-slate-400">
              Submission: {submissionId}
            </p>
            <button
              type="button"
              onClick={handleLoadReview}
              className="mt-6 rounded-2xl bg-[#7C3AED] px-6 py-3 text-sm font-bold text-white"
            >
              Load Review
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     NEW SUBMISSION SCREEN
  ===================================================== */

  if (screen === "new") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FBF8FF] via-white to-[#F7F3FF]">
        <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
          <button
            type="button"
            onClick={handleBackToMenu}
            className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#7C3AED]"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="mt-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0E7FF] text-[#7C3AED]">
              <Plus size={23} />
            </div>

            <h1 className="mt-5 text-3xl font-bold text-slate-900 sm:text-4xl">
              New Submission
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Tell Bridge what you want to share. You can describe it in your
              own words, paste a link, or do both.
            </p>
          </div>

          <div className="mt-8 rounded-3xl border border-purple-100 bg-white p-6 shadow-sm sm:p-8">
            <label className="block">
              <span className="text-sm font-bold text-slate-800">
                What would you like to share?
              </span>

              <span className="mt-1 block text-xs leading-5 text-slate-500">
                An event, resource, opportunity, announcement, article, or
                anything useful to the community.
              </span>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Example: There is a free small business workshop next Thursday at the library..."
                rows={7}
                className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#9A4DFF] focus:ring-4 focus:ring-purple-100"
              />
            </label>

            <label className="mt-6 block">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Link2 size={16} />
                Link
                <span className="font-medium text-slate-400">optional</span>
              </span>

              <input
                type="url"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://example.com"
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#9A4DFF] focus:ring-4 focus:ring-purple-100"
              />
            </label>

            {error && (
              <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleProcessSubmission}
              disabled={processing}
              className={`mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#A92EFF] px-5 py-4 text-sm font-black text-white transition ${
                processing
                  ? "cursor-wait opacity-70"
                  : "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg"
              }`}
            >
              {processing && <Loader2 size={18} className="animate-spin" />}

              {processing
                ? "Bridge AI is preparing..."
                : "Continue with Bridge AI"}
            </button>

            <button
              type="button"
              onClick={handleSaveForLater}
              disabled={processing}
              className={`mt-3 flex w-full items-center justify-center rounded-2xl border border-purple-200 bg-white px-5 py-3.5 text-sm font-black text-[#7C3AED] transition ${
                processing
                  ? "cursor-wait opacity-70"
                  : "cursor-pointer hover:bg-purple-50"
              }`}
            >
              Save & Finish Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     MAIN MENU
  ===================================================== */

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FBF8FF] via-white to-[#F7F3FF]">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Link
          to="/"
          className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#7C3AED]"
        >
          <ArrowLeft size={18} />
          Back to Home
        </Link>

        <div className="mt-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0E7FF] text-[#7C3AED]">
            <Sparkles size={27} />
          </div>

          <h1 className="mt-5 text-3xl font-bold text-slate-900 sm:text-4xl">
            Share With Bridge
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Tell us what you want to share. Bridge AI will help prepare it, then
            you&apos;ll review everything before approving it.
          </p>
        </div>

        {error && (
          <div className="mx-auto mt-7 max-w-2xl rounded-2xl bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <button
            type="button"
            onClick={handleNewSubmission}
            disabled={starting}
            className={`rounded-3xl border border-purple-100 bg-white p-6 text-left shadow-sm transition ${
              starting
                ? "cursor-wait opacity-70"
                : "cursor-pointer hover:-translate-y-1 hover:border-purple-300 hover:shadow-lg"
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0E7FF] text-[#7C3AED]">
              {starting ? (
                <Loader2 size={23} className="animate-spin" />
              ) : (
                <Plus size={23} />
              )}
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              {starting ? "Starting..." : "New Submission"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Share one event, resource, opportunity, announcement, or useful
              local item.
            </p>
          </button>

          <button
            type="button"
            className="cursor-pointer rounded-3xl border border-purple-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-purple-300 hover:shadow-lg"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0E7FF] text-[#7C3AED]">
              <Layers3 size={23} />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Multiple Submissions
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Share several different items during the same Bridge session.
            </p>
          </button>

          <button
            type="button"
            onClick={handleLoadSessions}
            disabled={loadingSessions}
            className="cursor-pointer rounded-3xl border border-purple-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-purple-300 hover:shadow-lg"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0E7FF] text-[#7C3AED]">
              <FileClock size={23} />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Drafts & Previous
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Continue an unfinished submission or review something you shared
              before.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
