import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import {
  ArrowLeft,
  ArrowUpRight,
  Home,
  Loader2,
  LockKeyhole,
  Sparkles,
  Zap,
  Users,
  Rocket,
} from "lucide-react";

import { auth } from "./firebase";

const BRIDGE_LOGO =
  "https://mcusercontent.com/2ead8cf9844eae73676cdedb6/images/5c553236-b34b-a985-35dd-24d9bba8f0a1.png";

const API_BASE = "https://bridgeaz-recommendations-server.vercel.app";

const PERKS = [
  {
    icon: Users,
    title: "Meaningful connections",
    text: "Meet builders, thinkers and doers who move ideas forward.",
  },
  {
    icon: Zap,
    title: "New opportunities",
    text: "Events, collaborations and resources around your interests.",
  },
  {
    icon: Rocket,
    title: "Greater impact",
    text: "Turn useful ideas and local connections into real progress.",
  },
];

/* =====================================================
   NORMALIZE MAKE RESPONSE
===================================================== */

function normalizeRegistrationQuestion(data) {
  if (!data) {
    return null;
  }

  let result = data;

  // Safety fallback in case Make ever returns JSON as raw text again.
  if (!data.question && typeof data.rawResponse === "string") {
    try {
      result = {
        ...data,
        ...JSON.parse(data.rawResponse),
      };
    } catch {
      result = data;
    }
  }

  let choices = Array.isArray(result.choices)
    ? result.choices.filter(Boolean)
    : [];

  // Safety fallback if Make ever sends all choices as one comma string.
  if (
    choices.length === 1 &&
    typeof choices[0] === "string" &&
    choices[0].includes(",")
  ) {
    choices = choices[0]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return {
    ...result,
    choices,
  };
}

export default function MemberRegistrationPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [registrationQuestion, setRegistrationQuestion] = useState(null);
  const [registrationComplete, setRegistrationComplete] = useState(null);
  const [selectedChoices, setSelectedChoices] = useState([]);
  const [freeText, setFreeText] = useState("");

  // True only when this page created the Airtable member in this session.
  // This lets Step 2 safely show a Back button without creating the member twice.
  const [memberCreatedThisSession, setMemberCreatedThisSession] = useState(false);
  const [showStepOneReview, setShowStepOneReview] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    zipCode: "",
    businessOrganization: "",
  });

  const currentStep = registrationComplete
    ? 2
    : showStepOneReview
      ? 1
      : registrationQuestion
        ? 2
        : 1;

  /* =====================================================
     FIREBASE AUTH
  ===================================================== */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/login");
        return;
      }

      setUser(firebaseUser);

      const displayName = firebaseUser.displayName?.trim() || "";

      const nameParts = displayName ? displayName.split(/\s+/) : [];

      const firstName = nameParts[0] || "";

      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

      setForm((current) => ({
        ...current,
        firstName,
        lastName,
        email: firebaseUser.email || "",
      }));
    });

    return unsubscribe;
  }, [navigate]);

  /* =====================================================
     EXISTING MEMBER → CONTINUE REGISTRATION
  ===================================================== */

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    const checkRegistration = async () => {
      try {
        const idToken = await user.getIdToken();

        const meResponse = await fetch(`${API_BASE}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const meData = await meResponse.json();

        console.log("MEMBER CHECK:", meData);

        if (!meResponse.ok || cancelled) {
          return;
        }

        const member = meData.member;

        // Brand-new Firebase user.
        // Keep Step 1 visible.
        if (!member) {
          return;
        }

        const isRegistrationComplete =
          member.status === "Active" &&
          member.conversationStatus === "Completed";

        if (isRegistrationComplete) {
          setRegistrationQuestion(null);
          setShowStepOneReview(false);
          setMemberCreatedThisSession(false);
          setRegistrationComplete({
            status: "complete",
            screen: "complete",
            heading: "You're already a Bridge member!",
            message:
              "Your Bridge membership is active. You do not need to complete registration again.",
            buttonLabel: "Go to Home",
          });
          return;
        }

        /*
          Existing Bridge member whose registration
          has not been completed.
        */

        const startResponse = await fetch(
          `${API_BASE}/api/member-registration/start`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${idToken}`,
              "Content-Type": "application/json",
            },
          },
        );

        const startData = await startResponse.json();

        console.log("CONTINUE REGISTRATION START RESULT:", startData);

        if (!startResponse.ok) {
          throw new Error(startData.error || "Could not continue registration");
        }

        if (cancelled) {
          return;
        }

        const normalized = normalizeRegistrationQuestion(startData);

        setMemberCreatedThisSession(false);
        setShowStepOneReview(false);
        setRegistrationComplete(null);
        setRegistrationQuestion(normalized);
        setSelectedChoices([]);
        setFreeText("");
        setErrorMessage("");
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("CONTINUE REGISTRATION ERROR:", error);

        setErrorMessage(error?.message || "Could not continue registration.");
      }
    };

    checkRegistration();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /* =====================================================
     FORM INPUT CHANGE
  ===================================================== */

  const handleChange = (event) => {
    const { name, value } = event.target;

    let nextValue = value;

    if (name === "zipCode") {
      nextValue = value.replace(/\D/g, "").slice(0, 5);
    }

    setForm((current) => ({
      ...current,
      [name]: nextValue,
    }));

    setErrorMessage("");
  };

  /* =====================================================
     CHOICE BUTTON
  ===================================================== */

  const handleChoiceToggle = (choice) => {
    setErrorMessage("");

    setSelectedChoices((current) => {
      /*
        Single-choice question
      */
      if (!registrationQuestion?.allowMultiple) {
        if (current.includes(choice)) {
          return [];
        }

        return [choice];
      }

      /*
        Multiple-choice question
      */
      if (current.includes(choice)) {
        return current.filter((item) => item !== choice);
      }

      return [...current, choice];
    });
  };

  /* =====================================================
     STEP 1 — BASIC REGISTRATION
  ===================================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    // If the user came back from Step 2, the member already exists.
    // Step 1 is review-only in that state, so just return to Step 2.
    if (memberCreatedThisSession && showStepOneReview) {
      setShowStepOneReview(false);
      setErrorMessage("");
      return;
    }

    try {
      if (!user || submitting) {
        return;
      }

      setSubmitting(true);
      setErrorMessage("");

      const idToken = await user.getIdToken();

      /* -------------------------
         CREATE MEMBER

         If this session already created the member,
         do not call /basic again. This also makes a
         retry safe if START failed after creation.
      ------------------------- */

      if (!memberCreatedThisSession) {
        const response = await fetch(
          `${API_BASE}/api/member-registration/basic`,
          {
            method: "POST",

            headers: {
              Authorization: `Bearer ${idToken}`,
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              firstName: form.firstName,
              lastName: form.lastName,
              phone: form.phone,
              zipCode: form.zipCode,
              businessOrganization: form.businessOrganization,
            }),
          },
        );

        const data = await response.json();

        console.log("BASIC REGISTRATION RESULT:", data);

        if (!response.ok) {
          throw new Error(data.error || "Registration failed");
        }

        setMemberCreatedThisSession(true);
      }

      /* -------------------------
         START AI REGISTRATION
      ------------------------- */

      const startResponse = await fetch(
        `${API_BASE}/api/member-registration/start`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const startData = await startResponse.json();

      console.log("INITIAL REGISTRATION START RESULT:", startData);

      if (!startResponse.ok) {
        throw new Error(
          startData.error || "Could not start initial registration",
        );
      }

      const normalized = normalizeRegistrationQuestion(startData);

      setRegistrationQuestion(normalized);

      setSelectedChoices([]);
      setFreeText("");
      setErrorMessage("");
    } catch (error) {
      console.error("BASIC REGISTRATION ERROR:", error);

      setErrorMessage(
        error?.message ||
          "Something went wrong. Please check your information and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =====================================================
     STEP 2 RESPONSE HELPER
  ===================================================== */

  const submitRegistrationResponse = async ({
    responseChoices = selectedChoices,
    responseFreeText = freeText,
    skipped = false,
  } = {}) => {
    if (!user || submitting || !registrationQuestion) {
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      const isZipQuestion =
        registrationQuestion?.questionType === "zip_code";

      const cleanFreeText = String(responseFreeText || "").trim();

      const submittedZipCode = isZipQuestion
        ? cleanFreeText.replace(/\D/g, "").slice(0, 5)
        : form.zipCode;

      if (isZipQuestion && submittedZipCode.length !== 5 && !skipped) {
        setErrorMessage("Please enter a valid 5-digit ZIP code.");
        return;
      }

      const idToken = await user.getIdToken();

      const response = await fetch(
        `${API_BASE}/api/member-registration/respond`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            selectedChoices: Array.isArray(responseChoices)
              ? responseChoices
              : [],
            freeText: isZipQuestion ? "" : cleanFreeText,
            zipCode: submittedZipCode,
            skipped,
          }),
        },
      );

      const data = await response.json();

      console.log("REGISTRATION RESPOND RESULT:", data);

      if (!response.ok) {
        throw new Error(data.error || "Could not process your answer");
      }

      const normalized = normalizeRegistrationQuestion(data);

      // Make can return another question (clarification or ZIP fallback).
      if (normalized?.status === "question") {
        setRegistrationQuestion(normalized);
        setSelectedChoices([]);
        setFreeText("");
        setShowStepOneReview(false);
        return;
      }

      // Final registration completion.
      if (normalized?.status === "complete") {
        console.log("REGISTRATION COMPLETE:", normalized);

        setRegistrationComplete(normalized);
        setRegistrationQuestion(null);
        setShowStepOneReview(false);
        setSelectedChoices([]);
        setFreeText("");
        setErrorMessage("");
        return;
      }

      throw new Error("Unexpected registration response");
    } catch (error) {
      console.error("REGISTRATION RESPOND ERROR:", error);

      setErrorMessage(
        error?.message || "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =====================================================
     STEP 2 CONTINUE
  ===================================================== */

  const handleStep2Continue = async () => {
    const hasSelectedChoice = selectedChoices.length > 0;
    const hasFreeText = freeText.trim().length > 0;

    if (
      !registrationQuestion?.allowSkip &&
      !hasSelectedChoice &&
      !hasFreeText
    ) {
      setErrorMessage(
        registrationQuestion?.questionType === "zip_code"
          ? "Please enter your ZIP code."
          : "Please choose at least one option or tell Bridge in your own words.",
      );
      return;
    }

    await submitRegistrationResponse({
      responseChoices: selectedChoices,
      responseFreeText: freeText,
      skipped: false,
    });
  };

  /* =====================================================
     STEP 2 SKIP
  ===================================================== */

  const handleStep2Skip = async () => {
    if (!registrationQuestion?.allowSkip || submitting) {
      return;
    }

    await submitRegistrationResponse({
      responseChoices: [],
      responseFreeText: "",
      skipped: true,
    });
  };

  /* =====================================================
     SAFE BACK TO STEP 1
  ===================================================== */

  const handleBackToStepOne = () => {
    if (!memberCreatedThisSession || submitting || registrationComplete) {
      return;
    }

    setShowStepOneReview(true);
    setErrorMessage("");
  };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F6F8FC] font-[Inter] text-[#071A4A] antialiased">
      {/* =====================================================
          EXISTING BRIDGE CLOUD / SKY EFFECT
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Base sky */}

        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(
                circle at 20% 15%,
                #0A4BA818 0%,
                transparent 32%
              ),
              radial-gradient(
                circle at 85% 20%,
                #071A4A16 0%,
                transparent 34%
              ),
              linear-gradient(
                180deg,
                #ffffff 0%,
                #F5F7FA 45%,
                #ffffff 100%
              )
            `,
          }}
        />

        {/* Moving left cloud */}

        <motion.div
          animate={{
            x: ["-12%", "8%", "-12%"],
            y: [0, -28, 0],
            scale: [1, 1.08, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 24,
            ease: "easeInOut",
          }}
          className="absolute left-[-8%] top-[10%] h-[520px] w-[760px] rounded-full"
          style={{
            background: `
              radial-gradient(
                circle at 35% 40%,
                rgba(255,255,255,0.95),
                transparent 38%
              ),
              radial-gradient(
                circle at 60% 45%,
                rgba(10,75,168,0.12),
                transparent 42%
              ),
              radial-gradient(
                circle at 45% 70%,
                rgba(255,255,255,0.8),
                transparent 48%
              )
            `,
            filter: "blur(55px)",
            opacity: 0.85,
          }}
        />

        {/* Moving right atmosphere */}

        <motion.div
          animate={{
            x: ["8%", "-8%", "8%"],
            y: [0, 35, 0],
            scale: [1, 1.12, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 28,
            ease: "easeInOut",
          }}
          className="absolute right-[-12%] top-[18%] h-[620px] w-[780px] rounded-full"
          style={{
            background: `
              radial-gradient(
                circle at 40% 40%,
                rgba(7,26,74,0.12),
                transparent 38%
              ),
              radial-gradient(
                circle at 65% 55%,
                rgba(255,255,255,0.85),
                transparent 44%
              ),
              radial-gradient(
                circle at 35% 70%,
                rgba(10,75,168,0.09),
                transparent 50%
              )
            `,
            filter: "blur(70px)",
            opacity: 0.75,
          }}
        />

        {/* Lower cloud bed */}

        <motion.div
          animate={{
            y: [0, -18, 0],
            opacity: [0.65, 0.9, 0.65],
          }}
          transition={{
            repeat: Infinity,
            duration: 18,
            ease: "easeInOut",
          }}
          className="absolute -bottom-[180px] left-[-10%] h-[420px] w-[120%]"
          style={{
            background: `
              radial-gradient(
                ellipse at 20% 40%,
                rgba(255,255,255,0.95),
                transparent 45%
              ),
              radial-gradient(
                ellipse at 50% 30%,
                rgba(255,255,255,0.9),
                transparent 48%
              ),
              radial-gradient(
                ellipse at 80% 45%,
                rgba(255,255,255,0.95),
                transparent 45%
              )
            `,
            filter: "blur(45px)",
          }}
        />

        {/* Soft blue glow */}

        <motion.div
          animate={{
            x: [0, 35, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute left-[15%] top-[30%] h-[350px] w-[350px] rounded-full bg-blue-300/10 blur-[100px]"
        />

        {/* Subtle dots */}

        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(7,26,74,0.20) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <header className="relative z-30">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          {/* Logo */}

          <motion.button
            type="button"
            onClick={() => navigate("/")}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="cursor-pointer"
          >
            <img
              src={BRIDGE_LOGO}
              alt="Bridge"
              className="h-[52px] w-auto object-contain"
            />
          </motion.button>

          <div className="flex items-center gap-3">
            {/* Home */}

            <motion.button
              type="button"
              onClick={() => navigate("/")}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="
                group
                flex
                cursor-pointer
                items-center
                gap-2
                rounded-full
                border
                border-white/80
                bg-white/80
                px-5
                py-2.5
                text-sm
                font-black
                text-[#071A4A]
                shadow-[0_10px_30px_rgba(7,26,74,0.08)]
                backdrop-blur-xl
                transition
                hover:bg-white
                hover:shadow-lg
              "
            >
              <Home size={16} />
              Home
            </motion.button>

            {/* Dynamic progress */}

            <div className="hidden items-center gap-3 rounded-full border border-white/70 bg-white/60 px-4 py-2.5 shadow-sm backdrop-blur-xl sm:flex">
              <AnimatePresence mode="wait">
                <motion.span
                  key={registrationComplete ? "complete" : currentStep}
                  initial={{
                    opacity: 0,
                    y: 4,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -4,
                  }}
                  className={`text-[11px] font-black uppercase tracking-[0.18em] ${
                    registrationComplete ? "text-emerald-600" : "text-slate-500"
                  }`}
                >
                  {registrationComplete
                    ? "Registration Complete"
                    : `Step ${currentStep} of 2`}
                </motion.span>
              </AnimatePresence>

              <div className="flex gap-1.5">
                <motion.span
                  animate={{
                    backgroundColor: registrationComplete
                      ? "#10B981"
                      : "#0A66D1",
                  }}
                  transition={{
                    duration: 0.35,
                  }}
                  className="h-1.5 w-11 rounded-full"
                />

                <motion.span
                  animate={{
                    backgroundColor: registrationComplete
                      ? "#10B981"
                      : currentStep === 2
                        ? "#0A66D1"
                        : "#E2E8F0",
                  }}
                  transition={{
                    duration: 0.35,
                  }}
                  className="h-1.5 w-11 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div
        className="
          relative
          z-20
          mx-auto
          flex
          min-h-[calc(100vh-95px)]
          max-w-[1320px]
          flex-col
          gap-10
          px-5
          pb-14
          pt-5
          sm:px-8
          lg:flex-row
          lg:items-center
          lg:gap-16
          lg:px-12
        "
      >
        {/* =====================================================
            LEFT CONTENT
        ===================================================== */}

        <div className="flex flex-1 flex-col justify-center lg:max-w-[500px]">
          <motion.div
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.8,
            }}
          >
            <div
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-blue-100
                bg-white/65
                px-4
                py-2
                text-[11px]
                font-black
                uppercase
                tracking-[0.22em]
                text-[#0A4BA8]
                shadow-sm
                backdrop-blur-xl
              "
            >
              <Sparkles size={13} />
              Join the community
            </div>

            <h1
              className="
                mt-6
                text-[45px]
                font-semibold
                leading-[1.02]
                tracking-[-0.04em]
                text-[#071A4A]
                sm:text-[58px]
                lg:text-[68px]
              "
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
              }}
            >
              Where people
              <br />
              and ideas
              <br />
              <span className="relative inline-block text-[#0A67C8]">
                meet.
                <motion.span
                  initial={{
                    scaleX: 0,
                  }}
                  animate={{
                    scaleX: 1,
                  }}
                  transition={{
                    delay: 0.7,
                    duration: 0.8,
                  }}
                  className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-gradient-to-r from-[#0A4BA8] to-[#61B9FF]"
                />
              </span>
            </h1>

            <p className="mt-5 max-w-[420px] text-[16px] font-medium leading-7 text-slate-600">
              Tell us a little about yourself so Bridge can start building your
              personalized experience.
            </p>
          </motion.div>

          {/* Perks */}

          <div className="mt-9 hidden space-y-3 lg:block">
            {PERKS.map((perk, index) => {
              const Icon = perk.icon;

              return (
                <motion.div
                  key={perk.title}
                  initial={{
                    opacity: 0,
                    x: -25,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  transition={{
                    delay: 0.4 + index * 0.12,
                    duration: 0.55,
                  }}
                  whileHover={{
                    x: 5,
                  }}
                  className="
                    group
                    flex
                    items-start
                    gap-4
                    rounded-[20px]
                    border
                    border-white/80
                    bg-white/60
                    p-4
                    shadow-[0_12px_35px_rgba(7,26,74,0.07)]
                    backdrop-blur-xl
                    transition
                    hover:bg-white/80
                  "
                >
                  <div
                    className="
                      flex
                      h-11
                      w-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-[14px]
                      bg-gradient-to-br
                      from-[#071A4A]
                      to-[#0A5FC0]
                      text-white
                      shadow-lg
                    "
                  >
                    <Icon size={18} />
                  </div>

                  <div>
                    <div className="text-[15px] font-black text-[#071A4A]">
                      {perk.title}
                    </div>

                    <p className="mt-1 text-[13px] font-medium leading-5 text-slate-500">
                      {perk.text}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* =====================================================
            RIGHT CARD
        ===================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: 45,
            scale: 0.97,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            duration: 0.8,
            delay: 0.15,
          }}
          className="relative w-full max-w-[540px] shrink-0 lg:ml-auto"
        >
          {/* Glow */}

          <div
            className="
              pointer-events-none
              absolute
              -inset-5
              -z-10
              rounded-[40px]
              bg-gradient-to-br
              from-blue-300/20
              via-white/60
              to-indigo-300/20
              blur-2xl
            "
          />

          <div
            className="
              relative
              overflow-hidden
              rounded-[30px]
              border
              border-white/90
              bg-white/80
              p-7
              shadow-[0_30px_85px_rgba(7,26,74,0.14)]
              backdrop-blur-[28px]
              sm:p-9
            "
          >
            {/* Top highlight */}

            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

            {/* Back home */}

            <button
              type="button"
              onClick={() => navigate("/")}
              className="
                group
                mb-6
                flex
                cursor-pointer
                items-center
                gap-2
                text-[13px]
                font-bold
                text-slate-500
                transition
                hover:text-[#071A4A]
              "
            >
              <ArrowLeft
                size={15}
                className="transition-transform group-hover:-translate-x-1"
              />
              Back to home
            </button>

            {/* =====================================================
                ACTUAL STEP SLIDER
            ===================================================== */}

            <AnimatePresence mode="wait" initial={false}>
              {/* =================================================
                  COMPLETE
              ================================================= */}

              {registrationComplete ? (
                <motion.div
                  key="registration-complete"
                  initial={{ opacity: 0, x: 70, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -60 }}
                  transition={{
                    duration: 0.45,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="py-5 text-center"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 180,
                      damping: 14,
                      delay: 0.08,
                    }}
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-[36px] font-black text-white shadow-[0_18px_45px_rgba(16,185,129,0.25)]"
                  >
                    ✓
                  </motion.div>

                  <span className="mt-6 block text-[11px] font-black uppercase tracking-[0.22em] text-emerald-600">
                    Registration Complete
                  </span>

                  <h2
                    className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-[#071A4A] sm:text-[34px]"
                    style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                    }}
                  >
                    {registrationComplete.heading || "You're all set!"}
                  </h2>

                  <p className="mx-auto mt-4 max-w-[410px] text-[14px] font-medium leading-7 text-slate-500">
                    {registrationComplete.message ||
                      "Your Bridge membership is active and your personalized experience is being prepared."}
                  </p>

                  {registrationComplete.recommendationRefreshTriggered && (
                    <div className="mx-auto mt-6 max-w-[410px] rounded-[16px] border border-blue-100 bg-blue-50/70 px-4 py-3 text-[13px] font-semibold text-[#0A4BA8]">
                      Bridge is preparing your personalized recommendations now.
                    </div>
                  )}

                  <motion.button
                    type="button"
                    onClick={() => navigate("/")}
                    whileHover={{ y: -2, scale: 1.005 }}
                    whileTap={{ scale: 0.985 }}
                    className="group relative mt-7 flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-[18px] bg-gradient-to-r from-[#071A4A] via-[#073A91] to-[#0A65CD] py-2 pl-6 pr-2 text-[15px] font-black text-white shadow-[0_14px_38px_rgba(10,75,168,0.25)]"
                  >
                    <span>Go to Home</span>

                    <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-white text-[#0A4BA8] shadow-md transition-transform duration-300 group-hover:rotate-45">
                      <ArrowUpRight size={20} strokeWidth={2.5} />
                    </span>
                  </motion.button>

                  <p className="mt-5 text-[11px] font-semibold text-slate-400">
                    Your membership is active. You will not need to register again.
                  </p>
                </motion.div>
              ) : !registrationQuestion || showStepOneReview ? (
                /* =================================================
                   STEP 1
                ================================================= */

                <motion.div
                  key={showStepOneReview ? "registration-step-1-review" : "registration-step-1"}
                  initial={{ opacity: 0, x: -45 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -70 }}
                  transition={{
                    duration: 0.42,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <div className="mb-7">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0A67C8]">
                      Account details
                    </span>

                    <h2
                      className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-[#071A4A] sm:text-[32px]"
                      style={{
                        fontFamily: '"Playfair Display", Georgia, serif',
                      }}
                    >
                      {showStepOneReview
                        ? "Your account details"
                        : "Become a Bridge member"}
                    </h2>

                    <p className="mt-2 text-[13px] font-medium leading-6 text-slate-500">
                      {showStepOneReview
                        ? "These details are already saved. Return to your interests when you're ready."
                        : "Start with a few details. Next, Bridge will ask about your interests."}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <GlassField
                        label="First name"
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                        required
                        disabled={showStepOneReview}
                        placeholder="Jane"
                        autoComplete="given-name"
                      />

                      <GlassField
                        label="Last name"
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        required
                        disabled={showStepOneReview}
                        placeholder="Doe"
                        autoComplete="family-name"
                      />
                    </div>

                    <GlassField
                      label="Email"
                      name="email"
                      value={form.email}
                      disabled
                      placeholder="you@company.com"
                      hint="Linked to your account"
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <GlassField
                        label="Phone"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        required
                        disabled={showStepOneReview}
                        type="tel"
                        placeholder="(555) 123-4567"
                        autoComplete="tel"
                      />

                      <GlassField
                        label="ZIP code"
                        name="zipCode"
                        value={form.zipCode}
                        onChange={handleChange}
                        required
                        disabled={showStepOneReview}
                        placeholder="94105"
                        inputMode="numeric"
                      />
                    </div>

                    <GlassField
                      label="Business / Organization"
                      optional
                      name="businessOrganization"
                      value={form.businessOrganization}
                      onChange={handleChange}
                      disabled={showStepOneReview}
                      placeholder="Your company or organization"
                      autoComplete="organization"
                    />

                    <RegistrationError message={errorMessage} />

                    <motion.button
                      whileHover={
                        submitting
                          ? {}
                          : {
                              y: -2,
                              scale: 1.005,
                            }
                      }
                      whileTap={submitting ? {} : { scale: 0.985 }}
                      type="submit"
                      disabled={submitting}
                      className="group relative mt-2 flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-[18px] bg-gradient-to-r from-[#071A4A] via-[#073A91] to-[#0A65CD] py-2 pl-6 pr-2 text-[15px] font-black text-white shadow-[0_14px_38px_rgba(10,75,168,0.25)] transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {!submitting && (
                        <motion.span
                          animate={{ x: ["-180%", "340%"] }}
                          transition={{
                            duration: 2.6,
                            repeat: Infinity,
                            repeatDelay: 4,
                          }}
                          className="pointer-events-none absolute inset-y-0 w-24 rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        />
                      )}

                      <span className="relative z-10">
                        {submitting ? (
                          <span className="flex items-center gap-2.5">
                            <Loader2 size={18} className="animate-spin" />
                            Saving your information...
                          </span>
                        ) : showStepOneReview ? (
                          "Back to your interests"
                        ) : (
                          "Continue to your interests"
                        )}
                      </span>

                      <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-[13px] bg-white text-[#0A4BA8] shadow-md transition-transform duration-300 group-hover:rotate-45">
                        <ArrowUpRight size={20} strokeWidth={2.5} />
                      </span>
                    </motion.button>

                    <p className="flex items-center justify-center gap-2 pt-1 text-center text-[11px] font-semibold text-slate-400">
                      <LockKeyhole size={12} />
                      Secure & used only to personalize your Bridge experience
                    </p>
                  </form>
                </motion.div>
              ) : (
                /* =================================================
                   STEP 2
                ================================================= */

                <motion.div
                  key={`registration-step-2-${registrationQuestion?.questionType || "question"}`}
                  initial={{ opacity: 0, x: 70 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 70 }}
                  transition={{
                    duration: 0.42,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {memberCreatedThisSession && (
                    <button
                      type="button"
                      onClick={handleBackToStepOne}
                      disabled={submitting}
                      className="mb-5 flex cursor-pointer items-center gap-2 text-[12px] font-bold text-slate-400 transition hover:text-[#071A4A] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ArrowLeft size={14} />
                      Back to account details
                    </button>
                  )}

                  <div className="mb-7">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#EAAA31]">
                      Step 2 of 2
                    </span>

                    <h2
                      className="mt-2 text-[27px] font-semibold leading-[1.18] tracking-[-0.03em] text-[#071A4A] sm:text-[31px]"
                      style={{
                        fontFamily: '"Playfair Display", Georgia, serif',
                      }}
                    >
                      {registrationQuestion.question}
                    </h2>

                    {registrationQuestion.description && (
                      <p className="mt-3 text-[13px] font-medium leading-6 text-slate-500">
                        {registrationQuestion.description}
                      </p>
                    )}
                  </div>

                  {Array.isArray(registrationQuestion.choices) &&
                    registrationQuestion.choices.length > 0 && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {registrationQuestion.choices.map((choice) => {
                          const selected = selectedChoices.includes(choice);

                          return (
                            <motion.button
                              key={choice}
                              type="button"
                              aria-pressed={selected}
                              disabled={submitting}
                              onClick={() => handleChoiceToggle(choice)}
                              whileTap={submitting ? {} : { scale: 0.98 }}
                              className={`
                                relative min-h-[58px] cursor-pointer rounded-[16px]
                                border px-4 py-3 text-left text-[14px] font-bold
                                leading-5 transition-all duration-200
                                disabled:cursor-not-allowed disabled:opacity-60
                                ${
                                  selected
                                    ? "border-[#EAAA31] bg-[#FFF2CF] text-[#071A4A] shadow-[0_7px_22px_rgba(234,170,49,0.16)]"
                                    : "border-slate-200 bg-white text-[#071A4A] shadow-[0_5px_18px_rgba(7,26,74,0.04)] hover:border-[#EAAA31]/70 hover:bg-[#FFF9EB] hover:shadow-[0_8px_22px_rgba(7,26,74,0.07)]"
                                }
                              `}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                                    selected
                                      ? "border-[#EAAA31] bg-[#EAAA31]"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {selected && (
                                    <motion.span
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="h-2 w-2 rounded-full bg-[#071A4A]"
                                    />
                                  )}
                                </span>

                                <span>{choice}</span>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                  {registrationQuestion.allowFreeText &&
                    (registrationQuestion.questionType === "zip_code" ? (
                      <div className="mt-5">
                        <label className="mb-2 block text-[12px] font-bold text-slate-500">
                          ZIP code
                        </label>

                        <input
                          value={freeText}
                          onChange={(event) => {
                            setFreeText(
                              event.target.value.replace(/\D/g, "").slice(0, 5),
                            );
                            setErrorMessage("");
                          }}
                          disabled={submitting}
                          inputMode="numeric"
                          placeholder="Enter 5-digit ZIP code"
                          className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3.5 text-[16px] font-semibold text-[#071A4A] outline-none transition-all placeholder:font-normal placeholder:text-slate-400 hover:border-blue-200 focus:border-[#0A4BA8]/50 focus:ring-4 focus:ring-blue-100/60 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                    ) : (
                      <div className="mt-5">
                        <label className="mb-2 block text-[12px] font-bold text-slate-500">
                          Something else?
                        </label>

                        <textarea
                          value={freeText}
                          onChange={(event) => {
                            setFreeText(event.target.value);
                            setErrorMessage("");
                          }}
                          disabled={submitting}
                          rows={3}
                          placeholder="Tell Bridge in your own words..."
                          className="w-full resize-none rounded-[16px] border border-slate-200 bg-white px-4 py-3.5 text-[14px] font-medium text-[#071A4A] outline-none transition-all placeholder:font-normal placeholder:text-slate-400 hover:border-blue-200 focus:border-[#0A4BA8]/50 focus:ring-4 focus:ring-blue-100/60 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                    ))}

                  <div className="mt-4">
                    <RegistrationError message={errorMessage} />
                  </div>

                  <motion.button
                    type="button"
                    onClick={handleStep2Continue}
                    disabled={submitting}
                    whileHover={submitting ? {} : { y: -2, scale: 1.005 }}
                    whileTap={submitting ? {} : { scale: 0.985 }}
                    className="group relative mt-6 flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-[18px] bg-gradient-to-r from-[#F7C45A] via-[#F6BC48] to-[#F0AE32] py-2 pl-6 pr-2 text-[15px] font-black text-[#071A4A] shadow-[0_14px_38px_rgba(240,174,50,0.24)] transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="relative z-10">
                      {submitting ? (
                        <span className="flex items-center gap-2.5">
                          <Loader2 size={18} className="animate-spin" />
                          Saving your answer...
                        </span>
                      ) : (
                        registrationQuestion.buttonLabel || "Continue"
                      )}
                    </span>

                    <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-[13px] bg-[#071A4A] text-[#F7C45A] shadow-md transition-transform duration-300 group-hover:rotate-45">
                      <ArrowUpRight size={20} strokeWidth={2.5} />
                    </span>
                  </motion.button>

                  {registrationQuestion.allowSkip && (
                    <button
                      type="button"
                      onClick={handleStep2Skip}
                      disabled={submitting}
                      className="mt-4 w-full cursor-pointer text-center text-[13px] font-bold text-slate-400 transition hover:text-[#071A4A] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Skip for now
                    </button>
                  )}

                  <p className="mt-5 flex items-center justify-center gap-2 text-center text-[11px] font-semibold text-slate-400">
                    <LockKeyhole size={12} />
                    Your answers help Bridge personalize what you see.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

/* =====================================================
   ERROR
===================================================== */

function RegistrationError({ message }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          initial={{
            opacity: 0,
            height: 0,
            y: -5,
          }}
          animate={{
            opacity: 1,
            height: "auto",
            y: 0,
          }}
          exit={{
            opacity: 0,
            height: 0,
          }}
          className="overflow-hidden rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* =====================================================
   FIELD
===================================================== */

function GlassField({
  label,
  optional = false,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = "",
  type = "text",
  inputMode,
  autoComplete,
  hint,
}) {
  return (
    <label className="group block">
      <span className="mb-1.5 flex items-center justify-between text-[12px] font-bold text-slate-500 transition group-focus-within:text-[#0A4BA8]">
        <span>
          {label}

          {required && <span className="ml-0.5 text-red-500">*</span>}

          {optional && (
            <span className="ml-1.5 font-semibold text-slate-400">
              optional
            </span>
          )}
        </span>

        {hint && (
          <span className="text-[11px] font-semibold text-slate-400">
            {hint}
          </span>
        )}
      </span>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className="
          w-full
          rounded-[14px]
          border
          border-slate-200
          bg-white/65
          px-4
          py-3.5
          text-[16px]
          font-semibold
          tracking-tight
          text-[#071A4A]
          outline-none
          transition-all
          duration-300
          placeholder:font-normal
          placeholder:text-slate-300
          hover:border-blue-200
          hover:bg-white/80
          focus:border-[#0A4BA8]/50
          focus:bg-white
          focus:ring-4
          focus:ring-blue-100/60
          disabled:cursor-not-allowed
          disabled:bg-slate-100/70
          disabled:text-slate-400
        "
      />
    </label>
  );
}
