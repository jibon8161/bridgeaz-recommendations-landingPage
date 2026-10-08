import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { auth, googleProvider} from "./firebase";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
const BRIDGE_LOGO =
  "https://mcusercontent.com/2ead8cf9844eae73676cdedb6/images/5c553236-b34b-a985-35dd-24d9bba8f0a1.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState("");
  const [emailSent, setEmailSent] = useState(false);
const navigate = useNavigate();
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

  // const handleFacebookLogin = async () => {
  //   try {
  //     setLoading("facebook");

  //     const result = await signInWithPopup(auth, facebookProvider);

  //     console.log("Facebook user:", result.user);

  //     toast.success("Welcome to BridgeAZ!");
  //     navigate("/");
  //   } catch (error) {
  //     console.error(error);

  //     if (error?.code !== "auth/popup-closed-by-user") {
  //       toast.error(error.message || "Facebook sign-in failed.");
  //     }
  //   } finally {
  //     setLoading("");
  //   }
  // };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F7F7F7] font-[Inter]">
      {/* background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 40, 0],
            y: [0, -20, 0],
            scale: [1, 1.08, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 12,
            ease: "easeInOut",
          }}
          className="absolute -left-32 -top-32 h-[430px] w-[430px] rounded-full bg-blue-500/10 blur-[100px]"
        />

        <motion.div
          animate={{
            x: [0, -35, 0],
            y: [0, 25, 0],
            scale: [1, 1.12, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 14,
            ease: "easeInOut",
          }}
          className="absolute -bottom-40 -right-24 h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[110px]"
        />

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(#071A4A 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* top strip */}
      <div className="relative z-20 bg-[#071A4A] px-6 py-3 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-xs font-semibold sm:text-sm">
          <span>Prescott, Arizona</span>
          <span className="text-white/75">connect@bridgeaz.co</span>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-44px)] max-w-7xl items-center justify-center px-5 py-10 sm:px-8 lg:px-10">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[40px] bg-white shadow-[0_30px_90px_rgba(7,26,74,0.14)] ring-1 ring-slate-200/70 lg:grid-cols-[1.05fr_0.95fr]">
          {/* LEFT SIDE */}
          <div className="relative hidden min-h-[650px] overflow-hidden bg-[#071A4A] p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute inset-0">
              <motion.div
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 30,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full"
                style={{
                  background:
                    "conic-gradient(from 0deg, #2563EB, #7C3AED, #60A5FA, #2563EB)",
                  filter: "blur(80px)",
                  opacity: 0.38,
                }}
              />

              <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-blue-400/20 blur-[90px]" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="relative z-10"
            >
              <img
                src={BRIDGE_LOGO}
                alt="BridgeAZ"
                className="w-48 brightness-0 invert"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative z-10"
            >
              <div className="mb-6 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-blue-100 backdrop-blur-xl">
                Your Community. Personalized.
              </div>

              <h1 className="max-w-lg text-5xl font-black leading-[1.05] tracking-[-0.04em]">
                Your Bridge to
                <span className="block bg-gradient-to-r from-blue-300 via-white to-violet-300 bg-clip-text text-transparent">
                  what matters locally.
                </span>
              </h1>

              <p className="mt-6 max-w-md text-lg font-medium leading-8 text-white/70">
                Discover people, opportunities, events, resources, and local
                connections selected around what matters to you.
              </p>
            </motion.div>

            <div className="relative z-10 grid grid-cols-3 gap-3">
              {[
                ["Discover", "Local possibilities"],
                ["Connect", "People worth knowing"],
                ["Grow", "Your community"],
              ].map(([title, text]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl"
                >
                  <p className="font-black">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/55">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* LOGIN SIDE */}
          <div className="relative flex min-h-[620px] items-center px-6 py-10 sm:px-10 lg:px-14">
            <div className="mx-auto w-full max-w-[430px]">
              {/* mobile logo */}
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-9 text-center lg:hidden"
              >
                <img
                  src={BRIDGE_LOGO}
                  alt="BridgeAZ"
                  className="mx-auto w-48"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-[#2563EB]">
                  My Bridge
                </p>

                <h2 className="text-4xl font-black tracking-[-0.04em] text-[#071A4A] sm:text-[42px]">
                  Welcome back.
                </h2>

                <p className="mt-3 text-[15px] font-medium leading-6 text-slate-500">
                  Sign in to access your personalized BridgeAZ experience.
                </p>
              </motion.div>

              <div className="mt-8 space-y-3">
                {/* Google */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading !== ""}
                  className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[15px] font-extrabold text-[#071A4A] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading === "google" ? <Spinner /> : <GoogleIcon />}

                  {loading === "google"
                    ? "Signing in..."
                    : "Continue with Google"}
                </button>

                {/* Facebook */}
                {/* <button
                  type="button"
                  onClick={handleFacebookLogin}
                  disabled={loading !== ""}
                  className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[15px] font-extrabold text-[#071A4A] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading === "facebook" ? <Spinner /> : <FacebookIcon />}

                  {loading === "facebook"
                    ? "Signing in..."
                    : "Continue with Facebook"}
                </button> */}
              </div>

              {/* divider */}
              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />

                <span className="whitespace-nowrap text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                  or continue with email
                </span>

                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {!emailSent ? (
                <form onSubmit={handleEmailLogin}>
                  <label
                    htmlFor="bridge-email"
                    className="mb-2 block text-sm font-extrabold text-[#071A4A]"
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
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-[15px] font-semibold text-[#071A4A] outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading !== ""}
                    className="relative mt-4 flex w-full items-center justify-center overflow-hidden rounded-2xl bg-[#071A4A] px-5 py-4 text-[15px] font-black text-white shadow-[0_12px_30px_rgba(7,26,74,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(7,26,74,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-500/20 to-violet-500/20" />

                    <span className="relative flex items-center gap-2">
                      {loading === "email" && <Spinner white />}

                      {loading === "email"
                        ? "Sending sign-in link..."
                        : "Send me a sign-in link"}

                      {loading !== "email" && (
                        <span className="text-lg">→</span>
                      )}
                    </span>
                  </button>

                  <p className="mt-4 text-center text-xs font-medium leading-5 text-slate-400">
                    No password needed. We&apos;ll email you a secure link to
                    sign in.
                  </p>
                </form>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-3xl border border-blue-100 bg-blue-50/70 p-6 text-center"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#071A4A] text-2xl text-white shadow-lg">
                    ✓
                  </div>

                  <h3 className="mt-4 text-xl font-black text-[#071A4A]">
                    Check your inbox
                  </h3>

                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                    We sent a secure BridgeAZ sign-in link to
                  </p>

                  <p className="mt-1 break-all text-sm font-black text-[#2563EB]">
                    {email}
                  </p>

                  <button
                    type="button"
                    onClick={() => setEmailSent(false)}
                    className="mt-5 text-sm font-extrabold text-[#071A4A] underline decoration-slate-300 underline-offset-4 transition hover:text-[#2563EB]"
                  >
                    Use a different email
                  </button>
                </motion.div>
              )}

              <div className="mt-8 border-t border-slate-100 pt-6 text-center">
                <p className="text-xs font-medium leading-5 text-slate-400">
                  By continuing, you&apos;re securely signing in to your
                  BridgeAZ member experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

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

// function FacebookIcon() {
//   return (
//     <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
//       <circle cx="12" cy="12" r="11" fill="#1877F2" />
//       <path
//         fill="#fff"
//         d="M15.4 12.7h-2.2V20h-3v-7.3H8.7v-2.5h1.5V8.7c0-2.1 1-3.4 3.7-3.4h2v2.5h-1.3c-1 0-1.4.4-1.4 1.2v1.2h2.8l-.6 2.5Z"
//       />
//     </svg>
//   );
// }

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
