import { useEffect, useState } from "react";

import { motion } from "framer-motion";

import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth } from "./firebase";

import {
  Home,
  ChevronDown,
  ArrowRight,
  UserRoundPlus,
  Plus,
  Send,
  LockKeyhole,
  Check,
  Users,
  Heart,
  Sparkles,
  FileClock,
  Layers3,
  LogOut,
} from "lucide-react";

const BRIDGE_LOGO =
  "https://mcusercontent.com/2ead8cf9844eae73676cdedb6/images/5c553236-b34b-a985-35dd-24d9bba8f0a1.png";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2200&q=88";

export default function MyBridgeHome() {
  const [user, setUser] = useState(null);

  // Actual Bridge member returned from Airtable through backend
  const [bridgeMember, setBridgeMember] = useState(null);

  const [accountOpen, setAccountOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);

      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  /*
    -------------------------------------------------------
    FIREBASE AUTH STATE
    -------------------------------------------------------
  */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setBridgeMember(null);
      }
    });

    return unsubscribe;
  }, []);

  /*
    -------------------------------------------------------
    VERIFY FIREBASE USER WITH BACKEND

    Firebase UID
        ↓
    Airtable Members
        ↓
    Actual Bridge Member
    -------------------------------------------------------
  */

  useEffect(() => {
    if (!user) {
      return;
    }

    const verifyLoginWithBackend = async () => {
      try {
        const idToken = await user.getIdToken();

        const response = await fetch(
          "https://bridgeaz-recommendations-server.vercel.app/api/auth/me",
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          },
        );

        const data = await response.json();

        console.log("BACKEND AUTH TEST:", data);

        if (data.success && data.memberFound && data.member) {
          setBridgeMember(data.member);
        } else {
          setBridgeMember(null);
        }
      } catch (error) {
        console.error("Backend auth test failed:", error);

        setBridgeMember(null);
      }
    };

    verifyLoginWithBackend();
  }, [user]);

  /*
    TEMPORARY.

    We will connect actual membership/onboarding
    completion separately.

    Do not use memberFound alone as membership
    completion yet.
  */

const isMember = Boolean(bridgeMember);

const canAccessMyBridge =
  bridgeMember?.status === "Active" &&
  bridgeMember?.conversationStatus === "Completed";

  /*
    -------------------------------------------------------
    DISPLAY IDENTITY

    IMPORTANT:
    Name and photo come ONLY from Airtable Member.

    We are NOT using:
    - Google display name
    - Google photo
    - Facebook profile
    - Firebase display name/photo
    -------------------------------------------------------
  */

  const displayName = bridgeMember?.fullName || "Bridge Member";

  const profilePhoto = bridgeMember?.profilePhoto || "";

  return (
    <main className="min-h-screen bg-[#F5F6F8] font-[Inter] text-[#071A4A]">
      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="relative z-50 border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex h-[78px] max-w-[1450px] items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-10">
            <div className="flex h-[78px] w-[185px] items-center justify-start">
              <img
                src={BRIDGE_LOGO}
                alt="BridgeAZ"
                className="max-h-[58px] w-auto max-w-[180px] object-contain"
              />
            </div>

            <nav className="hidden h-full items-center gap-8 lg:flex">
              <NavItem icon={Home} label="Home" active />

              <NavItem label="Become a Member" />

              <NavItem label="Share With Bridge" />

              <NavItem label="My Bridge" locked={!canAccessMyBridge} />
            </nav>
          </div>

          {/* =====================================================
              ACTUAL AIRTABLE MEMBER
          ===================================================== */}

          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountOpen((prev) => !prev)}
              className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition hover:bg-slate-50"
            >
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt={displayName}
                  className="h-11 w-11 rounded-full border-2 border-white object-cover shadow-md"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#071A4A] to-[#2563EB] text-sm font-black uppercase text-white">
                  {displayName.charAt(0)}
                </div>
              )}

              <div className="hidden text-left sm:block">
                <p className="text-[11px] font-medium text-slate-400">
                  Welcome
                </p>

                <div className="flex items-center gap-1">
                  <p className="max-w-[150px] truncate text-sm font-black text-[#071A4A]">
                    {displayName}
                  </p>

                  <ChevronDown
                    size={14}
                    className={`transition-transform ${
                      accountOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>
            </button>

            {accountOpen && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 8,
                  scale: 0.98,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                className="absolute right-0 top-[58px] z-[100] w-[220px] rounded-[18px] border border-slate-200 bg-white p-2 shadow-[0_20px_60px_rgba(7,26,74,0.16)]"
              >
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"
                >
                  <LogOut size={17} />
                  Log Out
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </header>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section
        className="relative min-h-[420px] overflow-hidden bg-cover bg-center lg:min-h-[455px]"
        style={{
          backgroundImage: `
            linear-gradient(
              90deg,
              rgba(5,20,55,.94) 0%,
              rgba(5,20,55,.82) 40%,
              rgba(5,20,55,.30) 75%,
              rgba(5,20,55,.15) 100%
            ),
            url("${HERO_IMAGE}")
          `,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#071A4A]/35 via-transparent to-transparent" />

        <motion.div
          animate={{
            scale: [1, 1.12, 1],
            opacity: [0.15, 0.28, 0.15],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -right-32 -top-32 h-[450px] w-[450px] rounded-full bg-orange-400 blur-[130px]"
        />

        <div className="relative z-10 mx-auto max-w-[1450px] px-5 py-14 md:px-8 lg:py-14">
          <motion.div
            initial={{
              opacity: 0,
              x: -25,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.7,
            }}
            className="max-w-[730px]"
          >
            <p className="text-[12px] font-black uppercase tracking-[0.42em] text-white/75 sm:text-sm">
              Welcome to BridgeAZ
            </p>

            <h1 className="mt-5 text-[42px] font-black leading-[1] tracking-[-0.045em] text-white sm:text-5xl lg:text-[64px]">
              Join. Share.
              <span className="block">
                Discover <span className="text-[#FFAE3D]">Your Bridge.</span>
              </span>
            </h1>

            <p className="mt-6 max-w-[640px] text-base font-medium leading-7 text-white/80 sm:text-lg">
              Become part of BridgeAZ, contribute useful things to your
              community, and unlock a personalized local experience built around
              what matters to you.
            </p>
          </motion.div>

          {/* Hero status card */}

          {!isMember && (
            <motion.div
              initial={{
                opacity: 0,
                x: 30,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                delay: 0.3,
              }}
              className="absolute bottom-12 right-10 hidden max-w-[360px] rounded-[24px] border border-white/25 bg-black/25 p-5 text-white backdrop-blur-xl lg:block"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <LockKeyhole size={20} />
                </div>

                <div>
                  <p className="font-black">Your My Bridge is waiting</p>

                  <p className="mt-1 text-xs leading-5 text-white/65">
                    Complete your Bridge membership to unlock your personalized
                    recommendations and member experience.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* =====================================================
          MAIN THREE AREAS
      ===================================================== */}

      <section className="relative z-20 -mt-[42px]">
        <div className="mx-auto max-w-[1450px] px-5 pb-12 md:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* =====================================================
                1. BECOME A MEMBER
            ===================================================== */}

            <FeatureCard
              number="01"
              numberColor="text-[#0A4BA8]"
              background="from-[#F5FAFF] via-white to-[#EDF6FF]"
              illustration={<MemberIllustration />}
              title="Become a Member"
              description="Tell Bridge who you are and what matters to you. Complete your membership to unlock My Bridge."
              bullets={[
                "Complete your Bridge setup",
                "Tell us your interests",
                "Help Bridge personalize your experience",
                "Unlock your full My Bridge",
              ]}
              buttonText={isMember ? "Membership Complete" : "Become a Member"}
              buttonClass={
                isMember
                  ? "bg-emerald-600 text-white"
                  : "bg-gradient-to-r from-[#061B55] to-[#073A91] text-white"
              }
              completed={isMember}
            />

            {/* =====================================================
                2. SHARE WITH BRIDGE
            ===================================================== */}

            <FeatureCard
              number="02"
              numberColor="text-[#9A4DFF]"
              background="from-[#FCF8FF] via-white to-[#F5EEFF]"
              illustration={<ShareIllustration />}
              title="Share With Bridge"
              description="Tell us the basic facts. Bridge AI helps prepare the submission, then you review and approve it."
              customContent={
                <div className="mt-5 space-y-3">
                  <SubmissionOption
                    icon={Plus}
                    title="New Submission"
                    subtitle="Share one event, resource or opportunity."
                  />

                  <SubmissionOption
                    icon={Layers3}
                    title="Multiple Submissions"
                    subtitle="Share several items in one session."
                  />

                  <SubmissionOption
                    icon={FileClock}
                    title="Drafts & Previous"
                    subtitle="Continue or review previous submissions."
                  />
                </div>
              }
              buttonText="Share Something"
              buttonClass="bg-gradient-to-r from-[#7C3AED] to-[#A92EFF] text-white"
            />

            {/* =====================================================
                3. MY BRIDGE
            ===================================================== */}

            <FeatureCard
              number="03"
              numberColor={
                canAccessMyBridge ? "text-[#2563EB]" : "text-[#997554]"
              }
              background={
                canAccessMyBridge
                  ? "from-[#F4F8FF] via-white to-[#EEF4FF]"
                  : "from-[#FFFCF6] via-white to-[#FFF5E7]"
              }
              illustration={
                canAccessMyBridge ? (
                  <UnlockedBridgeIllustration />
                ) : (
                  <LockedIllustration />
                )
              }
              title="My Bridge"
              description={
                canAccessMyBridge
                  ? "Open your personalized Bridge experience."
                  : "Your full personalized Bridge experience unlocks after you become a member."
              }
              bullets={[
                "Selected For You",
                "Community Hub",
                "Discover",
                "People Worth Discovering",
                "Profile & Connections",
              ]}
              locked={!canAccessMyBridge}
              buttonText={
                canAccessMyBridge
                  ? "Open My Bridge"
                  : "Become a Member to Unlock"
              }
              buttonClass="bg-gradient-to-r from-[#071A4A] to-[#2563EB] text-white"
              onClick={() => {
                if (canAccessMyBridge && bridgeMember?.myBridgeToken) {
                  window.location.href = `/recommendations/${bridgeMember.myBridgeToken}`;
                }
              }}
            />
          </div>

          {/* =====================================================
              BOTTOM INFO
          ===================================================== */}

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            className="mt-6 grid overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_18px_60px_rgba(7,26,74,0.06)] lg:grid-cols-[1.6fr_1fr]"
          >
            <div className="flex items-start gap-5 p-6 sm:p-7">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FFF1C9] text-[#E3A000]">
                <Sparkles size={24} />
              </div>

              <div>
                <h3 className="text-base font-black text-[#071A4A]">
                  Membership unlocks My Bridge
                </h3>

                <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                  Once your Bridge membership is completed, your existing
                  personalized recommendations experience becomes available as
                  My Bridge.
                </p>
              </div>
            </div>

            <div className="grid border-t border-slate-100 sm:grid-cols-2 lg:border-l lg:border-t-0">
              <BenefitItem
                icon={Users}
                iconBg="bg-blue-50"
                iconColor="text-blue-500"
                title="Personalized"
                text="People, content and opportunities selected for you."
              />

              <BenefitItem
                icon={Heart}
                iconBg="bg-pink-50"
                iconColor="text-pink-500"
                title="Connected"
                text="Discover meaningful people and community activity."
              />
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}

/* =====================================================
   NAV
===================================================== */

function NavItem({ icon: Icon, label, active = false, locked = false }) {
  return (
    <button
      type="button"
      className={`relative flex h-[78px] items-center gap-2 text-sm font-bold transition ${
        active ? "text-[#071A4A]" : "text-slate-500 hover:text-[#071A4A]"
      }`}
    >
      {Icon && <Icon size={17} strokeWidth={2.5} />}

      {locked && <LockKeyhole size={13} />}

      {label}

      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-[#2563EB]" />
      )}
    </button>
  );
}

/* =====================================================
   MAIN CARD
===================================================== */

function FeatureCard({
  number,
  numberColor,
  background,
  illustration,
  title,
  description,
  bullets = [],
  buttonText,
  buttonClass = "",
  locked = false,
  completed = false,
  customContent = null,
  onClick,
}) {
  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 35,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
      }}
      whileHover={{
        y: -7,
      }}
      transition={{
        duration: 0.4,
      }}
      className={`relative flex min-h-[585px] flex-col overflow-hidden rounded-[28px] border border-white/80 bg-gradient-to-br ${background} p-7 shadow-[0_25px_70px_rgba(7,26,74,0.09)]`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-sm font-black ${numberColor}`}>{number}</span>

        {locked && (
          <div className="flex items-center gap-1.5 rounded-full border border-[#F2DCA7] bg-[#FFF3C9] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#604E27]">
            <LockKeyhole size={11} />
            Members Only
          </div>
        )}

        {completed && (
          <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-600">
            ✓ Member
          </div>
        )}
      </div>

      <div className="relative my-3 h-[175px]">{illustration}</div>

      <h2 className="text-[27px] font-black tracking-[-0.035em] text-[#071A4A]">
        {title}
      </h2>

      <p className="mt-2 text-[15px] font-medium leading-6 text-slate-600">
        {description}
      </p>

      {customContent}

      {!customContent && (
        <div className="mt-5 space-y-2.5">
          {bullets.map((bullet) => (
            <div
              key={bullet}
              className="flex items-center gap-3 text-sm font-semibold text-slate-600"
            >
              <span
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${
                  locked
                    ? "bg-[#E7E0D5] text-[#9B8C76]"
                    : "bg-[#2196F3] text-white"
                }`}
              >
                {locked ? (
                  <LockKeyhole size={10} />
                ) : (
                  <Check size={11} strokeWidth={3} />
                )}
              </span>

              {bullet}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onClick}
        disabled={locked}
        className={`mt-auto flex w-full items-center justify-between rounded-2xl px-5 py-4 text-sm font-black shadow-sm transition ${
          locked
            ? "cursor-not-allowed bg-slate-200/80 text-slate-500"
            : `${buttonClass} cursor-pointer hover:-translate-y-0.5 hover:shadow-xl`
        }`}
      >
        <span className="flex items-center gap-2">
          {locked && <LockKeyhole size={15} />}

          {buttonText}
        </span>

        {!locked && <ArrowRight size={18} />}
      </button>
    </motion.article>
  );
}

/* =====================================================
   SHARE SUBMENU ITEM
===================================================== */

function SubmissionOption({ icon: Icon, title, subtitle }) {
  return (
    <button
      type="button"
      className="group flex w-full items-center gap-3 rounded-2xl border border-violet-100 bg-white/70 p-3 text-left transition hover:border-violet-200 hover:bg-white hover:shadow-md"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-[#7C3AED] transition group-hover:bg-[#7C3AED] group-hover:text-white">
        <Icon size={18} />
      </div>

      <div className="min-w-0">
        <p className="text-sm font-black text-[#071A4A]">{title}</p>

        <p className="mt-0.5 text-[11px] font-medium leading-4 text-slate-400">
          {subtitle}
        </p>
      </div>

      <ArrowRight
        size={15}
        className="ml-auto shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-500"
      />
    </button>
  );
}

/* =====================================================
   ILLUSTRATIONS
===================================================== */

function MemberIllustration() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="absolute h-[150px] w-[240px] rounded-full bg-blue-300/20 blur-[25px]" />

      <motion.div
        animate={{
          y: [0, -7, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative flex h-[130px] w-[155px] items-center justify-center rounded-[28px] border border-white bg-white/65 shadow-[0_20px_45px_rgba(37,99,235,0.15)] backdrop-blur"
      >
        <div className="relative">
          <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-b from-blue-300 to-blue-500" />

          <div className="mt-[-3px] h-14 w-24 rounded-t-[50px] bg-gradient-to-b from-blue-400 to-blue-600" />
        </div>

        <div className="absolute -right-7 top-8 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#2D9CFF] to-[#0575E6] text-white shadow-xl">
          <Plus size={30} strokeWidth={3} />
        </div>

        <div className="absolute -left-4 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#2196F3] text-white shadow-lg">
          <UserRoundPlus size={16} />
        </div>
      </motion.div>
    </div>
  );
}

function ShareIllustration() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="absolute h-[145px] w-[250px] rounded-full bg-purple-300/25 blur-[30px]" />

      <motion.div
        animate={{
          y: [0, -5, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative"
      >
        <div className="relative h-[125px] w-[170px] rounded-[24px] border border-white bg-white/90 p-5 shadow-[0_25px_50px_rgba(124,58,237,0.16)]">
          <div className="h-3 w-16 rounded-full bg-violet-400" />

          <div className="mt-4 h-2 w-full rounded-full bg-slate-200" />

          <div className="mt-2 h-2 w-[85%] rounded-full bg-slate-200" />

          <div className="mt-2 h-2 w-[60%] rounded-full bg-slate-200" />
        </div>

        <motion.div
          animate={{
            x: [0, 7, 0],
            y: [0, -5, 0],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -right-14 bottom-[-15px] flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#A347FF] to-[#7C3AED] text-white shadow-xl"
        >
          <Send size={27} fill="white" />
        </motion.div>
      </motion.div>
    </div>
  );
}

function LockedIllustration() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="absolute h-[150px] w-[240px] rounded-full bg-orange-200/35 blur-[30px]" />

      <motion.div
        animate={{
          y: [0, -6, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="flex h-[110px] w-[110px] items-center justify-center rounded-[28px] bg-gradient-to-br from-[#233C72] to-[#071A4A] text-white shadow-[0_25px_55px_rgba(7,26,74,0.30)]"
      >
        <LockKeyhole size={45} strokeWidth={1.8} />
      </motion.div>
    </div>
  );
}

function UnlockedBridgeIllustration() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="absolute h-[150px] w-[240px] rounded-full bg-blue-300/25 blur-[30px]" />

      <motion.div
        animate={{
          y: [0, -5, 0],
          scale: [1, 1.03, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="flex h-[115px] w-[170px] items-center justify-center rounded-[28px] bg-gradient-to-br from-[#071A4A] to-[#2563EB] text-white shadow-[0_25px_55px_rgba(37,99,235,0.28)]"
      >
        <div className="text-center">
          <Sparkles size={32} className="mx-auto" />

          <p className="mt-2 text-xs font-black">My Bridge</p>
        </div>
      </motion.div>
    </div>
  );
}

/* =====================================================
   BOTTOM BENEFIT
===================================================== */

function BenefitItem({ icon: Icon, iconBg, iconColor, title, text }) {
  return (
    <div className="flex items-start gap-3 border-t border-slate-100 p-5 first:border-t-0 sm:border-l sm:border-t-0">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconBg} ${iconColor}`}
      >
        <Icon size={20} strokeWidth={2.5} />
      </div>

      <div>
        <p className="text-xs font-black text-[#071A4A]">{title}</p>

        <p className="mt-1 text-[11px] font-medium leading-4 text-slate-500">
          {text}
        </p>
      </div>
    </div>
  );
}
