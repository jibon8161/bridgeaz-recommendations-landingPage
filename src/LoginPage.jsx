import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";

import {
  ArrowUpRight,

  LockKeyhole,
  Sparkles,
  Users,
  Zap,
  Rocket,
} from "lucide-react";

import { auth, googleProvider } from "./firebase";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const BRIDGE_LOGO =
  "https://mcusercontent.com/2ead8cf9844eae73676cdedb6/images/5c553236-b34b-a985-35dd-24d9bba8f0a1.png";

const LOGIN_PERKS = [
  {
    icon: Users,
    title: "Your people",
    text: "Return to the people, connections, and community around you.",
  },
  {
    icon: Zap,
    title: "Your recommendations",
    text: "See events, resources, opportunities, and discoveries selected for you.",
  },
  {
    icon: Rocket,
    title: "Your Bridge",
    text: "Continue your personalized Bridge experience exactly where you left off.",
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const navigate = useNavigate();

  /* =====================================================
     EXISTING EMAIL LINK LOGIN
     DO NOT CHANGE
  ===================================================== */

  useEffect(() => {
    const finishEmailLogin = async () => {
      if (!isSignInWithEmailLink(auth, window.location.href)) return;

      let savedEmail = window.localStorage.getItem("bridgeEmailForSignIn");

      if (!savedEmail) {
        savedEmail = window.prompt("Please confirm your email address");
      }

      if (!savedEmail) return;

      try {
        setLoading("email");

        const result = await signInWithEmailLink(
          auth,
          savedEmail,
          window.location.href,
        );

        window.localStorage.removeItem("bridgeEmailForSignIn");

        console.log("Logged in:", result.user);

        toast.success("Welcome to BridgeAZ!");

        navigate("/");
      } catch (error) {
        console.error(error);

        toast.error(error.message || "Unable to sign in.");
      } finally {
        setLoading("");
      }
    };

    finishEmailLogin();
  }, []);

  /* =====================================================
     EXISTING EMAIL LOGIN
     DO NOT CHANGE
  ===================================================== */

  const handleEmailLogin = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Enter your email address.");
      return;
    }

    try {
      setLoading("email");

      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email.trim(), actionCodeSettings);

      window.localStorage.setItem("bridgeEmailForSignIn", email.trim());

      setEmailSent(true);

      toast.success("Check your email for your Bridge sign-in link.");
    } catch (error) {
      console.error(error);

      toast.error(error.message || "Unable to send login link.");
    } finally {
      setLoading("");
    }
  };

  /* =====================================================
     EXISTING GOOGLE LOGIN
     DO NOT CHANGE
  ===================================================== */

  const handleGoogleLogin = async () => {
    try {
      setLoading("google");

      const result = await signInWithPopup(auth, googleProvider);

      console.log("Google user:", result.user);

      toast.success("Welcome to BridgeAZ!");

      navigate("/");
    } catch (error) {
      console.error(error);

      if (error?.code !== "auth/popup-closed-by-user") {
        toast.error(error.message || "Google sign-in failed.");
      }
    } finally {
      setLoading("");
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F6F8FC] font-[Inter] text-[#071A4A] antialiased">
      {/* =====================================================
          SAME BRIDGE CLOUD / SKY EFFECT
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* base */}

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

        {/* left cloud */}

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

        {/* right atmosphere */}

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

        {/* lower clouds */}

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

        {/* soft blue light */}

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

        {/* subtle Bridge dots */}

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
          HEADER
      ===================================================== */}

      <header className="relative z-30">
        <div className="mx-auto flex max-w-[1360px] items-center px-5 py-5 sm:px-8 lg:px-12">
          <motion.button
            type="button"
            onClick={() => navigate("/")}
            whileHover={{
              scale: 1.03,
            }}
            whileTap={{
              scale: 0.98,
            }}
            className="cursor-pointer"
          >
            <img
              src={BRIDGE_LOGO}
              alt="Bridge"
              className="h-[52px] w-auto object-contain"
            />
          </motion.button>
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
          pt-4
          sm:px-8
          lg:flex-row
          lg:items-center
          lg:gap-16
          lg:px-12
        "
      >
        {/* =====================================================
            LEFT SIDE
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
              Welcome to Bridge
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
              Your community.
              <br />
              Your interests.
              <br />
              <span className="relative inline-block text-[#0A67C8]">
                Your Bridge.
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
              Sign in to continue discovering the people, opportunities,
              resources, and local connections Bridge has selected for you.
            </p>
          </motion.div>

          {/* =====================================================
              LOGIN VALUE CARDS
          ===================================================== */}

          <div className="mt-9 hidden space-y-3 lg:block">
            {LOGIN_PERKS.map((perk, index) => {
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
            LOGIN CARD
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
          className="relative w-full max-w-[520px] shrink-0 lg:ml-auto"
        >
          {/* glow */}

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
              bg-white/72
              p-7
              shadow-[0_30px_85px_rgba(7,26,74,0.14)]
              backdrop-blur-[28px]
              sm:p-9
            "
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

            {/* Heading */}

            <motion.div
              initial={{
                opacity: 0,
                y: 15,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
              }}
            >
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-[#0A5FC0]">
                My Bridge
              </span>

              <h2
                className="mt-2 text-[34px] font-semibold tracking-[-0.03em] text-[#071A4A] sm:text-[38px]"
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                }}
              >
                Welcome back.
              </h2>

              <p className="mt-3 text-[14px] font-medium leading-6 text-slate-500">
                Sign in to access your personalized Bridge experience.
              </p>
            </motion.div>

            {/* =====================================================
                GOOGLE
            ===================================================== */}

            <div className="mt-8">
              <motion.button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading !== ""}
                whileHover={
                  loading !== ""
                    ? {}
                    : {
                        y: -2,
                      }
                }
                whileTap={
                  loading !== ""
                    ? {}
                    : {
                        scale: 0.99,
                      }
                }
                className="
                  flex
                  w-full
                  cursor-pointer
                  items-center
                  justify-center
                  gap-3
                  rounded-[15px]
                  border
                  border-slate-200
                  bg-white/80
                  px-5
                  py-4
                  text-[15px]
                  font-black
                  text-[#071A4A]
                  shadow-sm
                  transition
                  hover:border-blue-200
                  hover:bg-white
                  hover:shadow-lg
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {loading === "google" ? <Spinner /> : <GoogleIcon />}

                {loading === "google"
                  ? "Signing in..."
                  : "Continue with Google"}
              </motion.button>
            </div>

            {/* =====================================================
                DIVIDER
            ===================================================== */}

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />

              <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                or continue with email
              </span>

              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* =====================================================
                EMAIL MAGIC LINK
            ===================================================== */}

            <AnimatePresence mode="wait">
              {!emailSent ? (
                <motion.form
                  key="email-form"
                  onSubmit={handleEmailLogin}
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                >
                  <label
                    htmlFor="bridge-email"
                    className="mb-2 block text-[12px] font-bold text-slate-500"
                  >
                    Email address
                  </label>

                  <div className="relative">
                    <EmailIcon />

                    <input
                      id="bridge-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="
                        w-full
                        rounded-[14px]
                        border
                        border-slate-200
                        bg-white/65
                        py-4
                        pl-12
                        pr-4
                        text-[15px]
                        font-semibold
                        text-[#071A4A]
                        outline-none
                        transition
                        placeholder:font-normal
                        placeholder:text-slate-300
                        hover:border-blue-200
                        focus:border-[#0A4BA8]/50
                        focus:bg-white
                        focus:ring-4
                        focus:ring-blue-100/60
                      "
                    />
                  </div>

                  {/* CTA */}

                  <motion.button
                    whileHover={
                      loading !== ""
                        ? {}
                        : {
                            y: -2,
                          }
                    }
                    whileTap={
                      loading !== ""
                        ? {}
                        : {
                            scale: 0.985,
                          }
                    }
                    type="submit"
                    disabled={loading !== ""}
                    className="
                      group
                      relative
                      mt-4
                      flex
                      w-full
                      cursor-pointer
                      items-center
                      justify-between
                      overflow-hidden
                      rounded-[18px]
                      bg-gradient-to-r
                      from-[#071A4A]
                      via-[#073A91]
                      to-[#0A65CD]
                      py-2
                      pl-6
                      pr-2
                      text-[15px]
                      font-black
                      text-white
                      shadow-[0_14px_38px_rgba(10,75,168,0.25)]
                      transition
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  >
                    {!loading && (
                      <motion.span
                        animate={{
                          x: ["-180%", "340%"],
                        }}
                        transition={{
                          duration: 2.6,
                          repeat: Infinity,
                          repeatDelay: 4,
                        }}
                        className="pointer-events-none absolute inset-y-0 w-24 rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      />
                    )}

                    <span className="relative z-10">
                      {loading === "email" ? (
                        <span className="flex items-center gap-2.5">
                          <Spinner white />
                          Sending sign-in link...
                        </span>
                      ) : (
                        "Send me a sign-in link"
                      )}
                    </span>

                    <span
                      className="
                        relative
                        z-10
                        flex
                        h-11
                        w-11
                        items-center
                        justify-center
                        rounded-[13px]
                        bg-white
                        text-[#0A4BA8]
                        shadow-md
                        transition-transform
                        duration-300
                        group-hover:rotate-45
                      "
                    >
                      <ArrowUpRight size={20} strokeWidth={2.5} />
                    </span>
                  </motion.button>

                  <p className="mt-4 text-center text-[11px] font-semibold leading-5 text-slate-400">
                    No password needed. We&apos;ll email you a secure link to
                    sign in.
                  </p>
                </motion.form>
              ) : (
                /* =================================================
                   EMAIL SENT
                ================================================= */

                <motion.div
                  key="email-sent"
                  initial={{
                    opacity: 0,
                    scale: 0.97,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  className="
                    rounded-[22px]
                    border
                    border-blue-100
                    bg-gradient-to-br
                    from-blue-50/80
                    to-white/80
                    p-6
                    text-center
                    shadow-sm
                  "
                >
                  <div
                    className="
                      mx-auto
                      flex
                      h-14
                      w-14
                      items-center
                      justify-center
                      rounded-full
                      bg-gradient-to-br
                      from-[#071A4A]
                      to-[#0A5FC0]
                      text-2xl
                      font-black
                      text-white
                      shadow-lg
                    "
                  >
                    ✓
                  </div>

                  <h3
                    className="mt-4 text-[24px] font-semibold text-[#071A4A]"
                    style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                    }}
                  >
                    Check your inbox
                  </h3>

                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                    We sent your secure Bridge sign-in link to
                  </p>

                  <p className="mt-1 break-all text-sm font-black text-[#0A5FC0]">
                    {email}
                  </p>

                  <button
                    type="button"
                    onClick={() => setEmailSent(false)}
                    className="mt-5 cursor-pointer text-sm font-black text-[#071A4A] underline decoration-slate-300 underline-offset-4 transition hover:text-[#0A5FC0]"
                  >
                    Use a different email
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* =====================================================
                SECURITY TEXT
            ===================================================== */}

            <div className="mt-7 border-t border-slate-200/70 pt-5">
              <p className="flex items-center justify-center gap-2 text-center text-[11px] font-semibold leading-5 text-slate-400">
                <LockKeyhole size={12} className="shrink-0" />
                Secure sign-in to your Bridge member experience
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

/* =====================================================
   SPINNER
===================================================== */

function Spinner({ white = false }) {
  return (
    <span
      className={`h-5 w-5 animate-spin rounded-full border-2 ${
        white
          ? "border-white/35 border-t-white"
          : "border-slate-300 border-t-[#071A4A]"
      }`}
    />
  );
}

/* =====================================================
   GOOGLE ICON
===================================================== */

function GoogleIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
      />

      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.63-2.41l-3.24-2.51c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.59A10 10 0 0 0 12 22Z"
      />

      <path
        fill="#FBBC05"
        d="M6.39 13.91A6.02 6.02 0 0 1 6.08 12c0-.66.11-1.3.31-1.91V7.5H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.5l3.35-2.59Z"
      />

      <path
        fill="#EA4335"
        d="M12 5.96c1.47 0 2.8.51 3.84 1.5l2.88-2.88A9.67 9.67 0 0 0 12 2a10 10 0 0 0-8.96 5.5l3.35 2.59C7.18 7.72 9.39 5.96 12 5.96Z"
      />
    </svg>
  );
}

/* =====================================================
   EMAIL ICON
===================================================== */

function EmailIcon() {
  return (
    <svg
      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 6.5h16v11H4v-11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <path
        d="m4.5 7 7.5 6 7.5-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
