import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import FloatingScene from "./components/FloatingScene";
const API_BASE =
  "https://bridgeaz-recommendations-server.vercel.app/api/recommendations";

const fallbackTheme = {
  primary: "#2C3E50",
  secondary: "#E67E22",
  text: "#34495E",
  cardStyle: "elegant",
  font: "Inter",
  mood: "professional",
};

// const moodMotionMap = {
//   energetic: {
//     floatY: [0, -28, 0],
//     floatX: [0, 24, 0],
//     duration: 5,
//     cardDelay: 0.08,
//     heroScale: [1, 1.025, 1],
//   },
//   calm: {
//     floatY: [0, -10, 0],
//     floatX: [0, 8, 0],
//     duration: 9,
//     cardDelay: 0.16,
//     heroScale: [1, 1.01, 1],
//   },
//   creative: {
//     floatY: [0, -22, 0],
//     floatX: [0, -22, 0],
//     duration: 6,
//     cardDelay: 0.1,
//     heroScale: [1, 1.02, 1],
//   },
//   luxury: {
//     floatY: [0, -8, 0],
//     floatX: [0, 6, 0],
//     duration: 10,
//     cardDelay: 0.18,
//     heroScale: [1, 1.008, 1],
//   },
//   professional: {
//     floatY: [0, -14, 0],
//     floatX: [0, 12, 0],
//     duration: 8,
//     cardDelay: 0.12,
//     heroScale: [1, 1.012, 1],
//   },
// };

function getAnimatedNames(realName) {
  const shuffled = [...fakeNames];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);

    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return [...shuffled.slice(0, 3), realName || "Guest"];
}

function normalizeData(data) {
  const theme = {
    ...fallbackTheme,
    ...(data?.recommendations?.theme || data?.theme || {}),
  };

  let items = [];

  if (Array.isArray(data?.recommendations?.items)) {
    items = data.recommendations.items;
  }

  return {
    firstName: data?.firstName || "Guest",
    heroHeadline:
      data?.recommendations?.heroHeadline ||
      data?.heroHeadline ||
      "Personalized Recommendations",

    heroSubheadline:
      data?.recommendations?.heroSubheadline ||
      data?.heroSubheadline ||
      "AI-curated recommendations for you.",

    themeName:
      data?.recommendations?.themeName ||
      data?.themeName ||
      "Personalized Picks",

    theme,
    items,
  };
}

function LoadingScreen() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#071A4A]">
      {/* expanding circle */}
      <motion.div
        initial={{
          scale: 0,
          opacity: 0.9,
        }}
        animate={{
          scale: 14,
          opacity: 0,
        }}
        transition={{
          duration: 3,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="absolute h-40 w-40 rounded-full"
        style={{
          background: "radial-gradient(circle,#60A5FA,#7C3AED,#0B3694)",
          filter: "blur(20px)",
        }}
      />

      {/* center orb */}
      <motion.div
        initial={{
          scale: 0.4,
          opacity: 0,
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: 1,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative z-10 flex h-40 w-40 items-center justify-center rounded-full"
        style={{
          background: "linear-gradient(135deg,#2563EB,#7C3AED)",
          boxShadow: "0 0 120px rgba(124,58,237,0.55)",
        }}
      >
        {/* inner glow */}
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
          }}
          className="absolute inset-4 rounded-full bg-white/20 backdrop-blur-xl"
        />

        {/* logo text */}
        <div className="relative z-10 text-center text-white">
          <p className="text-xs font-black uppercase tracking-[0.45em]">
            BridgeAZ
          </p>

          <motion.p
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.6,
            }}
            className="mt-3 text-sm font-medium text-white/80"
          >
            Loading Your Local Pulse
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] px-6">
      <div className="rounded-3xl bg-white p-10 text-center shadow-xl">
        <h1 className="text-3xl font-bold text-[#071A4A]">
          No personalized recommendations found
        </h1>

        <p className="mt-4 text-gray-600">
          This link may be expired or unavailable.
        </p>
      </div>
    </div>
  );
}

function RecommendationCard({ item, theme, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-7 shadow-[0_15px_45px_rgba(7,26,74,0.08)] transition duration-300 hover:-translate-y-2 hover:shadow-[0_25px_60px_rgba(7,26,74,0.16)]"
    >
      <div
        className="absolute left-0 top-0 h-full w-1.5"
        style={{ backgroundColor: theme.secondary }}
      />

      <div
        className="absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-10 blur-3xl"
        style={{ backgroundColor: theme.secondary }}
      />

      <span
        className="mb-5 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white"
        style={{ backgroundColor: theme.primary }}
      >
        {item?.type || "Local Pick"}
      </span>

      <h3 className="text-2xl font-bold leading-tight text-[#071A4A]">
        {item?.title}
      </h3>

      {item?.details && (
        <p className="mt-4 leading-7 text-gray-600">{item.details}</p>
      )}

      <div className="mt-5 space-y-2 text-sm text-gray-500">
        {item?.date && <p>📅 {item.date}</p>}
        {item?.location && <p>📍 {item.location}</p>}
      </div>

      {item?.link ? (
        <a
          href={item.link}
          target="_blank"
          rel="noreferrer"
          className="mt-7 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03]"
          style={{
            background: `linear-gradient(
      135deg,
      #071A4A 0%,
      ${theme.primary} 55%,
      #071A4A 100%
    )`,
            border: `1px solid ${theme.secondary}`,
            boxShadow: `
      0 10px 28px rgba(7, 26, 74, 0.35),
      0 0 0 3px ${theme.secondary}22
    `,
            color: "#ffffff",
          }}
        >
          <span>View Details</span>
          <span>→</span>
        </a>
      ) : (
        <p className="mt-7 text-sm font-semibold text-[#0B3694]">
          Learn more locally
        </p>
      )}
    </motion.div>
  );
}

const fakeNames = [
  "Ava",
  "Liam",
  "Sophia",
  "Noah",
  "Mia",
  "Ethan",
  "Olivia",
  "Lucas",
  "Emma",
  "Mason",
  "Charlotte",
  "James",
  "Amelia",
  "Benjamin",
  "Harper",
  "Elijah",
  "Abigail",
  "Henry",
  "Scarlett",
  "Alexander",
  "Emily",
  "Daniel",
  "Ella",
  "Michael",
  "Grace",
  "Samuel",
  "Victoria",
  "David",
  "Lily",
  "Joseph",
  "Avery",
  "Matthew",
  "Sofia",
  "Sebastian",
  "Chloe",
  "Jack",
  "Aria",
  "Levi",
  "Nora",
  "Owen",
  "Hannah",
  "Gabriel",
  "Zoey",
  "Carter",
  "Layla",
  "Julian",
  "Riley",
  "Wyatt",
  "Eleanor",
  "Isaac",
  "Natalie",
  "Luke",
  "Addison",
  "Nathan",
  "Brooklyn",
  "Christian",
  "Savannah",
  "Aaron",
  "Paisley",
  "Jonathan",
];

export default function PersonalizedRecommendationsPage() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);
  const [showIntro, setShowIntro] = useState(true);



 

  useEffect(() => {
    let active = true;

    async function fetchRecommendations() {
      try {
        setLoading(true);

        const cacheKey = `recommendations-${token}`;
        const cached = sessionStorage.getItem(cacheKey);

        if (cached) {
          setRawData(JSON.parse(cached));
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE}/${token}`);
        const text = await response.text();

        console.log("RAW API:", text);

        if (!active) return;

        if (text.trim() === "Accepted") {
          console.warn("Make returned Accepted. Keeping existing data.");
          return;
        }

        const result = JSON.parse(text);

        if (result?.success === true) {
          sessionStorage.setItem(cacheKey, JSON.stringify(result));
          setRawData(result);
        }
      } catch (err) {
        console.error("API ERROR:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchRecommendations();

    return () => {
      active = false;
    };
  }, [token]);

  const profile = useMemo(() => {
    if (!rawData) return null;
    return normalizeData(rawData);
  }, [rawData]);

const animatedNames = getAnimatedNames(profile?.firstName);



  

  useEffect(() => {
    if (!profile) return;

    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 9500);

    return () => clearTimeout(timer);
  }, [profile]);

  //   const moodMotion =
  //     moodMotionMap[profile?.theme?.mood || "professional"] ||
  //     moodMotionMap.professional;
  console.log("ACTIVE THEME:", profile?.theme);

  if (loading) return <LoadingScreen />;

  if (!profile) return <ErrorState />;

  // const introSteps = [
  //   "Reading your interests",
  //   "Matching local events",
  //   "Selecting resources",
  //   "Designing your personal theme",
  // ];

  

  return (
    <main
      className="relative min-h-screen w-screen overflow-x-hidden overflow-y-hidden"
      style={{
        fontFamily: `${profile.theme.font || "Inter"}, sans-serif`,
        backgroundColor: profile.theme.background || "#F7F7F7",
        color: profile.theme.text || "#34495E",
      }}
    >
      <FloatingScene theme={profile.theme} />

      {showIntro && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-9999 flex items-center justify-center overflow-hidden px-6"
          style={{
            background: `
      radial-gradient(circle at 25% 30%, ${profile.theme.secondary}55, transparent 35%),
      radial-gradient(circle at 80% 40%, ${profile.theme.primary}66, transparent 40%),
      linear-gradient(135deg, #0f172a, ${profile.theme.primary})
    `,
            backdropFilter: "blur(18px)",
          }}
        >
          <div className="relative flex h-screen w-full items-center justify-center overflow-hidden text-white">
            {/* flying cloud layers */}
            <motion.div
              initial={{ scale: 1.8, opacity: 0.9 }}
              animate={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 6, ease: "easeInOut" }}
              className="absolute inset-0"
              style={{
                background: `
        radial-gradient(circle at 20% 40%, rgba(255,255,255,0.85), transparent 22%),
        radial-gradient(circle at 70% 30%, rgba(255,255,255,0.65), transparent 24%),
        radial-gradient(circle at 45% 70%, rgba(255,255,255,0.75), transparent 28%)
      `,
                filter: "blur(30px)",
              }}
            />

            <motion.div
              initial={{ scale: 2.4, opacity: 0.7 }}
              animate={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 6.5, ease: "easeInOut" }}
              className="absolute inset-0"
              style={{
                background: `
        radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), transparent 18%),
        radial-gradient(circle at 80% 55%, rgba(255,255,255,0.65), transparent 25%),
        radial-gradient(circle at 10% 80%, rgba(255,255,255,0.65), transparent 24%)
      `,
                filter: "blur(45px)",
              }}
            />

            {/* center cinematic card */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative z-10 w-[92%] max-w-3xl overflow-hidden rounded-4xl bg-black/15 p-7 text-center shadow-[0_35px_120px_rgba(0,0,0,0.22)] backdrop-blur-3xl md:rounded-[2.5rem] md:p-12"
            >
              <motion.img
                src="https://mcusercontent.com/2ead8cf9844eae73676cdedb6/images/5c553236-b34b-a985-35dd-24d9bba8f0a1.png"
                alt="BridgeAZ"
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mx-auto mb-8 w-42.5 brightness-0 invert md:w-55"
              />

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.4, delay: 0.4 }}
                className="text-sm font-bold uppercase tracking-[0.4em] text-white/75"
              >
                Connecting to Bridge
              </motion.p>

              <motion.div className="mt-8 h-20 overflow-hidden">
                {animatedNames.map((name, index) => (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{
                      opacity: index === 3 ? [0, 0, 1] : [0, 1, 0],
                      y: index === 3 ? [30, 20, 0] : [30, 0, -30],
                    }}
                    transition={{
                      delay: 1.8 + index * 1.1,
                      duration: index === 3 ? 1.8 : 1.1,
                    }}
                    className="absolute inset-0 flex items-center justify-center text-4xl font-black md:text-6xl"
                  >
                    {name}
                  </motion.div>
                ))}
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.8 }}
                className="mt-6 text-lg font-medium text-white/85"
              >
                Found your personalized local experience.
              </motion.p>

              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.6, duration: 5, ease: "easeInOut" }}
                className="mx-auto mt-10 h-1 rounded-full bg-white/80"
              />

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.75 }}
                transition={{ delay: 3 }}
                className="mt-5 text-sm uppercase tracking-[0.28em] text-white/70"
              >
                Entering your page
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      )}
      {/* premium sky atmosphere */}
      <div className="pointer-events-none fixed inset-0 z-1 overflow-hidden">
        {/* base sky */}
        <div
          className="absolute inset-0"
          style={{
            background: `
        radial-gradient(circle at 20% 15%, ${profile.theme.secondary}18 0%, transparent 32%),
        radial-gradient(circle at 85% 20%, ${profile.theme.primary}16 0%, transparent 34%),
        linear-gradient(180deg, #ffffff 0%, ${profile.theme.background || "#F5F7FA"} 45%, #ffffff 100%)
      `,
          }}
        />

        {/* luxury moving light cloud */}
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
          className="absolute left-[-8%] top-[10%] h-130 w-190 rounded-full"
          style={{
            background: `
        radial-gradient(circle at 35% 40%, rgba(255,255,255,0.95), transparent 38%),
        radial-gradient(circle at 60% 45%, ${profile.theme.secondary}20, transparent 42%),
        radial-gradient(circle at 45% 70%, rgba(255,255,255,0.8), transparent 48%)
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
          className="absolute right-[-12%] top-[18%] h-155 w-195 rounded-full"
          style={{
            background: `
        radial-gradient(circle at 40% 40%, ${profile.theme.primary}20, transparent 38%),
        radial-gradient(circle at 65% 55%, rgba(255,255,255,0.85), transparent 44%),
        radial-gradient(circle at 35% 70%, ${profile.theme.secondary}16, transparent 50%)
      `,
            filter: "blur(70px)",
            opacity: 0.75,
          }}
        />

        {/* lower cloud bed */}
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
          className="absolute -bottom-45 left-[-10%] h-105 w-[120%]"
          style={{
            background: `
        radial-gradient(ellipse at 20% 40%, rgba(255,255,255,0.95), transparent 45%),
        radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.9), transparent 48%),
        radial-gradient(ellipse at 80% 45%, rgba(255,255,255,0.95), transparent 45%)
      `,
            filter: "blur(45px)",
          }}
        />
      </div>

      {/* top bar */}
      <div
        className="relative z-10 px-6 py-3 text-white"
        style={{ backgroundColor: profile.theme.primary }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between text-sm">
          <span>Prescott, Arizona</span>
          <span>connect@bridgeaz.co</span>
        </div>
      </div>
      {/* logo */}
      <section className="relative z-10 px-6 py-10 text-center">
        <motion.img
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          src="https://mcusercontent.com/2ead8cf9844eae73676cdedb6/images/5c553236-b34b-a985-35dd-24d9bba8f0a1.png"
          alt="BridgeAZ"
          className="mx-auto w-45 drop-shadow-[0_10px_30px_rgba(0,0,0,0.08)] md:w-60"
        />
      </section>
      {/* hero */}
      {/* hero */}
      <section className="relative z-10 px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative mx-auto max-w-6xl overflow-hidden rounded-[42px]"
        >
          {/* animated outer glow */}
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              repeat: Infinity,
              duration: 18,
              ease: "linear",
            }}
            className="absolute -inset-50 opacity-40"
            style={{
              background: `
          conic-gradient(
            from 90deg,
            ${profile.theme.primary},
            ${profile.theme.secondary},
            #ffffff,
            ${profile.theme.primary}
          )
        `,
              filter: "blur(120px)",
            }}
          />

          {/* glass border */}
          <motion.div
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              repeat: Infinity,
              duration: 10,
              ease: "linear",
            }}
            className="relative rounded-[42px] p-[1.5px]"
            style={{
              background: `
          linear-gradient(
            120deg,
            ${profile.theme.primary},
            ${profile.theme.secondary},
            rgba(255,255,255,0.9),
            ${profile.theme.primary}
          )
        `,
              backgroundSize: "300% 300%",
            }}
          >
            {/* actual card */}
            <div
              className="relative overflow-hidden rounded-[40px] border border-white/40 bg-white/75 p-8 backdrop-blur-3xl md:p-14"
              style={{
                boxShadow: `
            0 40px 120px rgba(15,23,42,0.12),
            inset 0 1px 0 rgba(255,255,255,0.7)
          `,
              }}
            >
              {/* floating light */}
              <motion.div
                animate={{
                  x: ["-30%", "130%"],
                  opacity: [0, 0.12, 0.18, 0.12, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 10,
                  ease: "easeInOut",
                }}
                className="absolute top-0 h-full w-70 rotate-12"
                style={{
                  background: `
      linear-gradient(
        90deg,
        transparent 0%,
        rgba(255,255,255,0.08) 20%,
        rgba(255,255,255,0.18) 50%,
        rgba(255,255,255,0.08) 80%,
        transparent 100%
      )
    `,
                  filter: "blur(28px)",
                  mixBlendMode: "screen",
                }}
              />

              {/* top line */}
              <div
                className="mb-8 h-0.75 w-40 rounded-full"
                style={{
                  background: `linear-gradient(
              90deg,
              ${profile.theme.primary},
              ${profile.theme.secondary}
            )`,
                }}
              />

              {/* personalized badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8 inline-flex flex-col items-center gap-2 rounded-3xl border border-white/40 bg-white/60 px-5 py-4 shadow-lg backdrop-blur-xl sm:flex-row sm:gap-3"
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: profile.theme.secondary,
                    boxShadow: `0 0 25px ${profile.theme.secondary}`,
                  }}
                />

                <span className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">
                  Personalized For
                </span>

                <span
                  className="text-sm font-black uppercase tracking-[0.18em]"
                  style={{
                    color: profile.theme.primary,
                  }}
                >
                  {profile.firstName}
                </span>
              </motion.div>

              {/* headline */}
              <h1
                className="max-w-5xl text-5xl font-black leading-[1.05] md:text-7xl"
                style={{
                  color: profile.theme.primary,
                }}
              >
                {profile.heroHeadline}
              </h1>

              {/* subheadline */}
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
                {profile.heroSubheadline}
              </p>

              {/* chips */}
              <div className="mt-8 flex flex-wrap gap-3">
                {(profile.theme.personalityChips || []).map((chip, index) => (
                  <motion.div
                    key={chip}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 0.4 + index * 0.08,
                    }}
                    className="rounded-full px-5 py-3 text-sm font-bold text-white shadow-xl"
                    style={{
                      background: `linear-gradient(
                  135deg,
                  ${profile.theme.primary},
                  ${profile.theme.secondary}
                )`,
                    }}
                  >
                    {chip}
                  </motion.div>
                ))}
              </div>

              {/* theme badge */}
              <div className="mt-10">
                <span
                  className="rounded-full px-6 py-3 text-sm font-bold text-white shadow-2xl"
                  style={{
                    background: `linear-gradient(
                135deg,
                ${profile.theme.primary},
                ${profile.theme.secondary}
              )`,
                  }}
                >
                  {profile.themeName}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>
      {/* recommendations */}
      <section className="relative z-10 px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10">
            {/* <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#C62828]">
              AI-Curated Local Picks
            </p> */}

            <h2 className="mt-3 text-4xl font-bold text-[#071A4A]">
              Selected For You
            </h2>

            <p className="mt-3 max-w-2xl text-gray-600">
              Local events, resources, and opportunities based on your
              interests.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {profile.items.map((item, index) => (
              <RecommendationCard
                key={index}
                item={item}
                theme={profile.theme}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>
      {/* floating AI delight */}
      <motion.div
        animate={{
          y: [0, -18, 0],
          rotate: [0, 7, -7, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          repeat: Infinity,
          duration: 5,
        }}
        className="fixed bottom-8 right-8 z-60"
      >
        <div className="group relative hidden cursor-pointer md:block">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full shadow-2xl backdrop-blur-xl"
            style={{
              background: `linear-gradient(135deg, ${profile.theme.primary}, ${profile.theme.secondary})`,
              boxShadow: `0 20px 60px ${profile.theme.secondary}66`,
            }}
          >
            <span className="text-4xl">
              {profile.theme.delightIcon || "✨"}
            </span>
          </div>

          <div className="absolute bottom-24 right-0 hidden w-72 rounded-2xl bg-white p-5 shadow-2xl group-hover:block">
            <p
              className="text-xs font-bold uppercase tracking-[0.2em]"
              style={{ color: profile.theme.secondary }}
            >
              {profile.theme.delightLabel || "Local vibe unlocked"}
            </p>

            <p className="mt-2 text-sm font-medium text-[#071A4A]">
              {profile.theme.delightMessage ||
                "A personalized pick is waiting for you."}
            </p>
          </div>
        </div>
      </motion.div>
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative z-10 px-6 pb-20 pt-6"
      >
        <div className="mx-auto max-w-4xl overflow-hidden rounded-4xl border border-white/20 bg-white/70 p-8 text-center shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl md:p-12">
          <motion.div
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              repeat: Infinity,
              duration: 8,
              ease: "linear",
            }}
            className="absolute inset-0 opacity-20"
            style={{
              background: `linear-gradient(
          120deg,
          ${profile.theme.primary},
          ${profile.theme.secondary},
          #ffffff,
          ${profile.theme.primary}
        )`,
              backgroundSize: "300% 300%",
            }}
          />

          <div className="relative z-10">
            <p className="text-sm font-black uppercase tracking-[0.35em] text-slate-500">
              BridgeAZ
            </p>

            <h3
              className="mt-4 text-3xl font-black leading-tight md:text-5xl"
              style={{
                color: profile.theme.primary,
              }}
            >
              Open Today’s Local Pulse
            </h3>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              Discover stories, events, local updates, and moments happening
              around your community.
            </p>

            <motion.a
              href="https://bridgeaz.co/"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{
                scale: 1.04,
                y: -2,
              }}
              whileTap={{
                scale: 0.98,
              }}
              className="relative mt-8 inline-flex overflow-hidden rounded-full px-8 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-2xl"
              style={{
                background: `linear-gradient(
            135deg,
            ${profile.theme.primary},
            ${profile.theme.secondary}
          )`,
              }}
            >
              <span className="relative z-10 flex items-center gap-3">
                Explore BridgeAZ →
                <motion.span
                  animate={{
                    x: [0, 4, 0],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                  }}
                >
                  →
                </motion.span>
              </span>

              <motion.div
                animate={{
                  x: ["-120%", "120%"],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 3,
                  ease: "linear",
                }}
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)",
                }}
              />
            </motion.a>
          </div>
        </div>
      </motion.section>
      {/* footer */}
      <footer className="relative z-10 bg-[#071A4A] px-6 py-10 text-center text-white">
        <h3 className="text-2xl font-semibold">BridgeAZ</h3>

        <p className="mt-2 text-sm text-white/70">
          Personalized recommendations powered by your interests.
        </p>
      </footer>
    </main>
  );
}
