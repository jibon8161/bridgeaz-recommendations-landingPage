// import { formatInTimeZone } from "date-fns-tz";
import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import FloatingScene from "./components/FloatingScene";
import InterestManager from "./components/InterestManager";
import LocalDirectory from "./components/LocalDirectory";
import ProfileEditor from "./components/ProfileEditor";
import { BridgeMessages } from "./components/ProfileView";
import BridgeQuestionCard from "./components/BridgeQuestionCard";
import PublicProfileView from "./components/PublicProfileView";
// import { Swiper, SwiperSlide } from "swiper/react";
// import { Navigation as SwiperNavigation, Pagination } from "swiper/modules";

// import "swiper/css";
// import "swiper/css/navigation";
// import "swiper/css/pagination";
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

    heroBadge:
      data?.recommendations?.heroBadge ||
      data?.heroBadge ||
      "Personalized For You",

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

function CustomRecommendationCarousel({ items, theme }) {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const getGap = () => {
    return window.innerWidth < 768 ? 16 : 28;
  };

  const scrollCarousel = (direction) => {
    if (!scrollRef.current) return;

    const container = scrollRef.current;
    const card = container.querySelector("[data-carousel-card]");
    const cardWidth = card?.offsetWidth || 360;
    const gap = getGap();

    container.scrollBy({
      left: direction === "next" ? cardWidth + gap : -(cardWidth + gap),
      behavior: "smooth",
    });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;

    const container = scrollRef.current;
    const card = container.querySelector("[data-carousel-card]");
    if (!card) return;

    const cardWidth = card.offsetWidth;
    const gap = getGap();
    const index = Math.round(container.scrollLeft / (cardWidth + gap));

    setActiveIndex(index);
  };

  const scrollToItem = (index) => {
    if (!scrollRef.current) return;

    const container = scrollRef.current;
    const card = container.querySelector("[data-carousel-card]");
    if (!card) return;

    const cardWidth = card.offsetWidth;
    const gap = getGap();

    container.scrollTo({
      left: index * (cardWidth + gap),
      behavior: "smooth",
    });
  };

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-0 md:left-auto md:w-full md:translate-x-0">
      {/* desktop arrows */}
      <button
        type="button"
        onClick={() => scrollCarousel("prev")}
        className="absolute -left-12.5 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl font-bold text-[#071A4A] shadow-[0_12px_30px_rgba(7,26,74,0.16)] ring-1 ring-slate-200 transition hover:-translate-x-1 hover:shadow-[0_18px_42px_rgba(7,26,74,0.22)] md:flex"
        aria-label="Previous recommendations"
      >
        ‹
      </button>

      <button
        type="button"
        onClick={() => scrollCarousel("next")}
        className="absolute -right-12.5 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl font-bold text-[#071A4A] shadow-[0_12px_30px_rgba(7,26,74,0.16)] ring-1 ring-slate-200 transition hover:translate-x-1 hover:shadow-[0_18px_42px_rgba(7,26,74,0.22)] md:flex"
        aria-label="Next recommendations"
      >
        ›
      </button>

      <div className="mx-auto w-[calc(100vw-86px)] overflow-hidden md:w-full md:overflow-visible">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 md:gap-7 md:pb-8 [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, index) => (
            <div
              key={index}
              data-carousel-card
              className="w-full min-w-full max-w-full shrink-0 snap-start md:w-[calc((100%-28px)/2)] md:min-w-[calc((100%-28px)/2)] md:max-w-[calc((100%-28px)/2)] xl:w-[calc((100%-56px)/3)] xl:min-w-[calc((100%-56px)/3)] xl:max-w-[calc((100%-56px)/3)]"
            >
              <RecommendationCard item={item} theme={theme} index={index} />
            </div>
          ))}
        </div>
      </div>

      {/* dots */}
      <div className="relative z-20 mt-3 flex justify-center">
        <div className="flex items-center justify-center gap-2 rounded-full bg-white/80 px-3 py-2 shadow-[0_10px_28px_rgba(7,26,74,0.12)] backdrop-blur-md ring-1 ring-white/70">
          {items.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => scrollToItem(index)}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: activeIndex === index ? "26px" : "8px",
                background:
                  activeIndex === index
                    ? `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`
                    : "#94A3B8",
              }}
              aria-label={`Go to recommendation ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ item, theme, index }) {
  const hasImage = Boolean(item?.imageUrl);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="h-full"
    >
      <div className="group relative flex h-full min-h-113.75 w-full cursor-pointer flex-col overflow-hidden rounded-[30px]  bg-white/92 p-2 shadow-[0_18px_50px_rgba(7,26,74,0.12)] ring-1 ring-white/80 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_80px_rgba(7,26,74,0.20)]">
        {/* soft premium glow */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-20 blur-3xl transition duration-500 group-hover:opacity-45"
          style={{ backgroundColor: theme.secondary }}
        />

        <div
          className="pointer-events-none absolute -left-20 bottom-10 h-44 w-44 rounded-full opacity-10 blur-3xl transition duration-500 group-hover:opacity-25"
          style={{ backgroundColor: theme.primary }}
        />

        {/* image */}
        <div className="relative h-56 overflow-hidden rounded-[22px] bg-slate-100 shadow-[0_14px_35px_rgba(7,26,74,0.12)]">
          {hasImage ? (
            <img
              src={item.imageUrl}
              alt={item?.title || "Recommendation image"}
              className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
              }}
            />
          )}

          <div className="absolute inset-0 bg-linear-to-t from-[#071A4A]/78 via-[#071A4A]/12 to-transparent" />

          {/* shine sweep */}
          <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-18deg] bg-white/30 opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100" />

          {/* type badge */}
          <div className="absolute left-4 top-4 flex flex-col items-start gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/95 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#071A4A] shadow-[0_12px_28px_rgba(7,26,74,0.16)] backdrop-blur-md">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: theme.secondary }}
              />
              {item?.type || "Local Pick"}
            </span>

            {item?.isFollowedSubmission && item?.followedMemberName && (
              <span className="rounded-full border border-white/40 bg-[#071A4A]/90 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg backdrop-blur-md">
                From {item.followedMemberName}
              </span>
            )}
          </div>

          {/* date */}
          {item?.date && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/45 bg-white/95 px-3.5 py-1.5 text-xs font-bold text-[#071A4A] shadow-[0_12px_28px_rgba(7,26,74,0.16)] backdrop-blur-xl">
                <span>📅</span>
                <span className="truncate">{item.date}</span>
              </div>
            </div>
          )}
        </div>

        {/* content */}
        <div className="relative z-10 flex flex-1 flex-col px-4 pb-4 pt-5">
          <h3 className="line-clamp-2 text-[24px] font-black leading-[1.05] tracking-[-0.04em] text-[#071A4A]">
            {item?.title}
          </h3>

          <div
            className="mt-3 h-1 w-12 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
              boxShadow: `0 0 18px ${theme.secondary}66`,
            }}
          />

          {item?.details && (
            <p className="mt-4 line-clamp-3 text-[14px] font-medium leading-6 text-slate-600">
              {item.details}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {item?.location && (
              <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-[0_8px_20px_rgba(7,26,74,0.06)] ring-1 ring-slate-200/80">
                <span>📍</span>
                <span className="truncate">{item.location}</span>
              </div>
            )}

            {item?.submissionType && (
              <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-[0_8px_20px_rgba(7,26,74,0.06)] ring-1 ring-slate-200/80">
                <span>🏷️</span>
                <span className="truncate">{item.submissionType}</span>
              </div>
            )}
          </div>

          <div className="mt-auto pt-6">
            {item?.link ? (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="group/btn relative inline-flex w-full items-center justify-between overflow-hidden rounded-2xl px-4 py-3.5 text-sm font-black text-white shadow-[0_14px_34px_rgba(7,26,74,0.18)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_18px_44px_rgba(7,26,74,0.24)]"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                }}
              >
                <span className="absolute inset-0 bg-white/0 transition duration-300 group-hover/btn:bg-white/12" />

                <span className="relative z-10">View Details</span>

                <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition duration-300 group-hover/btn:translate-x-1">
                  →
                </span>
              </a>
            ) : (
              <div className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-50 px-4 py-3.5 text-sm font-black text-slate-500 ring-1 ring-slate-200">
                Details Coming Soon
              </div>
            )}
          </div>
        </div>

        {/* elegant bottom accent */}
        <div
          className="absolute bottom-0 left-10 right-10 h-0.75 rounded-full opacity-80"
          style={{
            background: `linear-gradient(90deg, transparent, ${theme.primary}, ${theme.secondary}, transparent)`,
          }}
        />
      </div>
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

function PeopleRecommendationActions({
  person,
  viewerToken,
  theme,
  connectionRecordId,
  onRecommendationHidden,
}) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followSubmitting, setFollowSubmitting] = useState(false);
  const [followError, setFollowError] = useState("");
  const [showFollowOptions, setShowFollowOptions] = useState(false);

  const [selectedFollowContentTypes, setSelectedFollowContentTypes] = useState([
    "Everything",
  ]);

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectionReason, setConnectionReason] = useState("Ask a question");
  const [connectionMessage, setConnectionMessage] = useState("");
  const [connectionSubmitting, setConnectionSubmitting] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [connectionSent, setConnectionSent] = useState(false);
  const [connectionAlreadyExists, setConnectionAlreadyExists] = useState(false);

  const [
    recommendationInterestSubmitting,
    setRecommendationInterestSubmitting,
  ] = useState(false);

  const [recommendationInterested, setRecommendationInterested] =
    useState(false);

  const [recommendationInterestError, setRecommendationInterestError] =
    useState("");

  const memberRecordId = person?.profileMemberId || "";

  const name =
    person?.fullName ||
    [person?.firstName, person?.lastName].filter(Boolean).join(" ") ||
    "Bridge Member";

  useEffect(() => {
    if (!viewerToken || !memberRecordId) {
      return;
    }

    let active = true;

    async function loadFollowStatus() {
      try {
        const response = await fetch(
          "https://bridgeaz-recommendations-server.vercel.app/api/profile/follow-status",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              followerToken: viewerToken,
              followingMemberRecordId: memberRecordId,
            }),
          },
        );

        const result = await response.json();

        if (!active) {
          return;
        }

        if (response.ok && result?.success === true) {
          setIsFollowing(result.following === true);
        }
      } catch (error) {
        console.error("People recommendation follow status error:", error);
      }
    }

    loadFollowStatus();

    return () => {
      active = false;
    };
  }, [viewerToken, memberRecordId]);

  function toggleFollowContentType(type) {
    if (type === "Everything") {
      setSelectedFollowContentTypes(["Everything"]);
      return;
    }

    setSelectedFollowContentTypes((current) => {
      const withoutEverything = current.filter((item) => item !== "Everything");

      const alreadySelected = withoutEverything.includes(type);

      const next = alreadySelected
        ? withoutEverything.filter((item) => item !== type)
        : [...withoutEverything, type];

      return next.length > 0 ? next : ["Everything"];
    });
  }

  async function handleFollow() {
    if (!viewerToken || !memberRecordId || followSubmitting) {
      return;
    }

    try {
      setFollowSubmitting(true);
      setFollowError("");

      const response = await fetch(
        "https://bridgeaz-recommendations-server.vercel.app/api/profile/follow",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            followerToken: viewerToken,
            followingMemberRecordId: memberRecordId,
            followContentType: selectedFollowContentTypes,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || result?.success !== true) {
        throw new Error(result?.error || "Could not follow this member.");
      }

      setIsFollowing(true);
      setShowFollowOptions(false);
    } catch (error) {
      console.error("People recommendation follow error:", error);

      setFollowError(error?.message || "Could not follow this member.");
    } finally {
      setFollowSubmitting(false);
    }
  }

  async function handleUnfollow() {
    if (!viewerToken || !memberRecordId || followSubmitting) {
      return;
    }

    try {
      setFollowSubmitting(true);
      setFollowError("");

      const response = await fetch(
        "https://bridgeaz-recommendations-server.vercel.app/api/profile/unfollow",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            followerToken: viewerToken,
            followingMemberRecordId: memberRecordId,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || result?.success !== true) {
        throw new Error(result?.error || "Could not unfollow this member.");
      }

      setIsFollowing(false);
      setShowFollowOptions(false);
      setSelectedFollowContentTypes(["Everything"]);
    } catch (error) {
      console.error("People recommendation unfollow error:", error);

      setFollowError(error?.message || "Could not unfollow this member.");
    } finally {
      setFollowSubmitting(false);
    }
  }

  async function handleRecommendationInterest() {
    if (
      !viewerToken ||
      !connectionRecordId ||
      recommendationInterestSubmitting
    ) {
      return;
    }

    try {
      setRecommendationInterestSubmitting(true);
      setRecommendationInterestError("");

      const response = await fetch(
        "https://bridgeaz-recommendations-server.vercel.app/api/profile/people-recommendation/interested",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            viewerToken,
            connectionRecordId,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || result?.success !== true) {
        throw new Error(result?.error || "Could not save your interest.");
      }

      setRecommendationInterested(true);
    } catch (error) {
      console.error("PEOPLE RECOMMENDATION INTEREST ERROR:", error);

      setRecommendationInterestError(
        error?.message || "Could not save your interest.",
      );
    } finally {
      setRecommendationInterestSubmitting(false);
    }
  }

  async function handleHideRecommendation() {
    if (!connectionRecordId || !viewerToken) return;

    try {
      const response = await fetch(
        "https://bridgeaz-recommendations-server.vercel.app/api/profile/people-recommendation/hide",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            viewerToken,
            connectionRecordId,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || result?.success !== true) {
        throw new Error(result?.error || "Could not hide recommendation.");
      }

      onRecommendationHidden?.();
    } catch (error) {
      console.error("HIDE RECOMMENDATION ERROR:", error);
    }
  }

  async function handleConnectSubmit(event) {
    event.preventDefault();

    const cleanMessage = connectionMessage.trim();

    if (
      !viewerToken ||
      !memberRecordId ||
      !connectionReason ||
      !cleanMessage ||
      connectionSubmitting
    ) {
      return;
    }

    try {
      setConnectionSubmitting(true);
      setConnectionError("");
      setConnectionSent(false);
      setConnectionAlreadyExists(false);

      const response = await fetch(
        "https://bridgeaz-recommendations-server.vercel.app/api/profile/connect/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requesterToken: viewerToken,
            targetMemberRecordId: memberRecordId,
            connectionReason,
            message: cleanMessage,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || result?.success !== true) {
        throw new Error(
          result?.error || "Could not send your connection message.",
        );
      }

      if (result?.existingConnection === true) {
        setConnectionAlreadyExists(true);
        return;
      }

      setConnectionMessage("");
      setConnectionSent(true);
    } catch (error) {
      console.error("People recommendation connect error:", error);

      setConnectionError(
        error?.message || "Could not send your connection message.",
      );
    } finally {
      setConnectionSubmitting(false);
    }
  }
  console.log("HIDE BUTTON DEBUG:", {
    viewerToken,
    connectionRecordId,
  });
  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleRecommendationInterest}
          disabled={
            !viewerToken ||
            !connectionRecordId ||
            recommendationInterestSubmitting ||
            recommendationInterested
          }
          className="col-span-2 inline-flex h-11 cursor-pointer items-center justify-center rounded-full px-4 text-xs font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-default disabled:opacity-70"
          style={{
            background: recommendationInterested
              ? "#059669"
              : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
          }}
        >
          {recommendationInterestSubmitting
            ? "Saving..."
            : recommendationInterested
              ? "✓ I'm Interested"
              : "I'm Interested"}
        </button>
        <button
          type="button"
          onClick={handleHideRecommendation}
          disabled={!viewerToken || !connectionRecordId}
          className="col-span-2 inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-black text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
        >
          Not for Me / Hide
        </button>
        <button
          type="button"
          disabled={followSubmitting || !viewerToken || !memberRecordId}
          onClick={() => {
            if (isFollowing) {
              handleUnfollow();
            } else {
              setShowFollowOptions((current) => !current);
            }
          }}
          className="inline-flex h-11 items-center justify-center rounded-full border px-4 text-xs font-black transition disabled:opacity-50"
          style={{
            color: isFollowing ? "#047857" : theme.primary,
            borderColor: isFollowing ? "#A7F3D0" : `${theme.primary}33`,
            backgroundColor: isFollowing ? "#ECFDF5" : "#FFFFFF",
          }}
        >
          {followSubmitting
            ? "Updating..."
            : isFollowing
              ? "Unfollow"
              : "+ Follow"}
        </button>
      </div>

      {showFollowOptions &&
        !isFollowing &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[30000] flex items-center justify-center bg-[#071A4A]/70 p-4 backdrop-blur-md"
            onClick={() => {
              if (!followSubmitting) {
                setShowFollowOptions(false);
              }
            }}
          >
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.94,
                y: 20,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              transition={{
                duration: 0.22,
              }}
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-lg overflow-hidden rounded-[30px] bg-white shadow-[0_35px_120px_rgba(7,26,74,0.35)]"
            >
              {/* top accent */}
              <div
                className="h-1.5 w-full"
                style={{
                  background: `linear-gradient(
              90deg,
              ${theme.primary},
              ${theme.secondary}
            )`,
                }}
              />

              <div className="p-6 md:p-8">
                {/* header */}
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p
                      className="text-[10px] font-black uppercase tracking-[0.2em]"
                      style={{
                        color: theme.secondary,
                      }}
                    >
                      Follow {name}
                    </p>

                    <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#071A4A]">
                      What would you like to follow?
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Choose the types of updates you want Bridge to show you
                      from this member.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={followSubmitting}
                    onClick={() => setShowFollowOptions(false)}
                    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-xl font-black text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>

                {/* options */}
                <div className="mt-7 flex flex-wrap gap-3">
                  {[
                    "Everything",
                    "Events",
                    "Articles",
                    "Resources",
                    "Classes / Workshops",
                    "Books",
                    "Community Activity",
                  ].map((type) => {
                    const selected = selectedFollowContentTypes.includes(type);

                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={followSubmitting}
                        onClick={() => toggleFollowContentType(type)}
                        className="cursor-pointer rounded-full border px-4 py-3 text-xs font-black transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{
                          color: selected ? "#FFFFFF" : theme.primary,

                          background: selected
                            ? `linear-gradient(
                          135deg,
                          ${theme.primary},
                          ${theme.secondary}
                        )`
                            : "#FFFFFF",

                          borderColor: selected ? theme.secondary : "#E2E8F0",

                          boxShadow: selected
                            ? `0 8px 24px ${theme.secondary}30`
                            : "none",
                        }}
                      >
                        {selected ? "✓ " : ""}
                        {type}
                      </button>
                    );
                  })}
                </div>

                {/* selected summary */}
                <div className="mt-7 rounded-[20px] bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Following
                  </p>

                  <p className="mt-2 text-sm font-bold text-[#071A4A]">
                    {selectedFollowContentTypes.join(", ")}
                  </p>
                </div>

                {followError && (
                  <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
                    {followError}
                  </p>
                )}

                {/* footer buttons */}
                <div className="mt-7 flex gap-3">
                  <button
                    type="button"
                    disabled={followSubmitting}
                    onClick={() => setShowFollowOptions(false)}
                    className="flex-1 cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleFollow}
                    disabled={followSubmitting}
                    className="flex-1 cursor-pointer rounded-2xl px-5 py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      background: `linear-gradient(
                  135deg,
                  ${theme.primary},
                  ${theme.secondary}
                )`,
                    }}
                  >
                    {followSubmitting ? "Following..." : "Confirm Follow"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}

      {followError && (
        <p className="mt-2 text-xs font-bold text-rose-600">{followError}</p>
      )}
      {recommendationInterestError && (
        <p className="mt-2 text-xs font-bold text-rose-600">
          {recommendationInterestError}
        </p>
      )}
      {showConnectModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[20000] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
            onClick={() => {
              if (!connectionSubmitting) {
                setShowConnectModal(false);
              }
            }}
          >
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.95,
                y: 20,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              onClick={(event) => event.stopPropagation()}
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[30px] bg-white shadow-[0_35px_120px_rgba(15,23,42,.30)]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
                <div>
                  <p
                    className="text-[9px] font-black uppercase tracking-[0.18em]"
                    style={{
                      color: theme.secondary,
                    }}
                  >
                    Bridge Connect
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-[#071A4A]">
                    Connect with {name}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Tell {name} why you'd like to connect.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={connectionSubmitting}
                  onClick={() => setShowConnectModal(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-black text-slate-500"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleConnectSubmit} className="p-6">
                {connectionAlreadyExists ? (
                  <div className="rounded-[22px] border border-blue-100 bg-blue-50 p-5">
                    <p className="font-black text-blue-900">
                      Conversation already open
                    </p>

                    <p className="mt-2 text-sm leading-6 text-blue-700">
                      You already have an active Bridge conversation with {name}
                      .
                    </p>
                  </div>
                ) : (
                  <>
                    {connectionSent && (
                      <div className="mb-5 rounded-[20px] bg-emerald-50 px-4 py-4 text-sm font-black text-emerald-700">
                        ✓ Connection message sent
                      </div>
                    )}

                    <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Why are you connecting?
                    </label>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        "Ask a question",
                        "Learn about their services",
                        "Invite them to speak",
                        "Collaborate",
                        "Request a meeting",
                        "Discuss a resource",
                        "Invite them to an event",
                        "Explore another opportunity",
                      ].map((reason) => {
                        const selected = connectionReason === reason;

                        return (
                          <button
                            key={reason}
                            type="button"
                            disabled={connectionSubmitting}
                            onClick={() => setConnectionReason(reason)}
                            className="rounded-full border px-4 py-2.5 text-xs font-black"
                            style={{
                              color: selected ? "#FFFFFF" : theme.primary,
                              backgroundColor: selected
                                ? theme.primary
                                : "#FFFFFF",
                              borderColor: selected ? theme.primary : "#E2E8F0",
                            }}
                          >
                            {selected ? "✓ " : ""}
                            {reason}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-6">
                      <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                        Your message
                      </label>

                      <textarea
                        value={connectionMessage}
                        onChange={(event) =>
                          setConnectionMessage(event.target.value)
                        }
                        rows={5}
                        maxLength={4000}
                        disabled={connectionSubmitting}
                        placeholder={`Write a message to ${name}...`}
                        className="mt-3 w-full resize-y rounded-[22px] border border-slate-200 bg-slate-50/60 px-5 py-4 text-sm leading-7 text-slate-700 outline-none"
                      />

                      <p className="mt-2 text-[10px] text-slate-400">
                        {connectionMessage.length}/4000
                      </p>
                    </div>

                    {connectionError && (
                      <div className="mt-4 rounded-[18px] bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                        {connectionError}
                      </div>
                    )}

                    <div className="mt-6 flex justify-end">
                      <button
                        type="submit"
                        disabled={
                          connectionSubmitting ||
                          !connectionMessage.trim() ||
                          !connectionReason
                        }
                        className="rounded-full px-7 py-3.5 text-sm font-black text-white shadow-lg disabled:opacity-50"
                        style={{
                          background: `linear-gradient(
                            135deg,
                            ${theme.primary},
                            ${theme.secondary}
                          )`,
                        }}
                      >
                        {connectionSubmitting
                          ? "Sending..."
                          : "Send Connection Message"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </motion.div>
          </div>,
          document.body,
        )}
    </>
  );
}
export default function PersonalizedRecommendationsPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [accessChecked, setAccessChecked] = useState(false);
  const [accessAllowed, setAccessAllowed] = useState(false);

  const autoProfileProcessStartedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);
  const [recommendationReloadKey, setRecommendationReloadKey] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [showAllFuture, setShowAllFuture] = useState(true);
  const [daysFilter, setDaysFilter] = useState(14);
  const [activeSection, setActiveSection] = useState("events");
  const [communityFilter, setCommunityFilter] = useState("all");
  const [friendEmail, setFriendEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);
  const [unreadConnectionCount, setUnreadConnectionCount] = useState(0);
  const [peopleRecommendations, setPeopleRecommendations] = useState([]);
  const [selectedPublicProfile, setSelectedPublicProfile] = useState(null);
  const [openPeopleBookId, setOpenPeopleBookId] = useState("");
  const [peopleRecommendationsLoading, setPeopleRecommendationsLoading] =
    useState(true);

  const [peopleConnectionInvitations, setPeopleConnectionInvitations] =
    useState([]);

  const [
    peopleConnectionInvitationsLoading,
    setPeopleConnectionInvitationsLoading,
  ] = useState(true);

  const [mutualPeopleConnections, setMutualPeopleConnections] = useState([]);

  const [mutualPeopleConnectionsLoading, setMutualPeopleConnectionsLoading] =
    useState(true);

  const [
    peopleConnectionInvitationSubmittingId,
    setPeopleConnectionInvitationSubmittingId,
  ] = useState("");

  const [peopleConnectionInvitationError, setPeopleConnectionInvitationError] =
    useState("");

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;

      if (!firebaseUser) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const idToken = await firebaseUser.getIdToken();

        const response = await fetch(
          `https://bridgeaz-recommendations-server.vercel.app/api/auth/my-bridge-access/${encodeURIComponent(
            token,
          )}`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          },
        );

        const data = await response.json();

        console.log("MY BRIDGE ACCESS:", data);

        if (!active) return;

        if (response.ok && data.allowed === true) {
          setAccessAllowed(true);
          setAccessChecked(true);
        } else {
          setAccessAllowed(false);
          setAccessChecked(true);
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error("My Bridge access check failed:", error);

        if (active) {
          setAccessAllowed(false);
          setAccessChecked(true);
          navigate("/", { replace: true });
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [token, navigate]);

  useEffect(() => {
    if (!accessAllowed) return;
    let active = true;

    async function fetchRecommendations() {
      try {
        setLoading(true);

        const cacheKey = `recommendations-${token}`;
        const cached = sessionStorage.getItem(cacheKey);

        if (cached) {
          setRawData(JSON.parse(cached));
        }

        const response = await fetch(`${API_BASE}/${token}`);
        const text = await response.text();

        if (!active) return;

        if (text.trim() === "Accepted") {
          console.warn("Make returned Accepted. Keeping existing data.");
          return;
        }

        const result = JSON.parse(text);
        console.log("RECOMMENDATION API RESULT:", result);
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
  }, [token, accessAllowed, recommendationReloadKey]);

  useEffect(() => {
    if (!accessAllowed || !token) return;

    let active = true;

    async function fetchPeopleConnectionInvitations() {
      try {
        setPeopleConnectionInvitationsLoading(true);

        const response = await fetch(
          `https://bridgeaz-recommendations-server.vercel.app/api/profile/${encodeURIComponent(
            token,
          )}/people-connection-invitations`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result = await response.json();

        if (!active) return;

        if (!response.ok || result?.success !== true) {
          throw new Error(
            result?.error || "Could not load connection invitations.",
          );
        }

        const invitations = Array.isArray(result?.invitations)
          ? result.invitations
          : [];

        setPeopleConnectionInvitations(invitations);

        console.log("PEOPLE CONNECTION INVITATIONS:", invitations);
      } catch (error) {
        console.error("PEOPLE CONNECTION INVITATIONS ERROR:", error);

        if (active) {
          setPeopleConnectionInvitations([]);
        }
      } finally {
        if (active) {
          setPeopleConnectionInvitationsLoading(false);
        }
      }
    }

    fetchPeopleConnectionInvitations();

    return () => {
      active = false;
    };
  }, [token, accessAllowed]);

  useEffect(() => {
    if (!accessAllowed || !token) return;

    let active = true;

    async function fetchMutualPeopleConnections() {
      try {
        setMutualPeopleConnectionsLoading(true);

        const response = await fetch(
          `https://bridgeaz-recommendations-server.vercel.app/api/profile/${encodeURIComponent(
            token,
          )}/mutual-people-connections`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result = await response.json();

        if (!active) return;

        if (!response.ok || result?.success !== true) {
          throw new Error(
            result?.error || "Could not load mutual connections.",
          );
        }

        const connections = Array.isArray(result?.connections)
          ? result.connections
          : [];

        setMutualPeopleConnections(connections);

        console.log("MUTUAL PEOPLE CONNECTIONS:", connections);
      } catch (error) {
        console.error("MUTUAL PEOPLE CONNECTIONS ERROR:", error);

        if (active) {
          setMutualPeopleConnections([]);
        }
      } finally {
        if (active) {
          setMutualPeopleConnectionsLoading(false);
        }
      }
    }

    fetchMutualPeopleConnections();

    return () => {
      active = false;
    };
  }, [token, accessAllowed]);

  async function handlePeopleInvitationInterest(connectionRecordId) {
    if (!token) {
      return;
    }

    if (!connectionRecordId || peopleConnectionInvitationSubmittingId) {
      return;
    }

    try {
      setPeopleConnectionInvitationSubmittingId(connectionRecordId);

      setPeopleConnectionInvitationError("");

      const response = await fetch(
        "https://bridgeaz-recommendations-server.vercel.app/api/profile/people-connection-invitation/interested",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            viewerToken: token,
            connectionRecordId,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || result?.success !== true) {
        throw new Error(
          result?.error || "Could not accept this connection invitation.",
        );
      }

      setPeopleConnectionInvitations((current) =>
        current.filter(
          (invitation) => invitation.connectionRecordId !== connectionRecordId,
        ),
      );
    } catch (error) {
      console.error("PEOPLE CONNECTION INVITATION INTEREST ERROR:", error);

      setPeopleConnectionInvitationError(
        error?.message || "Could not accept this connection invitation.",
      );
    } finally {
      setPeopleConnectionInvitationSubmittingId("");
    }
  }

  async function handlePeopleInvitationDecline(connectionRecordId) {
    if (!token) {
      return;
    }

    if (!connectionRecordId || peopleConnectionInvitationSubmittingId) {
      return;
    }

    try {
      setPeopleConnectionInvitationSubmittingId(connectionRecordId);

      setPeopleConnectionInvitationError("");

      const response = await fetch(
        "https://bridgeaz-recommendations-server.vercel.app/api/profile/people-connection-invitation/decline",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            viewerToken: token,
            connectionRecordId,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || result?.success !== true) {
        throw new Error(
          result?.error || "Could not decline this connection invitation.",
        );
      }

      setPeopleConnectionInvitations((current) =>
        current.filter(
          (invitation) => invitation.connectionRecordId !== connectionRecordId,
        ),
      );
    } catch (error) {
      console.error("PEOPLE CONNECTION INVITATION DECLINE ERROR:", error);

      setPeopleConnectionInvitationError(
        error?.message || "Could not decline this connection invitation.",
      );
    } finally {
      setPeopleConnectionInvitationSubmittingId("");
    }
  }

  useEffect(() => {
    if (!accessAllowed || !token) return;

    let active = true;

    async function fetchPeopleRecommendations() {
      try {
        setPeopleRecommendationsLoading(true);

        const response = await fetch(
          `https://bridgeaz-recommendations-server.vercel.app/api/profile/${encodeURIComponent(
            token,
          )}/people-recommendations`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result = await response.json();

        if (!active) return;

        if (!response.ok || result?.success !== true) {
          throw new Error(
            result?.error || "Could not load people recommendations.",
          );
        }

        const allPeopleRecommendations = Array.isArray(result?.recommendations)
          ? result.recommendations
          : [];

        /*
  Show only the latest generated Make batch.

  Recommendations created by the same Make run should be
  created only a few seconds apart.
*/
        const datedRecommendations = allPeopleRecommendations
          .map((recommendation) => ({
            recommendation,
            createdTime: new Date(recommendation?.createdAt || "").getTime(),
          }))
          .filter(
            (item) => Number.isFinite(item.createdTime) && item.createdTime > 0,
          )
          .sort((a, b) => b.createdTime - a.createdTime);

        let latestBatch = [];

        if (datedRecommendations.length > 0) {
          latestBatch.push(datedRecommendations[0]);

          const SAME_BATCH_GAP_MS = 10000; // 10 seconds

          for (let index = 1; index < datedRecommendations.length; index += 1) {
            const previousItem = latestBatch[latestBatch.length - 1];
            const currentItem = datedRecommendations[index];

            const timeGap = previousItem.createdTime - currentItem.createdTime;

            if (timeGap > SAME_BATCH_GAP_MS) {
              break;
            }

            latestBatch.push(currentItem);
          }
        }

        const latestPeopleRecommendations =
          latestBatch.length > 0
            ? latestBatch
                .map((item) => item.recommendation)
                .sort(
                  (a, b) =>
                    Number(b?.matchScore || 0) - Number(a?.matchScore || 0),
                )
            : allPeopleRecommendations;

        setPeopleRecommendations(latestPeopleRecommendations);

        console.log(
          "LATEST PEOPLE RECOMMENDATION BATCH:",
          latestPeopleRecommendations,
        );
      } catch (error) {
        console.error("PEOPLE RECOMMENDATIONS ERROR:", error);

        if (active) {
          setPeopleRecommendations([]);
        }
      } finally {
        if (active) {
          setPeopleRecommendationsLoading(false);
        }
      }
    }

    fetchPeopleRecommendations();

    return () => {
      active = false;
    };
  }, [token, accessAllowed, recommendationReloadKey]);

  useEffect(() => {
    if (autoProfileProcessStartedRef.current || !token || !rawData) {
      return;
    }

    async function autoTriggerProfileUpdate() {
      try {
        // Check submissions first
        const contributionResponse = await fetch(
          `https://bridgeaz-recommendations-server.vercel.app/api/profile/${encodeURIComponent(
            token,
          )}/contributions`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const contributionResult = await contributionResponse.json();

        if (!contributionResponse.ok) {
          throw new Error(
            contributionResult?.error || "Could not check submissions.",
          );
        }

        const realSubmissions = Array.isArray(contributionResult?.contributions)
          ? contributionResult.contributions.filter((item) =>
              Boolean(item?.recordId),
            )
          : [];

        console.log(
          "REAL SUBMISSIONS FOUND:",
          realSubmissions.length,
          realSubmissions,
        );

        // No real Airtable submission = stop here
        if (realSubmissions.length === 0) {
          console.log("AUTO PROFILE UPDATE SKIPPED - NO SUBMISSIONS");
          return;
        }

        autoProfileProcessStartedRef.current = true;

        // Same working PATCH as Save Profile
        const response = await fetch(
          `https://bridgeaz-recommendations-server.vercel.app/api/profile/${encodeURIComponent(
            token,
          )}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              profileBio: rawData?.profileBio || "",
              profileStatus: rawData?.profileStatus || "",

              website: rawData?.website || "",
              expertise: rawData?.expertise || "",
              socialLinks: rawData?.socialLinks || "",
              additionalAffiliations: rawData?.additionalAffiliations || "",

              promoteMePersonally: rawData?.promoteMePersonally === true,

              promoteMyBusinessOrganization:
                rawData?.promoteMyBusinessOrganization === true,

              whatIWantBridgeToPromote: rawData?.whatIWantBridgeToPromote || "",

              openToOpportunities: rawData?.openToOpportunities === true,

              opportunityTypes: rawData?.opportunityTypes || "",

              showEmailInDirectory: rawData?.showEmailInDirectory === true,

              showPhoneInDirectory: rawData?.showPhoneInDirectory === true,

              showSocialLinksInDirectory:
                rawData?.showSocialLinksInDirectory === true,
            }),
          },
        );

        const result = await response.json();

        if (!response.ok || result?.success !== true) {
          throw new Error(
            result?.details ||
              result?.error ||
              "Automatic profile update failed.",
          );
        }

        console.log("PROFILE UPDATE WEBHOOK AUTO TRIGGERED");
      } catch (error) {
        console.error("AUTO PROFILE UPDATE ERROR:", error);

        autoProfileProcessStartedRef.current = false;
      }
    }

    void autoTriggerProfileUpdate();
  }, [token, rawData]);

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

  // loading && console.log("LOADING RECOMMENDATIONS...");

  if (!accessChecked || !accessAllowed || loading) {
    return <LoadingScreen />;
  }

  if (!profile) return <ErrorState />;

  const next14DaysItems = rawData?.recommendations?.next14DaysItems || [];

  const allFutureItems = rawData?.recommendations?.allFutureItems || [];

  const followedSubmissions = Array.isArray(rawData?.followedSubmissions)
    ? rawData.followedSubmissions
    : [];

  const followedCommunityItems = followedSubmissions.map((item) => ({
    type: "submission",
    title: item.title || "",
    details: item.summary || item.shortDescription || "",
    date: item.startDateTime
      ? new Date(item.startDateTime).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "",
    rawDate: item.startDateTime || "",
    location: item.eventLocation || "",
    link: item.link || "",
    imageUrl: "",
    submissionType: item.submissionType || "",
    followedMemberName: item.followedMemberName || "",
    isFollowedSubmission: true,
  }));

  const selectedBaseItems = showAllFuture ? allFutureItems : next14DaysItems;

  const todayBase = new Date();

  const getUTCDateOnly = (dateValue) => {
    const date = new Date(dateValue);
    return date.toISOString().slice(0, 10);
  };

  const todayUTC = getUTCDateOnly(todayBase);

  const endDate = new Date(todayBase);
  endDate.setDate(endDate.getDate() + daysFilter);

  const endUTC = getUTCDateOnly(endDate);

  const filteredItems = selectedBaseItems.filter((item) => {
    if (showAllFuture) return true;
    if (!item.rawDate) return false;

    const itemUTC = getUTCDateOnly(item.rawDate);

    return itemUTC >= todayUTC && itemUTC <= endUTC;
  });

  const selectedForYouItems = filteredItems.filter((item) => {
    return item.type?.toLowerCase().trim() === "event";
  });

  const communityBaseItems =
    activeSection === "hub" &&
    communityFilter !== "all" &&
    communityFilter !== "An activity, event, class, or opportunity"
      ? allFutureItems
      : filteredItems;

  const filteredFollowedCommunityItems = followedCommunityItems.filter(
    (item) => {
      if (showAllFuture) return true;
      if (!item.rawDate) return false;

      const itemUTC = getUTCDateOnly(item.rawDate);

      return itemUTC >= todayUTC && itemUTC <= endUTC;
    },
  );

  const followedCommunityBaseItems =
    activeSection === "hub" &&
    communityFilter !== "all" &&
    communityFilter !== "An activity, event, class, or opportunity"
      ? followedCommunityItems
      : filteredFollowedCommunityItems;

  const allCommunityItems = [
    ...communityBaseItems.filter((item) => {
      return item.type?.toLowerCase().trim() === "submission";
    }),
    ...followedCommunityBaseItems,
  ];

  const allFutureCommunityItems = [
    ...allFutureItems.filter((item) => {
      return item.type?.toLowerCase().trim() === "submission";
    }),
    ...followedCommunityItems,
  ];

  const communityCategories = [
    // "all",
    "An activity, event, class, or opportunity",
    "A resource, article, tip, or link",
    "A helpful Document, template, or guide",
  ];

  const communityHubItems = allCommunityItems.filter((item) => {
    if (communityFilter === "all") return true;

    return item.submissionType?.toLowerCase() === communityFilter.toLowerCase();
  });

  const activeItems =
    activeSection === "events" ? selectedForYouItems : communityHubItems;

  const shouldShowDateFilter =
    activeSection === "events" ||
    (activeSection === "hub" &&
      communityFilter === "An activity, event, class, or opportunity");

  async function handleInviteFriend(e) {
    e.preventDefault();

    if (!friendEmail.trim()) {
      setInviteStatus("Please enter your friend's email.");
      return;
    }

    try {
      setInviteStatus("Sending invite...");

      await fetch(
        "https://hook.us2.make.com/hepeeat81s8tjwooabgyapa5f4dynzlp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberEmail: rawData.email,
            friendEmail: friendEmail.trim(),
          }),
        },
      );

      setInviteStatus("Invite sent successfully!");
      setFriendEmail("");
    } catch {
      setInviteStatus("Something went wrong. Please try again.");
    }
  }

  // const introSteps = [
  //   "Reading your interests",
  //   "Matching local events",
  //   "Selecting resources",
  //   "Designing your personal theme",
  // ];

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{
        fontFamily: `${profile.theme.font || "Inter"}, sans-serif`,
        backgroundColor: profile.theme.background || "#F7F7F7",
        color: profile.theme.text || "#34495E",
      }}
    >
      <FloatingScene theme={profile.theme} />
      <BridgeMessages
        token={token}
        theme={profile.theme}
        showLauncher={false}
        externalOpen={showMessagesPanel}
        onExternalOpenChange={setShowMessagesPanel}
        onUnreadCountChange={setUnreadConnectionCount}
      />

      {showIntro && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-9999 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, #071A4A 0%, ${profile.theme.primary} 45%, ${profile.theme.secondary} 100%)`,
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.5, 0.25] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            className="absolute left-1/2 top-1/2 h-130 w-130 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 blur-3xl"
          />

          <div className="relative z-10 flex h-screen w-full flex-col items-center justify-center px-6 text-center text-white">
            <motion.img
              src="https://mcusercontent.com/2ead8cf9844eae73676cdedb6/images/5c553236-b34b-a985-35dd-24d9bba8f0a1.png"
              alt="BridgeAZ"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-10 w-40 brightness-0 invert md:w-56"
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.6, delay: 0.4 }}
              className="text-xs font-black uppercase tracking-[0.45em] text-white/70 md:text-sm"
            >
              Connecting to Bridge
            </motion.p>

            <div className="relative mt-10 h-24 w-full max-w-4xl overflow-hidden">
              {animatedNames.map((name, index) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, y: 45, scale: 0.96 }}
                  animate={{
                    opacity: index === 3 ? [0, 0, 1] : [0, 1, 0],
                    y: index === 3 ? [45, 24, 0] : [45, 0, -45],
                    scale: index === 3 ? [0.96, 0.98, 1] : [0.96, 1, 0.98],
                  }}
                  transition={{
                    delay: 1.8 + index * 1.1,
                    duration: index === 3 ? 1.8 : 1.1,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 flex items-center justify-center text-5xl font-black tracking-tight md:text-7xl"
                >
                  {name}
                </motion.div>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.8 }}
              className="mt-8 max-w-xl text-base font-medium text-white/80 md:text-lg"
            >
              Found your personalized local experience.
            </motion.p>

            <div className="mt-10 h-1 w-64 overflow-hidden rounded-full bg-white/20">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "120%" }}
                transition={{
                  repeat: Infinity,
                  duration: 2.4,
                  ease: "easeInOut",
                }}
                className="h-full w-1/2 rounded-full bg-white"
              />
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.75 }}
              transition={{ delay: 3 }}
              className="mt-6 text-xs font-bold uppercase tracking-[0.35em] text-white"
            >
              Entering your page
            </motion.p>
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
      {/* top bar */}
      <div
        className="relative z-10 px-4 py-2 text-white"
        style={{ backgroundColor: profile.theme.primary }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 text-sm">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex cursor-pointer items-center gap-2 rounded-full bg-white/15 px-4 py-2 font-black transition hover:bg-white/25"
          >
            <span>←</span>
            <span>Home</span>
          </button>

          <span className="hidden sm:block">Prescott, Arizona</span>

          <span>connect@bridgeaz.co</span>
        </div>
      </div>
      {/* logo */}
      <section className="relative z-10 px-6 py-6 md:py-8 text-center">
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
              <div className="mt-8 overflow-hidden">
                <motion.div
                  initial={{ opacity: 0, x: -60 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{
                    duration: 0.8,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-black uppercase tracking-[0.22em] text-slate-500"
                >
                  {(profile.theme.personalityChips || []).map((chip, index) => (
                    <span key={chip} className="inline-flex items-center gap-4">
                      <span>{chip}</span>
                      {index <
                        (profile.theme.personalityChips || []).length - 1 && (
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: profile.theme.secondary }}
                        />
                      )}
                    </span>
                  ))}
                </motion.div>
              </div>
              <div className="mt-10">
                <p
                  className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em]"
                  style={{
                    color: profile.theme.primary,
                    textShadow: `0 0 10px ${profile.theme.secondary}33`,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: profile.theme.secondary,
                      boxShadow: `0 0 12px ${profile.theme.secondary}`,
                    }}
                  />
                  Want better recommendations?
                </p>

                <button
                  type="button"
                  onClick={() => setShowInterestModal(true)}
                  className="group relative inline-block text-xl p-2"
                >
                  <span className="relative z-10 block overflow-hidden rounded-lg border-2 border-[#071A4A] px-5 py-3 font-medium leading-tight text-[#071A4A] transition-colors duration-300 ease-out group-hover:text-white">
                    <span className="absolute inset-0 h-full w-full rounded-lg bg-white"></span>

                    <span
                      className="absolute left-1/2 top-1/2 h-80 w-80 translate-x-[140%] -translate-y-1/2 -rotate-90 rounded-full transition-all duration-500 ease-out group-hover:-translate-x-1/2 group-hover:-rotate-180"
                      style={{
                        background: `linear-gradient(135deg, ${profile.theme.primary}, ${profile.theme.secondary})`,
                      }}
                    />

                    <span className="relative font-black">
                      Update Your Interests
                    </span>
                  </span>

                  <span
                    className="absolute bottom-0 right-0 h-12 w-full -mb-1 -mr-1 rounded-lg transition-all duration-200 ease-linear group-hover:mb-0 group-hover:mr-0"
                    style={{
                      background: profile.theme.primary,
                    }}
                  />
                </button>
              </div>
              {/* theme badge */}
              <div className="mt-10">
                <div className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: profile.theme.secondary }}
                  />
                  <span>{profile.themeName}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* profile editor */}
      <ProfileEditor
        initialData={rawData}
        theme={profile.theme}
        unreadConnectionCount={unreadConnectionCount}
        onOpenMessages={() => setShowMessagesPanel(true)}
      />

      <BridgeQuestionCard
        token={token}
        theme={profile?.theme}
        variant="bridge-pick"
        onAnswered={() => {
          setRecommendationReloadKey((prev) => prev + 1);
        }}
      />

      {/* Mutual People Connections */}
      {(mutualPeopleConnectionsLoading ||
        mutualPeopleConnections.length > 0) && (
        <section className="relative z-10 px-4 pb-8 md:px-6 md:pb-10">
          <div className="mx-auto w-full max-w-7xl px-4">
            <div className="mb-6">
              <p
                className="text-sm font-black uppercase tracking-[0.28em]"
                style={{
                  color: profile.theme.secondary,
                }}
              >
                Mutual Interest
              </p>

              <h2 className="mt-3 text-3xl font-black text-[#071A4A]">
                You Both Want to Connect
              </h2>

              <p className="mt-2 max-w-3xl text-slate-600">
                Great news — you both said you’re interested in connecting.
              </p>
            </div>

            {mutualPeopleConnectionsLoading ? (
              <div className="rounded-3xl bg-white/80 p-8 text-center shadow-lg">
                <p className="font-bold text-slate-500">
                  Loading mutual connections...
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {mutualPeopleConnections.map((connection) => {
                  const person = connection?.person || {};

                  const role = Array.isArray(person.role)
                    ? person.role.join(", ")
                    : person.role || "";

                  const subtitle = [role, person.businessOrganization]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <motion.div
                      key={connection.connectionRecordId}
                      initial={{
                        opacity: 0,
                        y: 20,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      className="relative overflow-hidden rounded-[30px] border-2 border-emerald-200 bg-white p-6 shadow-[0_20px_55px_rgba(7,26,74,0.12)]"
                    >
                      <div className="mb-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-700">
                        ✓ Mutual Interest
                      </div>

                      <div className="flex items-center gap-4">
                        {person.profilePhoto ? (
                          <img
                            src={person.profilePhoto}
                            alt={person.fullName || "Bridge member"}
                            className="h-16 w-16 rounded-full object-cover shadow-md"
                          />
                        ) : (
                          <div
                            className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-black text-white shadow-md"
                            style={{
                              background: `linear-gradient(135deg, ${profile.theme.primary}, ${profile.theme.secondary})`,
                            }}
                          >
                            {(person.firstName || person.fullName || "B")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <h3 className="truncate text-xl font-black text-[#071A4A]">
                            {person.fullName || "Bridge Member"}
                          </h3>

                          {subtitle && (
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                              {subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      {connection.matchEvidence && (
                        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                            Why Bridge connected you
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {connection.matchEvidence}
                          </p>
                        </div>
                      )}

                      <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-center">
                        <p className="text-sm font-black text-emerald-700">
                          You both expressed interest 🎉
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Bridge Connection Invitations */}
      {(peopleConnectionInvitationsLoading ||
        peopleConnectionInvitations.length > 0) && (
        <section className="relative z-10 px-4 pb-8 md:px-6 md:pb-10">
          <div className="mx-auto w-full max-w-7xl px-4">
            <div className="mb-6">
              <p
                className="text-sm font-black uppercase tracking-[0.28em]"
                style={{
                  color: profile.theme.secondary,
                }}
              >
                Connection Invitations
              </p>

              <h2 className="mt-3 text-3xl font-black text-[#071A4A]">
                Someone Would Like to Connect
              </h2>

              <p className="mt-2 max-w-3xl text-slate-600">
                Bridge found a connection that may be valuable to both of you.
              </p>
            </div>

            {peopleConnectionInvitationsLoading ? (
              <div className="rounded-3xl bg-white/80 p-8 text-center shadow-lg">
                <p className="font-bold text-slate-500">
                  Loading connection invitations...
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {peopleConnectionInvitations.map((invitation) => {
                  const person = invitation?.person || {};

                  const role = Array.isArray(person.role)
                    ? person.role.join(", ")
                    : person.role || "";

                  const subtitle = [role, person.businessOrganization]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <motion.div
                      key={invitation.connectionRecordId}
                      initial={{
                        opacity: 0,
                        y: 20,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      className="relative overflow-hidden rounded-[30px] border-2 border-amber-200 bg-white p-6 shadow-[0_20px_55px_rgba(7,26,74,0.12)]"
                    >
                      <div className="mb-4 inline-flex rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-amber-700">
                        Bridge Invitation
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedPublicProfile(person)}
                        className="group/profile flex w-full cursor-pointer items-center gap-4 rounded-[20px] p-2 text-left transition duration-200 hover:bg-slate-50"
                      >
                        {person.profilePhoto ? (
                          <img
                            src={person.profilePhoto}
                            alt={person.fullName || "Bridge member"}
                            className="h-16 w-16 shrink-0 rounded-full object-cover shadow-md transition duration-200 group-hover/profile:scale-105"
                          />
                        ) : (
                          <div
                            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-black text-white shadow-md transition duration-200 group-hover/profile:scale-105"
                            style={{
                              background: `linear-gradient(
          135deg,
          ${profile.theme.primary},
          ${profile.theme.secondary}
        )`,
                            }}
                          >
                            {(person.firstName || person.fullName || "B")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-xl font-black text-[#071A4A] transition group-hover/profile:underline">
                            {person.fullName || "Bridge Member"}
                          </h3>

                          {subtitle && (
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                              {subtitle}
                            </p>
                          )}

                          <p
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-black"
                            style={{
                              color: profile.theme.secondary,
                            }}
                          >
                            View Public Profile
                            <span className="transition-transform duration-200 group-hover/profile:translate-x-1">
                              →
                            </span>
                          </p>
                        </div>
                      </button>

                      {invitation.matchEvidence && (
                        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                            Why Bridge thinks you should connect
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {invitation.matchEvidence}
                          </p>
                        </div>
                      )}
                      <div className="mt-5">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handlePeopleInvitationInterest(
                                invitation.connectionRecordId,
                              )
                            }
                            disabled={
                              peopleConnectionInvitationSubmittingId ===
                              invitation.connectionRecordId
                            }
                            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full px-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                            style={{
                              background: `linear-gradient(135deg, ${profile.theme.primary}, ${profile.theme.secondary})`,
                            }}
                          >
                            I'm Interested
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handlePeopleInvitationDecline(
                                invitation.connectionRecordId,
                              )
                            }
                            disabled={
                              peopleConnectionInvitationSubmittingId ===
                              invitation.connectionRecordId
                            }
                            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-black text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Not Interested
                          </button>
                        </div>

                        {peopleConnectionInvitationError && (
                          <p className="mt-3 text-center text-xs font-bold text-rose-600">
                            {peopleConnectionInvitationError}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Local People We Think You Should Connect With */}
      {/* Local People We Think You Should Connect With */}
      <section className="relative z-10 px-4 pb-12 md:px-6 md:pb-16">
        <div className="mx-auto w-full max-w-7xl px-0 md:px-4">
          {/* ========================================================= */}
          {/* SECTION HEADER */}
          {/* ========================================================= */}

          <div className="mb-8 px-4 md:mb-10 md:px-0">
            <div
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em]"
              style={{
                color: profile.theme.secondary,
              }}
            >
              <motion.span
                animate={{
                  opacity: [0.4, 1, 0.4],
                  scale: [1, 1.3, 1],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "easeInOut",
                }}
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: profile.theme.secondary,
                  boxShadow: `0 0 14px ${profile.theme.secondary}`,
                }}
              />
              Bridge Connections
            </div>

            <h2 className="mt-3 max-w-4xl text-3xl font-black tracking-[-0.04em] text-[#071A4A] md:text-4xl">
              Local People We Think You Should Connect With
            </h2>

            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              People Bridge believes may be valuable for you to know based on
              your interests, goals, and local connections.
            </p>

            {/* MOBILE SWIPE HINT */}
            {peopleRecommendations.length > 1 &&
              !peopleRecommendationsLoading && (
                <div className="mt-5 flex items-center justify-between md:hidden">
                  <p className="text-xs font-bold text-slate-400">
                    Swipe to explore connections
                  </p>

                  <motion.div
                    animate={{
                      x: [0, 6, 0],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: "easeInOut",
                    }}
                    className="flex items-center gap-1 text-sm font-black"
                    style={{
                      color: profile.theme.secondary,
                    }}
                  >
                    <span>Swipe</span>
                    <span>→</span>
                  </motion.div>
                </div>
              )}
          </div>

          {/* ========================================================= */}
          {/* LOADING */}
          {/* ========================================================= */}

          {peopleRecommendationsLoading ? (
            <div className="mx-4 rounded-[30px] bg-[#071A4A] p-10 text-center shadow-[0_24px_70px_rgba(7,26,74,0.20)] md:mx-0">
              <motion.div
                animate={{
                  rotate: 360,
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1,
                  ease: "linear",
                }}
                className="mx-auto h-10 w-10 rounded-full border-4 border-white/20"
                style={{
                  borderTopColor: profile.theme.secondary,
                }}
              />

              <p className="mt-5 font-black text-white">
                Finding strong local connections...
              </p>
            </div>
          ) : peopleRecommendations.length === 0 ? (
            /* ======================================================= */
            /* EMPTY */
            /* ======================================================= */

            <div className="mx-4 rounded-[30px] bg-[#071A4A] p-10 text-center shadow-[0_24px_70px_rgba(7,26,74,0.20)] md:mx-0">
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black"
                style={{
                  color: profile.theme.secondary,
                  backgroundColor: `${profile.theme.secondary}18`,
                }}
              >
                ✦
              </div>

              <p className="mt-5 text-lg font-black text-white">
                No strong people matches yet.
              </p>

              <p className="mt-2 text-sm text-white/60">
                Bridge will keep looking as it learns more about you.
              </p>
            </div>
          ) : (
            /* ======================================================= */
            /* MOBILE SLIDER / DESKTOP GRID */
            /* ======================================================= */

            <div
              className="
          flex
          snap-x
          snap-mandatory
          gap-5
          overflow-x-auto
          overflow-y-hidden
          overscroll-x-contain
          scroll-smooth
          px-4
          pb-10
          touch-pan-x
          [-ms-overflow-style:none]
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden

          md:grid
          md:grid-cols-2
          md:gap-8
          md:overflow-visible
          md:px-0
          md:pb-0

          xl:grid-cols-3
        "
            >
              {peopleRecommendations.map((recommendation, index) => {
                const person = recommendation?.person || {};

                const role = Array.isArray(person.role)
                  ? person.role.join(", ")
                  : person.role || "";

                const subtitle = [role, person.businessOrganization]
                  .filter(Boolean)
                  .join(" · ");

                const isBookOpen =
                  openPeopleBookId === recommendation.connectionRecordId;

                return (
                  <motion.div
                    key={recommendation.connectionRecordId}
                    initial={{
                      opacity: 0,
                      y: 28,
                    }}
                    whileInView={{
                      opacity: 1,
                      y: 0,
                    }}
                    viewport={{
                      once: true,
                    }}
                    transition={{
                      duration: 0.45,
                      delay: index * 0.05,
                    }}
                    className="
                group
                relative
                w-[84vw]
                max-w-[390px]
                shrink-0
                snap-start

                md:w-full
                md:max-w-none
                md:shrink
                md:snap-align-none

                hover:z-50
              "
                    style={{
                      perspective: "2000px",
                    }}
                  >
                    {/* ================================================= */}
                    {/* INSIDE PAGE */}
                    {/* This is RELATIVE, not absolute.
                  It controls the natural card height.
                  Therefore NO inside scrolling is needed. */}
                    {/* ================================================= */}

                    <div
                      className="
  relative
  flex
  h-auto
  flex-col
  overflow-hidden
  rounded-[28px]
  border
  border-slate-200
  bg-white
  p-5
  shadow-[0_22px_70px_rgba(7,26,74,0.16)]

  sm:p-6
  md:p-6
"
                      style={{
                        background: `linear-gradient(
    145deg,
    #ffffff 0%,
    ${profile.theme.secondary}08 100%
  )`,
                      }}
                    >
                      {/* INSIDE DECORATIVE GLOW */}
                      <div
                        className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full opacity-[0.10] blur-3xl"
                        style={{
                          backgroundColor: profile.theme.secondary,
                        }}
                      />

                      {/* MOBILE CLOSE BUTTON */}
                      {isBookOpen && (
                        <button
                          type="button"
                          onClick={() => setOpenPeopleBookId("")}
                          className="absolute right-4 top-4 z-30 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-black text-[#071A4A] shadow-md md:hidden"
                          aria-label="Close connection details"
                        >
                          ×
                        </button>
                      )}

                      <div className="relative z-10">
                        {/* INSIDE TOP */}

                        <div className="flex items-start justify-between gap-3 pr-10 md:pr-0">
                          <div>
                            <p
                              className="text-[10px] font-black uppercase tracking-[0.18em]"
                              style={{
                                color: profile.theme.secondary,
                              }}
                            >
                              Why Bridge Picked
                            </p>

                            <p className="mt-1 text-sm font-black text-[#071A4A]">
                              This Connection
                            </p>
                          </div>

                          <motion.div
                            animate={{
                              boxShadow: [
                                `0 0 0px ${profile.theme.secondary}00`,
                                `0 0 20px ${profile.theme.secondary}55`,
                                `0 0 0px ${profile.theme.secondary}00`,
                              ],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 2.5,
                              ease: "easeInOut",
                            }}
                            className="shrink-0 rounded-xl px-3 py-2 text-center"
                            style={{
                              color: profile.theme.primary,
                              backgroundColor: `${profile.theme.secondary}14`,
                              border: `1px solid ${profile.theme.secondary}25`,
                            }}
                          >
                            <p className="text-lg font-black leading-none">
                              {recommendation.matchScore}%
                            </p>

                            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.15em]">
                              Match
                            </p>
                          </motion.div>
                        </div>

                        <div
                          className="mt-4 h-1 w-14 rounded-full"
                          style={{
                            backgroundColor: profile.theme.secondary,
                          }}
                        />

                        {/* MATCH EXPLANATION */}

                        <p className="mt-5 text-sm font-medium leading-6 text-slate-600">
                          {recommendation.matchEvidence}
                        </p>

                        {/* PUBLIC PROFILE */}

                        <button
                          type="button"
                          onClick={() => setSelectedPublicProfile(person)}
                          className="group/profile mt-6 flex w-full cursor-pointer items-center gap-3 rounded-[20px] border border-slate-200 bg-white p-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                        >
                          {person.profilePhoto ? (
                            <img
                              src={person.profilePhoto}
                              alt={person.fullName || "Bridge member"}
                              className="h-12 w-12 shrink-0 rounded-xl object-cover shadow-md transition group-hover/profile:scale-105"
                            />
                          ) : (
                            <div
                              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black text-white shadow-md transition group-hover/profile:scale-105"
                              style={{
                                background: `linear-gradient(
                            135deg,
                            ${profile.theme.primary},
                            ${profile.theme.secondary}
                          )`,
                              }}
                            >
                              {(person.firstName || person.fullName || "B")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-[#071A4A]">
                              {person.fullName || "Bridge Member"}
                            </p>

                            <p
                              className="mt-1 inline-flex items-center gap-1 text-[11px] font-black"
                              style={{
                                color: profile.theme.secondary,
                              }}
                            >
                              View Public Profile
                              <span className="transition group-hover/profile:translate-x-1">
                                →
                              </span>
                            </p>
                          </div>
                        </button>
                      </div>

                      {/* ACTIONS */}

                      <div className="relative z-10 mt-auto pt-5">
                        <div className="border-t border-slate-200 pt-1">
                          <PeopleRecommendationActions
                            person={person}
                            viewerToken={token}
                            theme={profile.theme}
                            connectionRecordId={
                              recommendation.connectionRecordId
                            }
                            onRecommendationHidden={() => {
                              setPeopleRecommendations((current) =>
                                current.filter(
                                  (item) =>
                                    item.connectionRecordId !==
                                    recommendation.connectionRecordId,
                                ),
                              );
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* ================================================= */}
                    {/* BOOK COVER */}
                    {/* ================================================= */}

                    <div
                      onClick={() => {
                        setOpenPeopleBookId((current) =>
                          current === recommendation.connectionRecordId
                            ? ""
                            : recommendation.connectionRecordId,
                        );
                      }}
                      className={`
                  absolute
                  inset-0
                  z-20
                  flex
                  flex-col
                  overflow-hidden
                  rounded-[28px]
                  border
                  border-white/10
                  p-6
                  text-white
                  shadow-[0_26px_75px_rgba(7,26,74,0.32)]
                  transition-transform
                  duration-700
                  ease-[cubic-bezier(0.22,1,0.36,1)]

                  ${
                    isBookOpen
                      ? "[transform:rotateY(-88deg)] md:[transform:rotateY(0deg)] md:group-hover:[transform:rotateY(-88deg)]"
                      : "[transform:rotateY(0deg)] md:group-hover:[transform:rotateY(-88deg)]"
                  }
                `}
                      style={{
                        transformOrigin: "left center",
                        transformStyle: "preserve-3d",
                        backfaceVisibility: "hidden",

                        background: `linear-gradient(
                    145deg,
                    #071A4A 0%,
                    ${profile.theme.primary} 100%
                  )`,
                      }}
                    >
                      {/* GLOW 1 */}

                      <motion.div
                        animate={{
                          opacity: [0.08, 0.2, 0.08],
                          scale: [1, 1.15, 1],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 4,
                          ease: "easeInOut",
                        }}
                        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl"
                        style={{
                          backgroundColor: profile.theme.secondary,
                        }}
                      />

                      {/* GLOW 2 */}

                      <div
                        className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full opacity-[0.08] blur-3xl"
                        style={{
                          backgroundColor: profile.theme.secondary,
                        }}
                      />

                      {/* TOP ACCENT */}

                      <motion.div
                        animate={{
                          width: ["52px", "110px", "52px"],
                          opacity: [0.6, 1, 0.6],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 3,
                          ease: "easeInOut",
                        }}
                        className="relative z-10 h-1.5 rounded-full"
                        style={{
                          backgroundColor: profile.theme.secondary,
                          boxShadow: `0 0 18px ${profile.theme.secondary}`,
                        }}
                      />

                      {/* MATCH */}

                      <div className="relative z-10 mt-8">
                        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/45">
                          Bridge Match
                        </p>

                        <motion.div
                          animate={{
                            textShadow: [
                              `0 0 0px ${profile.theme.secondary}`,
                              `0 0 30px ${profile.theme.secondary}`,
                              `0 0 12px ${profile.theme.secondary}`,
                              `0 0 0px ${profile.theme.secondary}`,
                            ],

                            scale: [1, 1.045, 1],
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 2.8,
                            ease: "easeInOut",
                          }}
                          className="mt-3 origin-left text-6xl font-black leading-none tracking-[-0.07em]"
                        >
                          {recommendation.matchScore}%
                        </motion.div>

                        <div className="mt-3 flex items-center gap-2">
                          <motion.span
                            animate={{
                              opacity: [0.4, 1, 0.4],
                              scale: [1, 1.35, 1],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 2,
                            }}
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor: profile.theme.secondary,
                              boxShadow: `0 0 12px ${profile.theme.secondary}`,
                            }}
                          />

                          <p
                            className="text-[10px] font-black uppercase tracking-[0.19em]"
                            style={{
                              color: profile.theme.secondary,
                            }}
                          >
                            Connection Match
                          </p>
                        </div>
                      </div>

                      {/* PERSON */}

                      <div className="relative z-10 mt-auto">
                        <div className="flex items-center gap-4">
                          {person.profilePhoto ? (
                            <img
                              src={person.profilePhoto}
                              alt={person.fullName || "Bridge member"}
                              className="h-16 w-16 shrink-0 rounded-[18px] object-cover shadow-[0_12px_30px_rgba(0,0,0,0.28)]"
                            />
                          ) : (
                            <div
                              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] text-xl font-black text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)]"
                              style={{
                                background: `linear-gradient(
                            135deg,
                            ${profile.theme.secondary},
                            ${profile.theme.primary}
                          )`,
                              }}
                            >
                              {(person.firstName || person.fullName || "B")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <h3 className="truncate text-xl font-black tracking-[-0.025em] text-white">
                              {person.fullName || "Bridge Member"}
                            </h3>

                            {subtitle && (
                              <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-white/55">
                                {subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* DESKTOP HOVER INSTRUCTION */}

                        <div
                          className="mt-7 hidden items-center gap-2 text-xs font-black uppercase tracking-[0.17em] md:flex"
                          style={{
                            color: profile.theme.secondary,
                          }}
                        >
                          <span>Hover to see why</span>

                          <motion.span
                            animate={{
                              x: [0, 6, 0],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 1.4,
                              ease: "easeInOut",
                            }}
                            className="text-lg"
                          >
                            →
                          </motion.span>
                        </div>

                        {/* MOBILE OPEN BUTTON */}

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();

                            setOpenPeopleBookId(
                              recommendation.connectionRecordId,
                            );
                          }}
                          className="mt-7 flex w-full cursor-pointer items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-left text-xs font-black uppercase tracking-[0.15em] backdrop-blur-sm transition active:scale-[0.98] md:hidden"
                          style={{
                            color: profile.theme.secondary,
                          }}
                        >
                          <span>Open to see why</span>

                          <motion.span
                            animate={{
                              x: [0, 5, 0],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 1.3,
                            }}
                            className="text-lg"
                          >
                            →
                          </motion.span>
                        </button>
                      </div>

                      {/* BOOK SPINE */}

                      <div
                        className="pointer-events-none absolute bottom-0 left-0 top-0 w-2 opacity-70"
                        style={{
                          background: `linear-gradient(
                      180deg,
                      ${profile.theme.secondary},
                      ${profile.theme.primary},
                      ${profile.theme.secondary}
                    )`,
                        }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* MOBILE SWIPE DOTS / VISUAL INDICATOR */}

          {peopleRecommendations.length > 1 &&
            !peopleRecommendationsLoading && (
              <div className="mt-1 flex justify-center gap-2 md:hidden">
                {peopleRecommendations.map((recommendation) => (
                  <span
                    key={recommendation.connectionRecordId}
                    className="h-1.5 w-6 rounded-full bg-slate-300"
                  />
                ))}
              </div>
            )}
        </div>
      </section>
      {/* recommendations */}
      <section className="relative z-10 px-4 pb-8 md:px-6 md:pb-12">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className="mb-6 md:mb-8">
            {/* <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#C62828]">
              AI-Curated Local Picks
            </p> */}

            <h2 className="mt-3 text-4xl font-bold text-[#071A4A]">
              Selected For You
            </h2>

            <div className="mt-7 flex flex-wrap gap-5">
              {/* Local Events */}
              <button
                type="button"
                onClick={() => setActiveSection("events")}
                className="group relative inline-block p-2 transition-transform duration-200 hover:-translate-y-1"
              >
                <span
                  className="relative z-10 block overflow-hidden rounded-lg border-2 px-7 py-3 text-lg font-black leading-tight transition-colors duration-300 ease-out group-hover:text-white group-hover:shadow-xl"
                  style={{
                    borderColor:
                      activeSection === "events"
                        ? profile.theme.primary
                        : "#071A4A",
                    color:
                      activeSection === "events"
                        ? profile.theme.primary
                        : "#071A4A",
                  }}
                >
                  {/* White background */}
                  <span className="absolute inset-0 h-full w-full rounded-lg bg-white" />

                  {/* Animated gradient hover */}
                  <span
                    className="absolute left-1/2 top-1/2 h-80 w-80 translate-x-[140%] -translate-y-1/2 -rotate-90 rounded-full transition-all duration-500 ease-out group-hover:-translate-x-1/2 group-hover:-rotate-180"
                    style={{
                      background: `linear-gradient(135deg, ${profile.theme.primary}, ${profile.theme.secondary})`,
                    }}
                  />

                  <span className="relative z-10">Local Events</span>
                </span>

                {/* Selected indicator */}
                {activeSection === "events" && (
                  <span
                    className="absolute bottom-0 right-0 h-12 w-full -mb-1 -mr-1 rounded-lg transition-all duration-200 ease-linear group-hover:mb-0 group-hover:mr-0"
                    style={{
                      background: profile.theme.primary,
                    }}
                  />
                )}
              </button>

              {/* Community Hub */}
              <button
                type="button"
                onClick={() => setActiveSection("hub")}
                className="group relative inline-block p-2 transition-transform duration-200 hover:-translate-y-1"
              >
                <span
                  className="relative z-10 block overflow-hidden rounded-lg border-2 px-7 py-3 text-lg font-black leading-tight transition-colors duration-300 ease-out group-hover:text-white group-hover:shadow-xl"
                  style={{
                    borderColor:
                      activeSection === "hub"
                        ? profile.theme.primary
                        : "#071A4A",
                    color:
                      activeSection === "hub"
                        ? profile.theme.primary
                        : "#071A4A",
                  }}
                >
                  {/* White background */}
                  <span className="absolute inset-0 h-full w-full rounded-lg bg-white" />

                  {/* Animated gradient hover */}
                  <span
                    className="absolute left-1/2 top-1/2 h-80 w-80 translate-x-[140%] -translate-y-1/2 -rotate-90 rounded-full transition-all duration-500 ease-out group-hover:-translate-x-1/2 group-hover:-rotate-180"
                    style={{
                      background: `linear-gradient(135deg, ${profile.theme.primary}, ${profile.theme.secondary})`,
                    }}
                  />

                  <span className="relative z-10">Community Hub</span>
                </span>

                {/* Selected indicator */}
                {activeSection === "hub" && (
                  <span
                    className="absolute bottom-0 right-0 h-12 w-full -mb-1 -mr-1 rounded-lg transition-all duration-200 ease-linear group-hover:mb-0 group-hover:mr-0"
                    style={{
                      background: profile.theme.primary,
                    }}
                  />
                )}
              </button>
            </div>

            {activeSection === "hub" && (
              <div className="mt-6 flex flex-wrap gap-3">
                {communityCategories.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCommunityFilter(type)}
                    className="rounded-full border px-4 py-2 text-sm font-bold transition hover:scale-105"
                    style={{
                      backgroundColor:
                        communityFilter === type
                          ? profile.theme.primary
                          : "#fff",
                      color:
                        communityFilter === type
                          ? "#fff"
                          : profile.theme.primary,
                      borderColor:
                        communityFilter === type
                          ? profile.theme.primary
                          : "#E5E7EB",
                      boxShadow:
                        communityFilter === type
                          ? `0 0 0 3px ${profile.theme.primary}33`
                          : "none",
                    }}
                  >
                    {type === "all"
                      ? `All (${allCommunityItems.length})`
                      : type === "An activity, event, class, or opportunity"
                        ? `Activities (${
                            allCommunityItems.filter(
                              (item) =>
                                item.submissionType ===
                                "An activity, event, class, or opportunity",
                            ).length
                          })`
                        : type === "A resource, article, tip, or link"
                          ? `Resources (${
                              allFutureCommunityItems.filter(
                                (item) =>
                                  item.submissionType ===
                                  "A resource, article, tip, or link",
                              ).length
                            })`
                          : `Documents (${
                              allFutureCommunityItems.filter(
                                (item) =>
                                  item.submissionType ===
                                  "A helpful Document, template, or guide",
                              ).length
                            })`}
                  </button>
                ))}
              </div>
            )}

            <p className="mt-3 max-w-2xl text-gray-600">
              Local events, resources, and opportunities based on your
              interests.
            </p>
            <p className="mt-2 text-sm font-bold text-[#071A4A]">
              Showing {activeItems.length}{" "}
              {activeSection === "events" ? "activities" : "submissions"}
            </p>
          </div>

          <div className="relative px-0 pb-6 md:px-12 md:pb-8">
            {shouldShowDateFilter && (
              <div className="mb-5 md:mb-6">
                {/* Mobile dropdown */}
                <div className="md:hidden">
                  <label className="mb-2 block text-sm font-black text-[#071A4A]">
                    Time Range
                  </label>

                  <select
                    value={showAllFuture ? "all" : daysFilter}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (value === "all") {
                        setShowAllFuture(true);
                      } else {
                        setShowAllFuture(false);
                        setDaysFilter(Number(value));
                      }
                    }}
                    className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-bold shadow-lg"
                    style={{
                      color: profile.theme.primary,
                      borderColor: `${profile.theme.primary}33`,
                    }}
                  >
                    <option value={3}>3 Days</option>
                    <option value={7}>7 Days</option>
                    <option value={14}>14 Days</option>
                    <option value="all">All Future</option>
                  </select>
                </div>

                {/* Desktop pills */}
                <div className="hidden md:flex">
                  <div className="inline-flex rounded-full border bg-white p-1 shadow-lg">
                    {[
                      { value: 3, label: "3 Days" },
                      { value: 7, label: "7 Days" },
                      { value: 14, label: "14 Days" },
                      { value: "all", label: "All Future" },
                    ].map((option) => {
                      const isActive =
                        (option.value === "all" && showAllFuture) ||
                        (!showAllFuture && daysFilter === option.value);

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            if (option.value === "all") {
                              setShowAllFuture(true);
                            } else {
                              setShowAllFuture(false);
                              setDaysFilter(option.value);
                            }
                          }}
                          className="rounded-full px-5 py-2.5 text-sm font-black transition"
                          style={{
                            backgroundColor: isActive
                              ? profile.theme.primary
                              : "transparent",
                            color: isActive ? "#fff" : profile.theme.primary,
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="relative px-0 md:px-10">
              <CustomRecommendationCarousel
                items={activeItems}
                theme={profile.theme}
              />
            </div>
            {activeSection === "hub" && (
              <div className="mt-10">
                <LocalDirectory theme={profile.theme} viewerToken={token} />
              </div>
            )}
          </div>
        </div>
      </section>
      {/* floating AI delight */}

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
                scale: 1.03,
                y: -2,
              }}
              whileTap={{
                scale: 0.98,
              }}
              className="group relative mt-8 inline-flex items-center gap-3 overflow-hidden rounded-full border bg-white px-8 py-4 text-sm font-black uppercase tracking-[0.22em] text-[#071A4A] shadow-xl"
              style={{
                borderColor: `${profile.theme.secondary}55`,
                boxShadow: `
      0 10px 35px rgba(7,26,74,0.12),
      0 0 0 1px ${profile.theme.secondary}22
    `,
              }}
            >
              {/* moving glow */}
              <motion.div
                animate={{
                  x: ["-120%", "120%"],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.8,
                  ease: "linear",
                }}
                className="absolute inset-0 opacity-80"
                style={{
                  background: `linear-gradient(
        90deg,
        transparent,
        ${profile.theme.secondary}55,
        transparent
      )`,
                }}
              />

              {/* top edge glow */}
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  background: `linear-gradient(
        90deg,
        transparent,
        ${profile.theme.secondary},
        transparent
      )`,
                }}
              />

              <span className="relative z-10">Explore BridgeAZ</span>

              <motion.span
                animate={{
                  x: [0, 4, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                }}
                className="relative z-10"
              >
                →
              </motion.span>
            </motion.a>
          </div>
        </div>
      </motion.section>
      {/* footer */}
      <section className="relative z-10 px-6 pb-10 pt-0 md:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-6xl overflow-hidden rounded-[36px] border border-white/50 bg-white/75 shadow-[0_35px_100px_rgba(15,23,42,0.12)] backdrop-blur-2xl"
        >
          <div
            className="relative grid gap-0 overflow-hidden md:grid-cols-2"
            style={{
              background: `
          radial-gradient(circle at 15% 20%, ${profile.theme.secondary}22, transparent 34%),
          radial-gradient(circle at 85% 80%, ${profile.theme.primary}20, transparent 36%),
          linear-gradient(135deg, rgba(255,255,255,0.96), rgba(255,255,255,0.74))
        `,
            }}
          >
            {/* LEFT CONTENT */}
            <div className="relative overflow-hidden p-8 md:p-12">
              <div
                className="mb-6 inline-flex rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.22em]"
                style={{
                  color: profile.theme.primary,
                  backgroundColor: `${profile.theme.secondary}22`,
                }}
              >
                Grow the BridgeAZ circle
              </div>

              <h2
                className="max-w-xl text-2xl font-black leading-tight "
                style={{ color: profile.theme.primary }}
              >
                Know Someone Who Would Love BridgeAZ?
              </h2>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 md:text-lg">
                Invite a friend, neighbor, or colleague to discover local
                events, helpful resources, and opportunities tailored to their
                interests.
              </p>

              {/* CLEAN CONNECTION VISUAL */}
              <div className="relative mt-8 h-48 overflow-hidden rounded-3xl border border-white/60 bg-white/55">
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 520 220"
                  fill="none"
                >
                  <motion.path
                    d="M60 150 C150 40, 250 185, 340 75 S450 120, 485 55"
                    stroke={profile.theme.primary}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="10 14"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: [0.25, 1, 0.25] }}
                    transition={{
                      repeat: Infinity,
                      duration: 5,
                      ease: "easeInOut",
                    }}
                    opacity="0.7"
                  />

                  {[
                    { x: 60, y: 150 },
                    { x: 175, y: 78 },
                    { x: 285, y: 150 },
                    { x: 390, y: 78 },
                    { x: 485, y: 55 },
                  ].map((node, index) => (
                    <motion.g
                      key={index}
                      animate={{ scale: [1, 1.14, 1] }}
                      transition={{
                        repeat: Infinity,
                        duration: 2.4,
                        delay: index * 0.22,
                        ease: "easeInOut",
                      }}
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="15"
                        fill="white"
                        stroke={profile.theme.primary}
                        strokeWidth="3"
                      />
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="6"
                        fill={profile.theme.secondary}
                      />
                    </motion.g>
                  ))}
                </svg>

                <motion.div
                  animate={{ x: ["-30%", "120%"] }}
                  transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                  className="absolute top-0 h-full w-32 rotate-12"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${profile.theme.secondary}33, transparent)`,
                    filter: "blur(22px)",
                  }}
                />

                <div className="absolute bottom-0 left-5 right-5">
                  <p
                    className="text-sm font-black uppercase tracking-[0.18em]"
                    style={{ color: profile.theme.primary }}
                  >
                    One invite can open a new local connection.
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT FORM */}
            <div className="relative flex items-center p-8 md:p-12">
              <form
                onSubmit={handleInviteFriend}
                className="w-full rounded-[30px] border border-white/70 bg-white/90 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl md:p-8"
              >
                <p
                  className="text-sm font-black uppercase tracking-[0.22em]"
                  style={{ color: profile.theme.secondary }}
                >
                  Invite Your Friends
                </p>

                <h3
                  className="mt-3 text-3xl font-black"
                  style={{ color: profile.theme.primary }}
                >
                  Send a personal invite
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Enter their email and we’ll send them a simple invitation to
                  join BridgeAZ.
                </p>

                <label className="mt-6 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Friend Email
                </label>

                <input
                  type="email"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="mt-3 w-full rounded-2xl border bg-white px-4 py-4 text-sm font-semibold text-[#071A4A] outline-none transition focus:scale-[1.01]"
                  style={{
                    borderColor: `${profile.theme.primary}22`,
                    boxShadow: `0 0 0 3px ${profile.theme.primary}08`,
                  }}
                  required
                />

                <button
                  type="submit"
                  className="mt-5 w-full rounded-2xl px-6 py-4 text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5 hover:scale-[1.01]"
                  style={{
                    backgroundColor: profile.theme.primary,
                    boxShadow: `0 16px 36px ${profile.theme.primary}33`,
                  }}
                >
                  Send Invite
                </button>

                {inviteStatus && (
                  <p
                    className="mt-4 rounded-2xl px-4 py-3 text-sm font-bold"
                    style={{
                      color: profile.theme.primary,
                      backgroundColor: `${profile.theme.secondary}18`,
                    }}
                  >
                    {inviteStatus}
                  </p>
                )}

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Help Build a Better Connected Community
                </p>
              </form>
            </div>
          </div>
        </motion.div>
      </section>

      <footer
        className="relative z-10 overflow-hidden px-6 py-10 text-center text-white"
        style={{
          background: `linear-gradient(135deg, ${profile.theme.primary}, ${profile.theme.secondary})`,
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[#071A4A]/35" />

        <motion.div
          animate={{
            x: ["-120%", "120%"],
          }}
          transition={{
            repeat: Infinity,
            duration: 5,
            ease: "linear",
          }}
          className="pointer-events-none absolute inset-y-0 w-52 rotate-12 bg-white/10 blur-2xl"
        />

        <div className="relative z-10 mx-auto max-w-5xl">
          <h3 className="text-2xl font-black tracking-tight">BridgeAZ</h3>

          <div className="mx-auto mt-3 h-1 w-20 rounded-full bg-white/70" />

          <p className="mx-auto mt-4 max-w-xl text-sm font-medium leading-6 text-white/80">
            Personalized recommendations created for {profile.firstName},
            powered by your interests and BridgeAZ connections.
          </p>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.28em] text-white/60">
            Prescott, Arizona
          </p>
        </div>
      </footer>
      {showInterestModal && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-[#071A4A]/70 px-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-4xl bg-white shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
            <button
              type="button"
              onClick={() => setShowInterestModal(false)}
              className="absolute right-5 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl font-black text-[#071A4A] transition hover:bg-slate-200"
            >
              ×
            </button>

            <div className="pt-12">
              <InterestManager
                key={`${rawData?.email || rawData?.token || "member"}-${rawData?.interestTags || rawData?.["Interest Tags"] || ""}`}
                rawData={rawData}
                profile={profile}
              />
            </div>
          </div>
        </div>
      )}

      {selectedPublicProfile && (
        <PublicProfileView
          member={selectedPublicProfile}
          theme={profile.theme}
          onClose={() => setSelectedPublicProfile(null)}
        />
      )}
    </main>
  );
}
