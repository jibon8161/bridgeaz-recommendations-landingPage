import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://bridgeaz-recommendations-server.vercel.app";

/* =====================================================
   HELPERS
===================================================== */

function cleanText(value) {
  return String(value || "").trim();
}

function getDisplayName(member) {
  const fullName = cleanText(member?.fullName);

  if (fullName) {
    return fullName;
  }

  return (
    [cleanText(member?.firstName), cleanText(member?.lastName)]
      .filter(Boolean)
      .join(" ") || "Bridge Member"
  );
}

function getInitials(name) {
  return String(name || "M")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function splitList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanExternalUrl(value) {
  const text = cleanText(value);

  if (!text) {
    return "";
  }

  if (/^https?:\/\//i.test(text)) {
    return text;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) {
    return `https://${text}`;
  }

  return "";
}

function getHostnameLabel(value) {
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./i, "");
  } catch {
    return "Website";
  }
}

function formatMemberSince(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatContributionDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function parseSocialLinks(value) {
  if (!value) {
    return [];
  }

  const items = Array.isArray(value) ? value : String(value).split(/\n|;/);

  return items
    .map((item) => String(item).trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/https?:\/\/[^\s]+/i);

      if (match) {
        const url = match[0].replace(/[),.;]+$/, "");
        const label = line
          .slice(0, match.index)
          .replace(/[:\-–—]+$/, "")
          .trim();

        return {
          label: label || getHostnameLabel(url),
          url,
        };
      }

      const url = cleanExternalUrl(line);

      return {
        label: url ? getHostnameLabel(url) : line,
        url,
      };
    })
    .filter((item) => item.url);
}

function getSocialLabel(item) {
  const value = `${item?.label || ""} ${item?.url || ""}`.toLowerCase();

  if (value.includes("linkedin")) return "LinkedIn";
  if (value.includes("facebook")) return "Facebook";
  if (value.includes("instagram")) return "Instagram";
  if (value.includes("youtube") || value.includes("youtu.be")) return "YouTube";
  if (value.includes("twitter") || value.includes("x.com")) return "X";
  if (value.includes("tiktok")) return "TikTok";

  return item?.label || "Social";
}

function getContributionTitle(item) {
  return (
    cleanText(item?.title) ||
    cleanText(item?.originalTitle) ||
    cleanText(item?.Title) ||
    cleanText(item?.["Submission Title"]) ||
    "Bridge Contribution"
  );
}

function getContributionLink(item) {
  const value =
    item?.bridgePublishedLink ||
    item?.["Bridge Published Link"] ||
    item?.publishedLink ||
    item?.link ||
    item?.url ||
    "";

  return cleanExternalUrl(value);
}

function getContributionDate(item) {
  return (
    item?.submittedDate ||
    item?.submittedAt ||
    item?.startDate ||
    item?.date ||
    item?.["Submitted Date"] ||
    ""
  );
}

/* =====================================================
   ICONS
===================================================== */

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      className="h-5 w-5"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M6 2h9l5 5v15H6z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="m12 3-1.3 3.2a4 4 0 0 1-2.2 2.2L5.3 9.7l3.2 1.3a4 4 0 0 1 2.2 2.2L12 16.4l1.3-3.2a4 4 0 0 1 2.2-2.2l3.2-1.3-3.2-1.3a4 4 0 0 1-2.2-2.2L12 3Z" />
      <path d="m5 16-.7 1.7a2 2 0 0 1-1.1 1.1L1.5 19.5l1.7.7a2 2 0 0 1 1.1 1.1L5 23l.7-1.7a2 2 0 0 1 1.1-1.1l1.7-.7-1.7-.7a2 2 0 0 1-1.1-1.1L5 16Z" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M3 12h18" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M4 21V3h12v18" />
      <path d="M16 8h4v13" />
      <path d="M8 7h4M8 11h4M8 15h4" />
      <path d="M2 21h20" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

/* =====================================================
   UI COMPONENTS
===================================================== */

function Surface({ children, className = "" }) {
  return (
    <div
      className={`rounded-[30px] border border-slate-200/80 bg-white shadow-[0_22px_65px_rgba(15,23,42,.07)] ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({
  icon,
  eyebrow,
  title,
  description,
  primary,
  secondary,
  light = false,
}) {
  return (
    <div className="flex items-start gap-4">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          light ? "bg-white/12 text-white" : ""
        }`}
        style={
          light
            ? undefined
            : {
                color: primary,
                backgroundColor: `${secondary}14`,
              }
        }
      >
        {icon}
      </div>

      <div className="min-w-0">
        {eyebrow && (
          <p
            className={`text-xs font-extrabold uppercase tracking-[0.14em] ${
              light ? "text-white/65" : ""
            }`}
            style={light ? undefined : { color: secondary }}
          >
            {eyebrow}
          </p>
        )}

        <h2
          className={`mt-1 text-2xl font-black tracking-[-0.035em] md:text-[30px] ${
            light ? "text-white" : ""
          }`}
          style={light ? undefined : { color: primary }}
        >
          {title}
        </h2>

        {description && (
          <p
            className={`mt-2 max-w-3xl text-sm font-medium leading-6 md:text-[15px] ${light ? "text-white/70" : "text-slate-500"}`}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function Pill({ children, primary, secondary, tone = "brand" }) {
  if (tone === "green") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-2 text-xs font-extrabold text-emerald-700 md:text-sm">
        {children}
      </span>
    );
  }

  if (tone === "slate") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-extrabold text-slate-700 md:text-sm">
        {children}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-extrabold md:text-sm"
      style={{
        color: primary,
        backgroundColor: `${secondary}10`,
        borderColor: `${secondary}22`,
      }}
    >
      {children}
    </span>
  );
}

function StrengthRing({ value, primary, secondary }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className="flex items-center gap-4 rounded-[24px] border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
      <div
        className="flex h-[112px] w-[112px] shrink-0 items-center justify-center rounded-full p-[9px]"
        style={{
          background: `conic-gradient(${secondary} 0 ${safeValue}%, ${primary}13 ${safeValue}% 100%)`,
        }}
      >
        <div className="flex h-full w-full items-center justify-center rounded-full bg-white shadow-inner">
          <div className="text-center">
            <p
              className="text-[34px] font-black leading-none tracking-[-0.055em]"
              style={{ color: primary }}
            >
              {safeValue}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-400">/100</p>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-sm font-black" style={{ color: primary }}>
          Profile Strength
        </p>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
          A quick view of profile completeness and Bridge participation.
        </p>
      </div>
    </div>
  );
}

function MetricCard({ icon, value, label, primary, secondary }) {
  return (
    <div
      className="
        flex
        min-h-[140px]
        flex-col
        items-center
        justify-center
        rounded-[22px]
        border
        border-slate-200
        bg-white/90
        px-3
        py-4
        text-center
        shadow-sm
        backdrop-blur-sm
        transition
        duration-200
        hover:-translate-y-1
        hover:shadow-md
      "
    >
      {/* ICON */}
      <div
        className="
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-xl
        "
        style={{
          color: primary,
          backgroundColor: `${secondary}12`,
        }}
      >
        {icon}
      </div>

      {/* NUMBER */}
      <p
        className="
          mt-3
          text-[28px]
          font-black
          leading-none
          tracking-[-0.04em]
        "
        style={{ color: primary }}
      >
        {value}
      </p>

      {/* LABEL */}
      <div
        className="
          mt-2
          flex
          min-h-[38px]
          items-start
          justify-center
        "
      >
        <p
          className="
            max-w-[100px]
            text-center
            text-[12px]
            font-bold
            leading-[16px]
            text-slate-500
          "
        >
          {label}
        </p>
      </div>
    </div>
  );
}

function TopicChip({ children, primary, secondary, light = false }) {
  if (light) {
    return (
      <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm">
        {children}
      </span>
    );
  }

  return (
    <span
      className="rounded-full border px-4 py-2.5 text-sm font-bold shadow-sm"
      style={{
        color: primary,
        backgroundColor: `${secondary}0E`,
        borderColor: `${secondary}20`,
      }}
    >
      {children}
    </span>
  );
}

function ContactItem({ label, value, href, primary, secondary }) {
  if (!value || !href) {
    return null;
  }

  return (
    <motion.a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className="group flex min-w-0 items-center gap-4 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 transition hover:bg-white hover:shadow-lg"
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ color: primary, backgroundColor: `${secondary}14` }}
      >
        <LinkIcon />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-400">
          {label}
        </p>
        <p
          className="mt-1 truncate text-sm font-extrabold md:text-[15px]"
          style={{ color: primary }}
        >
          {value}
        </p>
      </div>

      <span
        className="text-lg font-black transition group-hover:translate-x-0.5"
        style={{ color: secondary }}
      >
        ↗
      </span>
    </motion.a>
  );
}

/* =====================================================
   PUBLIC PROFILE
===================================================== */

export default function PublicProfileView({ member, theme, onClose }) {
  const primary = theme?.primary || "#0B2447";
  const secondary = theme?.secondary || "#38A169";

  const memberRecordId = cleanText(member?.profileMemberId);

  /* =====================================================
     LIVE SUBMISSION COUNT
  ===================================================== */

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);



  useEffect(() => {
    if (!memberRecordId) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadLiveSubmissionCount() {
      try {
        const response = await fetch(
          `${API_BASE}/api/profile-contribution-count/${encodeURIComponent(memberRecordId)}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const result = await response.json();

        if (!response.ok || result?.success !== true) {
          throw new Error(result?.error || "Could not load submission count.");
        }

   
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Live submission count error:", error);
      }
    }

    loadLiveSubmissionCount();

    return () => controller.abort();
  }, [memberRecordId]);

  /* =====================================================
   PUBLIC PROFILE INTERESTS
===================================================== */

  const [publicInterests, setPublicInterests] = useState({
    interestTags: "",
    interestBuckets: "",
  });

  useEffect(() => {
    if (!memberRecordId) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadPublicInterests() {
      try {
        const response = await fetch(
          `${API_BASE}/api/public-profile-interests/${encodeURIComponent(
            memberRecordId,
          )}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const result = await response.json();

        if (!response.ok || result?.success !== true) {
          throw new Error(result?.error || "Could not load public interests.");
        }

        if (!controller.signal.aborted) {
          setPublicInterests({
            interestTags: result?.interestTags || "",
            interestBuckets: result?.interestBuckets || "",
          });
        }
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Public interests error:", error);

        if (!controller.signal.aborted) {
          setPublicInterests({
            interestTags: "",
            interestBuckets: "",
          });
        }
      }
    }

    loadPublicInterests();

    return () => controller.abort();
  }, [memberRecordId]);

  /* =====================================================
     PUBLIC PROFILE API STATE
  ===================================================== */

  const [publicProfileState, setPublicProfileState] = useState({
    loadedMemberId: "",
    profile: null,
    contributions: [],
    contributionsError: "",
    error: "",
  });

  const profileLoading =
    Boolean(memberRecordId) &&
    publicProfileState.loadedMemberId !== memberRecordId;

  useEffect(() => {
    if (!memberRecordId) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadPublicProfile() {
      try {
        const response = await fetch(
          `${API_BASE}/api/public-profile/${encodeURIComponent(memberRecordId)}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const result = await response.json();

        if (controller.signal.aborted) {
          return;
        }

        if (!response.ok || result?.success !== true) {
          setPublicProfileState({
            loadedMemberId: memberRecordId,
            profile: null,
            contributions: [],
            contributionsError: "",
            error: result?.error || "Could not load public profile.",
          });

          return;
        }

        setPublicProfileState({
          loadedMemberId: memberRecordId,
          profile: result?.profile || null,
          contributions: Array.isArray(result?.contributions)
            ? result.contributions
            : [],
          contributionsError: String(result?.contributionsError || ""),
          error: "",
        });
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Public profile load error:", error);

        if (!controller.signal.aborted) {
          setPublicProfileState({
            loadedMemberId: memberRecordId,
            profile: null,
            contributions: [],
            contributionsError: "",
            error: "Public profile is temporarily unavailable.",
          });
        }
      }
    }

    void loadPublicProfile();

    return () => controller.abort();
  }, [memberRecordId]);

  /* =====================================================
     PROFILE DATA
  ===================================================== */

  const profile =
    publicProfileState.loadedMemberId === memberRecordId &&
    publicProfileState.profile
      ? publicProfileState.profile
      : member;

  const fullName = getDisplayName(profile);
  const firstName =
    cleanText(profile?.firstName) || fullName.split(" ")[0] || "Member";
  const photo = cleanText(profile?.profilePhoto);
  const role = cleanText(profile?.role);
  const business = cleanText(profile?.businessOrganization);
  const status = cleanText(profile?.profileStatus);
  const bio = cleanText(profile?.profileBio);
  const bridgeSummary = cleanText(profile?.aiProfileSummary);
  const creatorLevel = cleanText(profile?.creatorLevel);
  const memberSince = formatMemberSince(profile?.creationDate);
  const profileStrength = Number(profile?.profileStrength) || 0;

  const promoteMePersonally = profile?.promoteMePersonally !== false;
  const promoteBusiness = profile?.promoteMyBusinessOrganization !== false;

  const location = [cleanText(profile?.city), cleanText(profile?.state)]
    .filter(Boolean)
    .join(", ");

  const expertise = useMemo(
    () => splitList(profile?.expertise).slice(0, 18),
    [profile?.expertise],
  );

  const interests = useMemo(() => {
    const combined = [
      ...splitList(publicInterests.interestTags),
      ...splitList(publicInterests.interestBuckets),
    ];

    return [...new Set(combined)].slice(0, 18);
  }, [publicInterests.interestTags, publicInterests.interestBuckets]);

  const affiliations = useMemo(
    () => splitList(profile?.additionalAffiliations).slice(0, 12),
    [profile?.additionalAffiliations],
  );

  const openToOpportunities = profile?.openToOpportunities === true;

  const opportunityTypes = useMemo(
    () => splitList(profile?.opportunityTypes).slice(0, 12),
    [profile?.opportunityTypes],
  );

  /* =====================================================
     CONTACT
  ===================================================== */

  const email = cleanText(profile?.email);
  const phone = cleanText(profile?.phone);
  const website = cleanText(profile?.website);
const websiteUrl = promoteBusiness ? cleanExternalUrl(website) : "";

  const socialLinks = useMemo(
    () => parseSocialLinks(profile?.socialLinks),
    [profile?.socialLinks],
  );

  const hasContact =
    Boolean(email) ||
    Boolean(phone) ||
    Boolean(websiteUrl) ||
    socialLinks.length > 0;

  /* =====================================================
     FOLLOWERS / FOLLOWING
  ===================================================== */

  const [socialSummary, setSocialSummary] = useState({
    loadedMemberId: "",
    followersCount: 0,
    followingCount: 0,
  });

  const socialLoading =
    Boolean(memberRecordId) && socialSummary.loadedMemberId !== memberRecordId;

  useEffect(() => {
    if (!memberRecordId) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadSocial() {
      try {
        const response = await fetch(`${API_BASE}/api/profile/social-summary`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberRecordId,
          }),
          signal: controller.signal,
        });

        const result = await response.json();

        if (controller.signal.aborted) {
          return;
        }

        setSocialSummary({
          loadedMemberId: memberRecordId,
          followersCount:
            response.ok && result?.success
              ? Number(result?.followersCount) || 0
              : 0,
          followingCount:
            response.ok && result?.success
              ? Number(result?.followingCount) || 0
              : 0,
        });
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Public profile social error:", error);

        if (!controller.signal.aborted) {
          setSocialSummary({
            loadedMemberId: memberRecordId,
            followersCount: 0,
            followingCount: 0,
          });
        }
      }
    }

    void loadSocial();

    return () => controller.abort();
  }, [memberRecordId]);

  /* =====================================================
     CONTRIBUTIONS
  ===================================================== */

 const contributions =
   publicProfileState.loadedMemberId === memberRecordId
     ? [...publicProfileState.contributions]
         .filter((item) => {
           return Boolean(
             cleanText(item?.title) ||
             cleanText(item?.originalTitle) ||
             cleanText(item?.Title) ||
             cleanText(item?.["Submission Title"]) ||
             cleanText(item?.bridgePublishedLink) ||
             cleanText(item?.["Bridge Published Link"]) ||
             cleanText(item?.publishedLink) ||
             cleanText(item?.link) ||
             cleanText(item?.url),
           );
         })
         .sort((a, b) => {
           const aDate = new Date(
             a?.submittedDate || a?.["Submitted Date"] || "",
           ).getTime();

           const bDate = new Date(
             b?.submittedDate || b?.["Submitted Date"] || "",
           ).getTime();

           return (
             (Number.isNaN(bDate) ? 0 : bDate) -
             (Number.isNaN(aDate) ? 0 : aDate)
           );
         })
         .slice(0, 10)
     : [];

  const contributionsError =
    publicProfileState.loadedMemberId === memberRecordId
      ? publicProfileState.contributionsError
      : "";

 const sharedCount = contributions.length;

  /* =====================================================
     LOADING
  ===================================================== */

  if (profileLoading) {
    return (
      <div className="fixed inset-0 z-[25000] flex items-center justify-center bg-[#F3F7F5] p-5">
        <div className="w-full max-w-sm rounded-[30px] border border-white bg-white p-9 text-center shadow-2xl">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="mx-auto h-11 w-11 rounded-full border-[4px] border-slate-100 border-t-emerald-500"
          />
          <p className="mt-5 text-base font-black text-[#0B2447]">
            Loading profile…
          </p>
        </div>
      </div>
    );
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="fixed inset-0 z-[25000] overflow-y-auto bg-white/90 px-4 pt-6 pb-10 backdrop-blur-sm md:px-7 md:pt-8 xl:px-10 xl:pt-10">
      {/* TOP TOOLBAR */}
      <div className="border-b border-slate-200/70 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] w-full max-w-[1500px] items-center justify-between gap-4 px-4 py-3 md:px-7 xl:px-10">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <ArrowLeftIcon />
            <span className="hidden sm:inline">Back to Directory</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div
            className="text-[28px] font-black tracking-[-0.055em] md:text-[32px]"
            style={{ color: primary }}
          >
            Bridge<span style={{ color: secondary }}>AZ</span>
          </div>

          <div
            className="hidden h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-extrabold md:flex"
            style={{
              color: primary,
              borderColor: `${secondary}20`,
              backgroundColor: `${secondary}0E`,
            }}
          >
            <GlobeIcon />
            Public Bridge Profile
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 md:px-7 md:py-8 xl:px-10 xl:py-10">
        {publicProfileState.error && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800">
            {publicProfileState.error}
          </div>
        )}

        {/* HERO */}
        <section className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,.09)]">
          <div
            className="absolute inset-x-0 top-0 h-1.5"
            style={{
              background: `linear-gradient(90deg, ${secondary}, ${primary}, ${secondary})`,
            }}
          />

          <div
            className="absolute -right-24 -top-24 h-80 w-80 rounded-full blur-3xl"
            style={{ backgroundColor: `${secondary}10` }}
          />
          <div
            className="absolute -bottom-36 left-1/3 h-80 w-80 rounded-full blur-3xl"
            style={{ backgroundColor: `${primary}08` }}
          />

          <div className="relative z-10 grid gap-8 p-6 md:p-8 xl:grid-cols-[210px_minmax(0,1.2fr)_minmax(460px,.8fr)] xl:items-center xl:p-10">
            {/* PHOTO */}
            <div className="relative mx-auto xl:mx-0">
              <div
                className="flex h-[180px] w-[180px] items-center justify-center overflow-hidden rounded-[34px] border-[7px] border-white text-5xl font-black text-white shadow-[0_22px_60px_rgba(15,23,42,.18)]"
                style={{
                  background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                }}
              >
                {photo ? (
                  <img
                    src={photo}
                    alt={fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitials(fullName)
                )}
              </div>

              <span className="absolute bottom-2 right-2 h-6 w-6 rounded-full border-4 border-white bg-emerald-500 shadow" />
            </div>

            {/* IDENTITY */}
            <div className="min-w-0 text-center xl:text-left">
              <p
                className="text-sm font-extrabold uppercase tracking-[0.16em]"
                style={{ color: secondary }}
              >
                Bridge Member
              </p>

              <h1
                className="mt-3 text-4xl font-black leading-[.98] tracking-[-0.06em] sm:text-5xl md:text-6xl"
                style={{ color: primary }}
              >
                {fullName}
              </h1>

              {promoteBusiness && business && (
                <p className="mt-5 text-xl font-extrabold text-slate-800">
                  {business}
                </p>
              )}

              {promoteBusiness && role && (
                <p className="mt-2 text-base font-bold text-slate-600 md:text-lg">
                  {role}
                </p>
              )}

              {status && (
                <p className="mx-auto mt-4 max-w-3xl text-[15px] font-medium leading-7 text-slate-500 md:text-base xl:mx-0">
                  {status}
                </p>
              )}

              <div className="mt-6 flex flex-wrap justify-center gap-2.5 xl:justify-start">
                {creatorLevel && (
                  <Pill primary={primary} secondary={secondary}>
                    <UsersIcon />
                    {creatorLevel}
                  </Pill>
                )}

                {location && (
                  <Pill primary={primary} secondary={secondary} tone="slate">
                    ◉ {location}
                  </Pill>
                )}

                {memberSince && (
                  <Pill primary={primary} secondary={secondary} tone="slate">
                    <CalendarIcon />
                    Since {memberSince}
                  </Pill>
                )}

                {openToOpportunities && (
                  <Pill primary={primary} secondary={secondary} tone="green">
                    <BriefcaseIcon />
                    Open to opportunities
                  </Pill>
                )}
              </div>
            </div>

            {/* STATS */}
            <div className="rounded-[30px] border border-slate-200 bg-slate-50/70 p-5 md:p-6">
              <StrengthRing
                value={profileStrength}
                primary={primary}
                secondary={secondary}
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                <MetricCard
                  icon={<UsersIcon />}
                  value={socialLoading ? "…" : socialSummary.followersCount}
                  label="Followers"
                  primary={primary}
                  secondary={secondary}
                />

                <MetricCard
                  icon={<UserPlusIcon />}
                  value={socialLoading ? "…" : socialSummary.followingCount}
                  label="Following"
                  primary={primary}
                  secondary={secondary}
                />

                <MetricCard
                  icon={<DocumentIcon />}
                  value={sharedCount}
                  label="Shared Through Bridge"
                  primary={primary}
                  secondary={secondary}
                />
              </div>
            </div>
          </div>
        </section>

        {/* MODULAR / BENTO GRID */}
        <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* EXPERTISE */}
          {promoteBusiness && expertise.length > 0 && (
            <Surface className="p-6 md:p-7 xl:col-span-12 ">
              <SectionTitle
                icon={<SparkIcon />}
                eyebrow="Expertise"
                title={`Ask ${firstName} about`}
                description="Quick topics that make it easy to understand this member's experience and strengths."
                primary={primary}
                secondary={secondary}
              />

              <div className="mt-6 flex flex-wrap gap-2.5">
                {expertise.map((item, index) => (
                  <TopicChip
                    key={`${item}-${index}`}
                    primary={primary}
                    secondary={secondary}
                  >
                    {item}
                  </TopicChip>
                ))}
              </div>
            </Surface>
          )}

          {/* OPPORTUNITIES */}
          {openToOpportunities && opportunityTypes.length > 0 && (
            <div
              className="relative overflow-hidden rounded-[30px] p-6 text-white shadow-[0_22px_65px_rgba(15,23,42,.16)] md:p-7 xl:col-span-12"
              style={{
                background: `linear-gradient(135deg, ${primary}, ${secondary})`,
              }}
            >
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

              <div className="relative z-10">
                <SectionTitle
                  icon={<BriefcaseIcon />}
                  eyebrow="Opportunities"
                  title={`What ${firstName} is open to`}
                  description="Ways this member is currently open to connecting and collaborating."
                  primary={primary}
                  secondary={secondary}
                  light
                />

                <div className="mt-6 flex flex-wrap gap-2.5">
                  {opportunityTypes.map((item, index) => (
                    <TopicChip
                      key={`${item}-${index}`}
                      primary={primary}
                      secondary={secondary}
                      light
                    >
                      {item}
                    </TopicChip>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABOUT */}
          {promoteMePersonally && (
            <Surface className="p-6 md:p-7 xl:col-span-12">
              <SectionTitle
                icon={<DocumentIcon />}
                eyebrow={`About ${firstName}`}
                title={`Meet ${firstName}`}
                primary={primary}
                secondary={secondary}
              />

              {bio ? (
                <p className="mt-6 whitespace-pre-wrap text-[15px] font-medium leading-8 text-slate-600 md:text-base">
                  {bio}
                </p>
              ) : (
                <p className="mt-6 text-[15px] text-slate-400">
                  No About section added yet.
                </p>
              )}

              {interests.length > 0 && (
                <div className="mt-6">
                  <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                    Interests
                  </p>

                  <div className="flex flex-wrap gap-2.5">
                    {interests.map((item, index) => (
                      <TopicChip
                        key={`${item}-${index}`}
                        primary={primary}
                        secondary={secondary}
                      >
                        {item}
                      </TopicChip>
                    ))}
                  </div>
                </div>
              )}
            </Surface>
          )}

          {/* BRIDGE SUMMARY */}
          <div
            className="relative overflow-hidden rounded-[30px] p-6 text-white shadow-[0_22px_65px_rgba(15,23,42,.18)] md:p-7 xl:col-span-12"
            style={{
              background: `linear-gradient(145deg, ${primary}, ${primary} 64%, ${secondary})`,
            }}
          >
            <div className="absolute -bottom-28 -right-16 h-80 w-80 rounded-full border-[32px] border-white/5" />
            <div className="absolute right-1/4 top-0 h-40 w-40 rounded-full bg-white/5 blur-3xl" />

            <div className="relative z-10">
              <SectionTitle
                icon={<SparkIcon />}
                eyebrow="Bridge Summary"
                title="Get to know the person behind the profile."
                primary={primary}
                secondary={secondary}
                light
              />

              {bridgeSummary ? (
                <p className="mt-6 whitespace-pre-wrap text-[15px] font-medium leading-8 text-white/86 md:text-base">
                  {bridgeSummary}
                </p>
              ) : (
                <p className="mt-6 text-[15px] leading-7 text-white/65">
                  Bridge will build this summary as the member participates.
                </p>
              )}
            </div>
          </div>

          {/* AFFILIATIONS */}
          {promoteBusiness && affiliations.length > 0 && (
            <Surface className="p-6 md:p-7 xl:col-span-4">
              <SectionTitle
                icon={<BuildingIcon />}
                eyebrow="Affiliations"
                title="Connected organizations"
                primary={primary}
                secondary={secondary}
              />

              <div className="mt-6 space-y-3">
                {affiliations.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-4"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        color: primary,
                        backgroundColor: `${secondary}12`,
                      }}
                    >
                      <BuildingIcon />
                    </div>
                    <p className="text-sm font-extrabold text-slate-700 md:text-[15px]">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </Surface>
          )}

          {/* CONTACT */}
          {hasContact && (
            <Surface
              className={`p-6 md:p-7 ${affiliations.length > 0 ? "xl:col-span-8" : "xl:col-span-12"}`}
            >
              <SectionTitle
                icon={<LinkIcon />}
                eyebrow="Connect"
                title="Public contact information"
                description="Use the public contact details this member has chosen to share."
                primary={primary}
                secondary={secondary}
              />

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {websiteUrl && (
                  <ContactItem
                    label="Website"
                    value={getHostnameLabel(websiteUrl)}
                    href={websiteUrl}
                    primary={primary}
                    secondary={secondary}
                  />
                )}

                {email && (
                  <ContactItem
                    label="Email"
                    value={email}
                    href={`mailto:${email}`}
                    primary={primary}
                    secondary={secondary}
                  />
                )}

                {phone && (
                  <ContactItem
                    label="Phone"
                    value={phone}
                    href={`tel:${phone}`}
                    primary={primary}
                    secondary={secondary}
                  />
                )}

                {socialLinks.map((item, index) => (
                  <ContactItem
                    key={`${item.url}-${index}`}
                    label={getSocialLabel(item)}
                    value={item.label}
                    href={item.url}
                    primary={primary}
                    secondary={secondary}
                  />
                ))}
              </div>
            </Surface>
          )}

          {/* SHARED THROUGH BRIDGE */}
          <Surface className="p-6 md:p-7 xl:col-span-12">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <SectionTitle
                icon={<DocumentIcon />}
                eyebrow="Shared Through Bridge"
                title={`Shared by ${firstName}`}
                description={`The latest public Bridge contributions from ${firstName}.`}
                primary={primary}
                secondary={secondary}
              />

              <div
                className="w-fit rounded-full border px-4 py-2.5 text-sm font-extrabold"
                style={{
                  color: primary,
                  backgroundColor: `${secondary}10`,
                  borderColor: `${secondary}22`,
                }}
              >
                {sharedCount}{" "}
                {sharedCount === 1 ? "Contribution" : "Contributions"}
              </div>
            </div>

            {contributions.length > 0 ? (
              <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
                {contributions.map((item, index) => {
                  const title = getContributionTitle(item);
                  const link = getContributionLink(item);
                  const date = formatContributionDate(
                    getContributionDate(item),
                  );

                  return (
                    <div
                      key={`${link || title}-${index}`}
                      className={`group flex flex-col gap-4 bg-white px-5 py-5 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between md:px-6 ${
                        index !== contributions.length - 1
                          ? "border-b border-slate-100"
                          : ""
                      }`}
                    >
                      <div className="flex min-w-0 items-start gap-4">
                        <div
                          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                          style={{
                            color: primary,
                            backgroundColor: `${secondary}12`,
                          }}
                        >
                          <DocumentIcon />
                        </div>

                        <div className="min-w-0">
                          <p
                            className="text-base font-black leading-6 md:text-lg"
                            style={{ color: primary }}
                          >
                            {title}
                          </p>

                          {date && (
                            <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-400">
                              <CalendarIcon />
                              {date}
                            </p>
                          )}
                        </div>
                      </div>

                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-black transition hover:bg-white"
                          style={{ color: secondary }}
                        >
                          View ↗
                        </a>
                      ) : (
                        <span className="shrink-0 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-300">
                          Shared via Bridge
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] bg-slate-50 px-5 py-5">
                {contributionsError ? (
                  <>
                    <p className="text-sm font-black text-amber-800">
                      Contributions couldn't be loaded.
                    </p>
                    <p className="mt-1 text-sm text-amber-700">
                      {contributionsError}
                    </p>
                  </>
                ) : sharedCount > 0 ? (
                  <p className="text-sm font-bold" style={{ color: primary }}>
                    {firstName} has shared {sharedCount}{" "}
                    {sharedCount === 1 ? "contribution" : "contributions"}{" "}
                    through Bridge.
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">
                    No public Bridge contributions are available yet.
                  </p>
                )}
              </div>
            )}
          </Surface>
        </div>
      </main>
    </div>
  );
}
