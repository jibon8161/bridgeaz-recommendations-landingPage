import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { motion, useScroll, useSpring, useTransform } from "framer-motion";

import FloatingScene from "./FloatingScene";
import ProfileWeather from "./ProfileWeather";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://bridgeaz-recommendations-server.vercel.app";

/* =======================================================
   HELPERS
======================================================= */

function getInitials(name) {
  if (!name) return "M";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatMemberSince(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatContributionDate(value) {
  if (!value) return "";

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

function splitTags(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitList(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanExternalUrl(value) {
  if (!value) return "";

  const text = String(value).trim();

  if (!text) return "";

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
    return "Visit link";
  }
}

function parseSocialLinks(value) {
  if (!value) return [];

  const lines = Array.isArray(value) ? value : String(value).split(/\n|;/);

  return lines
    .map((item) => String(item).trim())
    .filter(Boolean)
    .map((line) => {
      const urlMatch = line.match(/https?:\/\/[^\s]+/i);

      if (!urlMatch) {
        const fallbackUrl = cleanExternalUrl(line);

        return {
          label: fallbackUrl ? getHostnameLabel(fallbackUrl) : line,
          url: fallbackUrl,
        };
      }

      const rawUrl = urlMatch[0];

      const url = rawUrl.replace(/[),.;]+$/, "");

      const beforeUrl = line
        .slice(0, urlMatch.index)
        .replace(/[:\-–—]+$/, "")
        .trim();

      return {
        label: beforeUrl || getHostnameLabel(url),
        url,
      };
    });
}

function getSocialInfo(item) {
  const value = `${item?.label || ""} ${item?.url || ""}`.toLowerCase();

  if (value.includes("linkedin")) {
    return {
      name: "LinkedIn",
      icon: "in",
    };
  }

  if (value.includes("facebook")) {
    return {
      name: "Facebook",
      icon: "f",
    };
  }

  if (value.includes("instagram")) {
    return {
      name: "Instagram",
      icon: "◎",
    };
  }

  if (value.includes("youtube") || value.includes("youtu.be")) {
    return {
      name: "YouTube",
      icon: "▶",
    };
  }

  if (value.includes("twitter") || value.includes("x.com")) {
    return {
      name: "X",
      icon: "𝕏",
    };
  }

  if (value.includes("tiktok")) {
    return {
      name: "TikTok",
      icon: "♪",
    };
  }

  return {
    name: item?.label || "Social",
    icon: "↗",
  };
}

function cleanContributionLink(value) {
  if (!value) return "";

  const text = String(value).trim();

  const markdownLink = text.match(
    /^\[(https?:\/\/[^\]]+)\]\((https?:\/\/[^)]+)\)$/,
  );

  if (markdownLink) {
    return markdownLink[2];
  }

  if (/^https?:\/\//i.test(text)) {
    return text;
  }

  return "";
}

function getContributionCategory(item) {
  const value = [item?.submissionType, item?.title, item?.originalTitle]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (value.includes("event") || value.includes("activity")) {
    return "Events";
  }

  if (
    value.includes("class") ||
    value.includes("workshop") ||
    value.includes("course")
  ) {
    return "Classes & Workshops";
  }

  if (value.includes("book") || value.includes("ebook")) {
    return "Books";
  }

  if (value.includes("opportunity") || value.includes("program")) {
    return "Opportunities";
  }

  if (
    value.includes("resource") ||
    value.includes("tip") ||
    value.includes("guide") ||
    value.includes("pdf") ||
    value.includes("video") ||
    value.includes("link")
  ) {
    return "Resources";
  }

  if (
    value.includes("article") ||
    value.includes("story") ||
    value.includes("news")
  ) {
    return "Articles";
  }

  return "Contributions";
}

function getCategoryIcon(category) {
  switch (category) {
    case "Articles":
      return "✎";

    case "Events":
      return "◷";

    case "Resources":
      return "◇";

    case "Classes & Workshops":
      return "▣";

    case "Books":
      return "▤";

    case "Opportunities":
      return "↗";

    default:
      return "✦";
  }
}

function sortContributionDate(item) {
  const value = item?.submittedDate || item?.startDate || "";

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

/* =======================================================
   REVEAL ANIMATION
======================================================= */

function Reveal({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 32,
        scale: 0.985,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      viewport={{
        once: true,
        amount: 0.08,
      }}
      transition={{
        duration: 0.65,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* =======================================================
   EYEBROW
======================================================= */

function Eyebrow({ children, secondary, light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <motion.span
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          repeat: Infinity,
          duration: 2.4,
        }}
        className="h-2 w-2 rounded-full"
        style={{
          backgroundColor: light ? "#ffffff" : secondary,

          boxShadow: light
            ? "0 0 18px rgba(255,255,255,.65)"
            : `0 0 18px ${secondary}`,
        }}
      />

      <p
        className="
          text-[10px]
          font-black
          uppercase
          tracking-[0.24em]
        "
        style={{
          color: light ? "rgba(255,255,255,.65)" : secondary,
        }}
      >
        {children}
      </p>
    </div>
  );
}

/* =======================================================
   GLASS CARD
======================================================= */

function GlassCard({ children, className = "" }) {
  return (
    <motion.div
      whileHover={{
        y: -4,
      }}
      transition={{
        duration: 0.25,
      }}
      className={`
        relative
        overflow-hidden
        rounded-[34px]
        border
        border-white/80
        bg-white/75
        shadow-[0_24px_80px_rgba(15,23,42,0.08)]
        backdrop-blur-3xl
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}

/* =======================================================
   PREMIUM PROFILE PHOTO
======================================================= */

function PremiumAvatar({ profilePhoto, fullName, primary, secondary }) {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState("");

  const showImage = Boolean(profilePhoto) && failedPhotoUrl !== profilePhoto;

  return (
    <div
      className="
        relative
        mx-auto
        h-[270px]
        w-[270px]
        lg:mx-0
      "
    >
      {/* OUTER ORBIT */}

      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          repeat: Infinity,
          duration: 28,
          ease: "linear",
        }}
        className="
          absolute
          inset-0
          rounded-full
          border
          border-dashed
        "
        style={{
          borderColor: `${secondary}55`,
        }}
      >
        <motion.span
          animate={{
            scale: [1, 1.4, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
          }}
          className="
            absolute
            left-1/2
            top-[-7px]
            h-4
            w-4
            -translate-x-1/2
            rounded-full
            border-[3px]
            border-white
          "
          style={{
            backgroundColor: secondary,
            boxShadow: `0 0 24px ${secondary}`,
          }}
        />
      </motion.div>

      {/* INNER ORBIT */}

      <motion.div
        animate={{
          rotate: -360,
        }}
        transition={{
          repeat: Infinity,
          duration: 42,
          ease: "linear",
        }}
        className="
          absolute
          inset-[18px]
          rounded-full
          border
        "
        style={{
          borderColor: `${primary}24`,
        }}
      >
        <span
          className="
            absolute
            bottom-3
            left-6
            h-2.5
            w-2.5
            rounded-full
          "
          style={{
            backgroundColor: primary,
          }}
        />
      </motion.div>

      {/* GLOW */}

      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.45, 0.75, 0.45],
        }}
        transition={{
          repeat: Infinity,
          duration: 4,
        }}
        className="
          absolute
          inset-[50px]
          rounded-[52px]
          blur-[35px]
        "
        style={{
          background: `linear-gradient(
            135deg,
            ${primary},
            ${secondary}
          )`,
        }}
      />

      {/* IMAGE */}

      <motion.div
        initial={{
          opacity: 0,
          scale: 0.72,
          rotate: -8,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          rotate: 0,
        }}
        transition={{
          type: "spring",
          stiffness: 180,
          damping: 20,
        }}
        className="
          absolute
          inset-[38px]
          overflow-hidden
          rounded-[46px]
          border-[7px]
          border-white
          bg-white
          shadow-[0_35px_90px_rgba(7,26,74,0.30)]
        "
      >
        {showImage ? (
          <img
            key={profilePhoto}
            src={profilePhoto}
            alt={fullName}
            onError={() => setFailedPhotoUrl(profilePhoto)}
            className="
              h-full
              w-full
              object-cover
            "
          />
        ) : (
          <div
            className="
              flex
              h-full
              w-full
              items-center
              justify-center
              text-5xl
              font-black
              text-white
            "
            style={{
              background: `linear-gradient(
                135deg,
                ${primary},
                ${secondary}
              )`,
            }}
          >
            {getInitials(fullName)}
          </div>
        )}
      </motion.div>

      {/* FLOATING LABEL */}

      <motion.div
        animate={{
          y: [0, -7, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 3.6,
          ease: "easeInOut",
        }}
        className="
          absolute
          bottom-1
          left-1/2
          -translate-x-1/2
          whitespace-nowrap
          rounded-full
          border
          border-white
          bg-white/90
          px-5
          py-2.5
          text-[9px]
          font-black
          uppercase
          tracking-[0.2em]
          shadow-[0_12px_35px_rgba(15,23,42,.14)]
          backdrop-blur-xl
        "
        style={{
          color: primary,
        }}
      >
        Bridge Profile
      </motion.div>
    </div>
  );
}

/* =======================================================
   PROFILE STRENGTH
======================================================= */

function StrengthRing({ value, primary, secondary }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div
      className="
        relative
        mx-auto
        h-[150px]
        w-[150px]
      "
    >
      <motion.div
        initial={{
          rotate: -160,
          opacity: 0,
        }}
        animate={{
          rotate: 0,
          opacity: 1,
        }}
        transition={{
          duration: 1.1,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="
          absolute
          inset-0
          rounded-full
          p-[9px]
        "
        style={{
          background: `conic-gradient(
            ${secondary} 0 ${safeValue}%,
            ${primary}18 ${safeValue}% 100%
          )`,
        }}
      >
        <div
          className="
            flex
            h-full
            w-full
            items-center
            justify-center
            rounded-full
            bg-white/95
            shadow-inner
          "
        >
          <div className="text-center">
            <motion.p
              key={safeValue}
              initial={{
                scale: 0.7,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              className="
                text-4xl
                font-black
                tracking-[-0.06em]
              "
              style={{
                color: primary,
              }}
            >
              {safeValue}
            </motion.p>

            <p
              className="
                mt-1
                text-[8px]
                font-black
                uppercase
                tracking-[0.18em]
                text-slate-400
              "
            >
              Profile Strength
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          repeat: Infinity,
          duration: 12,
          ease: "linear",
        }}
        className="
          absolute
          inset-[-7px]
          rounded-full
          border
          border-dashed
        "
        style={{
          borderColor: `${secondary}30`,
        }}
      />
    </div>
  );
}

/* =======================================================
   MINI STAT
======================================================= */

function MiniStat({ value, label, primary, secondary }) {
  return (
    <motion.div
      whileHover={{
        y: -5,
        scale: 1.02,
      }}
      className="
        relative
        overflow-hidden
        rounded-[24px]
        border
        border-white
        bg-white/85
        p-4
        shadow-[0_15px_40px_rgba(15,23,42,.07)]
        backdrop-blur-xl
      "
    >
      <div
        className="
          absolute
          inset-x-0
          top-0
          h-[3px]
        "
        style={{
          background: `linear-gradient(
            90deg,
            ${primary},
            ${secondary}
          )`,
        }}
      />

      <p
        className="
          text-3xl
          font-black
          tracking-[-0.05em]
        "
        style={{
          color: primary,
        }}
      >
        {value}
      </p>

      <p
        className="
          mt-1
          text-[9px]
          font-black
          uppercase
          tracking-[0.15em]
          text-slate-400
        "
      >
        {label}
      </p>
    </motion.div>
  );
}

/* =======================================================
   CONTACT CARD
======================================================= */

function ContactCard({ label, value, href, icon, primary, secondary }) {
  if (!value) return null;

  const card = (
    <motion.div
      whileHover={{
        y: -4,
        x: 3,
      }}
      whileTap={{
        scale: 0.99,
      }}
      className="
        group
        relative
        flex
        min-w-0
        items-center
        gap-4
        overflow-hidden
        rounded-[22px]
        border
        border-slate-100
        bg-white/85
        p-4
        shadow-sm
        transition
        hover:border-blue-100
        hover:shadow-[0_16px_40px_rgba(15,23,42,.09)]
      "
    >
      <div
        className="
          pointer-events-none
          absolute
          -left-12
          -top-12
          h-24
          w-24
          rounded-full
          opacity-0
          blur-2xl
          transition-opacity
          group-hover:opacity-100
        "
        style={{
          backgroundColor: `${secondary}25`,
        }}
      />

      <div
        className="
          relative
          z-10
          flex
          h-12
          w-12
          shrink-0
          items-center
          justify-center
          rounded-[16px]
          text-sm
          font-black
          text-white
          shadow-lg
        "
        style={{
          background: `linear-gradient(
            135deg,
            ${primary},
            ${secondary}
          )`,
        }}
      >
        {icon}
      </div>

      <div className="relative z-10 min-w-0 flex-1">
        <p
          className="
            text-[9px]
            font-black
            uppercase
            tracking-[0.15em]
            text-slate-400
          "
        >
          {label}
        </p>

        <p
          className="
            mt-1
            truncate
            text-sm
            font-black
          "
          style={{
            color: primary,
          }}
        >
          {value}
        </p>
      </div>

      {href && (
        <span
          className="
            relative
            z-10
            text-lg
            text-slate-300
            transition
            group-hover:translate-x-1
          "
        >
          ↗
        </span>
      )}
    </motion.div>
  );

  if (!href) {
    return card;
  }

  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
    >
      {card}
    </a>
  );
}

/* =======================================================
   CONTRIBUTION CARD
======================================================= */

function ContributionCard({ contribution, primary, secondary, index }) {
  const category = getContributionCategory(contribution);

  const icon = getCategoryIcon(category);

  const title =
    contribution?.title || contribution?.originalTitle || "Bridge Contribution";

  const description = contribution?.summary || contribution?.description || "";

  const link = cleanContributionLink(contribution?.link);

  const displayDate =
    category === "Events"
      ? contribution?.startDate || contribution?.submittedDate
      : contribution?.submittedDate;

  const formattedDate = formatContributionDate(displayDate);

  return (
    <motion.article
      initial={{
        opacity: 0,
        x: -26,
        y: 18,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.08,
      }}
      transition={{
        delay: Math.min(index * 0.04, 0.25),
        duration: 0.55,
      }}
      whileHover={{
        y: -3,
      }}
      className="
        group
        relative
        grid
        gap-5
        overflow-hidden
        rounded-[30px]
        border
        border-slate-100
        bg-white/72
        p-5
        shadow-[0_12px_40px_rgba(15,23,42,.045)]
        backdrop-blur-xl
        transition
        hover:border-blue-100
        hover:bg-white
        hover:shadow-[0_22px_65px_rgba(15,23,42,.08)]
        md:grid-cols-[64px_minmax(0,1fr)_auto]
        md:p-6
      "
    >
      <div
        className="
          pointer-events-none
          absolute
          -right-20
          -top-20
          h-40
          w-40
          rounded-full
          opacity-0
          blur-3xl
          transition
          duration-500
          group-hover:opacity-100
        "
        style={{
          backgroundColor: `${secondary}12`,
        }}
      />

      <motion.div
        whileHover={{
          rotate: 8,
          scale: 1.08,
        }}
        className="
          relative
          z-10
          flex
          h-14
          w-14
          items-center
          justify-center
          rounded-[18px]
          border
          border-white
          bg-white
          text-xl
          font-black
          shadow-[0_12px_30px_rgba(15,23,42,.08)]
        "
        style={{
          color: primary,
        }}
      >
        {icon}
      </motion.div>

      <div className="relative z-10 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="
              rounded-full
              px-3
              py-1.5
              text-[9px]
              font-black
              uppercase
              tracking-[0.16em]
            "
            style={{
              color: primary,
              backgroundColor: `${secondary}12`,
            }}
          >
            {category}
          </span>

          {formattedDate && (
            <span className="text-xs font-bold text-slate-400">
              {formattedDate}
            </span>
          )}

          {contribution?.location && (
            <span className="text-xs font-bold text-slate-400">
              ◉ {contribution.location}
            </span>
          )}
        </div>

        <h3
          className="
            mt-3
            text-xl
            font-black
            leading-tight
            tracking-[-0.03em]
            md:text-2xl
          "
          style={{
            color: primary,
          }}
        >
          {title}
        </h3>

        {description && (
          <p
            className="
              mt-3
              max-w-4xl
              whitespace-pre-wrap
              text-sm
              font-medium
              leading-7
              text-slate-500
            "
          >
            {description}
          </p>
        )}
      </div>

      <div
        className="
          relative
          z-10
          flex
          items-start
          md:justify-end
        "
      >
        {link ? (
          <motion.a
            whileHover={{
              x: 4,
            }}
            href={link}
            target="_blank"
            rel="noreferrer"
            className="
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-slate-200
              bg-white
              px-4
              py-2.5
              text-xs
              font-black
              shadow-sm
            "
            style={{
              color: primary,
            }}
          >
            View
            <span
              className="
                flex
                h-7
                w-7
                items-center
                justify-center
                rounded-full
                text-white
              "
              style={{
                backgroundColor: secondary,
              }}
            >
              ↗
            </span>
          </motion.a>
        ) : (
          <span
            className="
              rounded-full
              bg-slate-50
              px-4
              py-2
              text-[9px]
              font-black
              uppercase
              tracking-[0.12em]
              text-slate-400
            "
          >
            Shared via Bridge
          </span>
        )}
      </div>
    </motion.article>
  );
}

/* =======================================================
   BRIDGE MESSAGES
======================================================= */

export function BridgeMessages({
  token,
  theme,
  showLauncher = true,
  externalOpen = false,
  onExternalOpenChange,
  onUnreadCountChange,
}) {
  const primary = theme?.primary || "#071A4A";
  const secondary = theme?.secondary || "#3B82F6";

  const [showConnectionsPanel, setShowConnectionsPanel] = useState(false);

  const [connectionInbox, setConnectionInbox] = useState([]);
  const [connectionInboxLoading, setConnectionInboxLoading] = useState(
    Boolean(token),
  );
  const [connectionInboxError, setConnectionInboxError] = useState("");

  const [activeConnectionTab, setActiveConnectionTab] = useState("received");

  const [selectedConnection, setSelectedConnection] = useState(null);

  const [connectionMessages, setConnectionMessages] = useState([]);
  const [connectionMessagesLoading, setConnectionMessagesLoading] =
    useState(false);
  const [connectionMessagesError, setConnectionMessagesError] = useState("");

  const [connectionReply, setConnectionReply] = useState("");
  const [connectionReplySubmitting, setConnectionReplySubmitting] =
    useState(false);
  const [connectionReplySent, setConnectionReplySent] = useState(false);

  const panelOpen = showLauncher ? showConnectionsPanel : externalOpen;

  function setPanelOpen(value) {
    if (showLauncher) {
      setShowConnectionsPanel(value);
    }

    if (typeof onExternalOpenChange === "function") {
      onExternalOpenChange(value);
    }
  }

  /* =====================================================
     LOAD INBOX
  ===================================================== */

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadConnectionInbox() {
      try {
        setConnectionInboxLoading(true);

        const response = await fetch(`${API_BASE}/api/profile/connect/inbox`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberToken: token,
          }),
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.error || "Could not load Bridge connections.",
          );
        }

        if (controller.signal.aborted) {
          return;
        }

        setConnectionInbox(
          Array.isArray(result?.connections) ? result.connections : [],
        );

        setConnectionInboxError("");
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Connection inbox error:", error);

        setConnectionInboxError(
          error?.message || "Connections are temporarily unavailable.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setConnectionInboxLoading(false);
        }
      }
    }

    loadConnectionInbox();

    return () => controller.abort();
  }, [token]);

  /* =====================================================
     LOAD MESSAGES
  ===================================================== */

  useEffect(() => {
    const connectionRecordId = selectedConnection?.connectionRecordId;

    if (!token || !connectionRecordId) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadConnectionMessages() {
      try {
        const response = await fetch(
          `${API_BASE}/api/profile/connect/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              memberToken: token,
              connectionRecordId,
            }),
            signal: controller.signal,
          },
        );

        const result = await response.json();

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.error || "Could not load conversation messages.",
          );
        }

        if (controller.signal.aborted) {
          return;
        }

        setConnectionMessages(
          Array.isArray(result?.messages) ? result.messages : [],
        );

        setConnectionMessagesError("");
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Connection messages error:", error);

        setConnectionMessagesError(
          error?.message || "Conversation is temporarily unavailable.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setConnectionMessagesLoading(false);
        }
      }
    }

    loadConnectionMessages();

    return () => controller.abort();
  }, [token, selectedConnection?.connectionRecordId]);

  /* =====================================================
     MARK READ
  ===================================================== */

  useEffect(() => {
    const connectionRecordId = selectedConnection?.connectionRecordId;

    if (!token || !connectionRecordId || !selectedConnection?.unread) {
      return undefined;
    }

    const controller = new AbortController();

    async function markConnectionRead() {
      try {
        const response = await fetch(`${API_BASE}/api/profile/connect/read`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberToken: token,
            connectionRecordId,
          }),
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.error || "Could not mark conversation as read.",
          );
        }

        if (controller.signal.aborted) {
          return;
        }

        setConnectionInbox((current) =>
          current.map((connection) =>
            connection.connectionRecordId === connectionRecordId
              ? {
                  ...connection,
                  unread: false,
                }
              : connection,
          ),
        );

        setSelectedConnection((current) =>
          current?.connectionRecordId === connectionRecordId
            ? {
                ...current,
                unread: false,
              }
            : current,
        );
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Mark connection read error:", error);
      }
    }

    markConnectionRead();

    return () => controller.abort();
  }, [
    token,
    selectedConnection?.connectionRecordId,
    selectedConnection?.unread,
  ]);

  /* =====================================================
     OPEN CONVERSATION
  ===================================================== */

  function openConnection(connection) {
    setConnectionMessagesLoading(true);
    setConnectionMessages([]);
    setConnectionMessagesError("");
    setConnectionReply("");
    setConnectionReplySent(false);

    setSelectedConnection(connection);
  }

  /* =====================================================
     REPLY
  ===================================================== */

  async function handleConnectionReply(event) {
    event.preventDefault();

    const connectionRecordId = selectedConnection?.connectionRecordId;

    const cleanReply = connectionReply.trim();

    if (
      !token ||
      !connectionRecordId ||
      !cleanReply ||
      connectionReplySubmitting
    ) {
      return;
    }

    try {
      setConnectionReplySubmitting(true);

      const response = await fetch(`${API_BASE}/api/profile/connect/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberToken: token,
          connectionRecordId,
          message: cleanReply,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Could not send reply.");
      }

      setConnectionReply("");
      setConnectionReplySent(true);

      setTimeout(() => {
        setConnectionReplySent(false);
      }, 2500);

      const messagesResponse = await fetch(
        `${API_BASE}/api/profile/connect/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberToken: token,
            connectionRecordId,
          }),
        },
      );

      const messagesResult = await messagesResponse.json();

      if (messagesResponse.ok && messagesResult?.success) {
        setConnectionMessages(
          Array.isArray(messagesResult?.messages)
            ? messagesResult.messages
            : [],
        );
      }

      const inboxResponse = await fetch(
        `${API_BASE}/api/profile/connect/inbox`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberToken: token,
          }),
        },
      );

      const inboxResult = await inboxResponse.json();

      if (inboxResponse.ok && inboxResult?.success) {
        const nextConnections = Array.isArray(inboxResult?.connections)
          ? inboxResult.connections
          : [];

        setConnectionInbox(nextConnections);

        const updatedSelectedConnection = nextConnections.find(
          (connection) => connection.connectionRecordId === connectionRecordId,
        );

        if (updatedSelectedConnection) {
          setSelectedConnection(updatedSelectedConnection);
        }
      }
    } catch (error) {
      console.error("Connection reply error:", error);

      setConnectionMessagesError(
        error?.message || "Could not send your reply.",
      );
    } finally {
      setConnectionReplySubmitting(false);
    }
  }

  /* =====================================================
     CONNECTION GROUPS
  ===================================================== */

  const receivedConnections = useMemo(
    () =>
      connectionInbox.filter(
        (connection) => connection?.direction === "received",
      ),
    [connectionInbox],
  );

  const sentConnections = useMemo(
    () =>
      connectionInbox.filter((connection) => connection?.direction === "sent"),
    [connectionInbox],
  );

  const visibleConnections =
    activeConnectionTab === "received" ? receivedConnections : sentConnections;

  const unreadConnectionCount = useMemo(
    () =>
      connectionInbox.filter((connection) => connection?.unread === true)
        .length,
    [connectionInbox],
  );

  useEffect(() => {
    if (typeof onUnreadCountChange === "function") {
      onUnreadCountChange(unreadConnectionCount);
    }
  }, [unreadConnectionCount, onUnreadCountChange]);

return (
  <>
    {/* =====================================================
        OPTIONAL FLOATING LAUNCHER
    ===================================================== */}

    {showLauncher && (
      <motion.button
        type="button"
        onClick={() => setPanelOpen(true)}
        initial={{ opacity: 0, scale: 0.85, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        whileHover={{ scale: 1.06, y: -2 }}
        whileTap={{ scale: 0.96 }}
        className="
          fixed
          bottom-6
          right-6
          z-[11500]
          flex
          h-16
          w-16
          items-center
          justify-center
          rounded-full
          border
          border-white/70
          text-white
          shadow-[0_18px_55px_rgba(15,23,42,.28)]
          backdrop-blur-xl
        "
        style={{
          background: `linear-gradient(
            135deg,
            ${primary},
            ${secondary}
          )`,
        }}
        aria-label="Open Bridge messages"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7"
        >
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>

        {unreadConnectionCount > 0 && (
          <span
            className="
              absolute
              -right-1
              -top-1
              flex
              min-h-6
              min-w-6
              items-center
              justify-center
              rounded-full
              border-2
              border-white
              bg-rose-500
              px-1.5
              text-[10px]
              font-black
              text-white
              shadow-lg
            "
          >
            {unreadConnectionCount > 99 ? "99+" : unreadConnectionCount}
          </span>
        )}
      </motion.button>
    )}

    {/* =====================================================
        CONVERSATION LIST MODAL
    ===================================================== */}

    {panelOpen && (
      <div
        className="
          fixed
          inset-0
          z-[12000]
          flex
          items-center
          justify-center
          bg-slate-950/45
          p-4
          backdrop-blur-sm
        "
        onClick={() => setPanelOpen(false)}
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
          className="
            max-h-[85vh]
            w-full
            max-w-4xl
            overflow-y-auto
            rounded-[34px]
            border
            border-white/80
            bg-white/95
            p-6
            shadow-[0_35px_120px_rgba(15,23,42,.30)]
            backdrop-blur-3xl
            md:p-8
          "
        >
          <div className="flex items-start justify-between gap-5">
            <div>
              <p
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.18em]
                "
                style={{ color: secondary }}
              >
                Bridge Connections
              </p>

              <h2
                className="
                  mt-3
                  text-3xl
                  font-black
                  tracking-[-0.045em]
                  md:text-4xl
                "
                style={{ color: primary }}
              >
                Your conversations
              </h2>

              <p className="mt-2 text-sm font-medium text-slate-500">
                Connection requests and conversations facilitated through
                Bridge.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-slate-100
                text-xl
                font-black
                text-slate-500
                transition
                hover:bg-slate-200
              "
            >
              ×
            </button>
          </div>

          <div className="mt-6 flex w-fit gap-2 rounded-full bg-slate-100 p-1.5">
            <button
              type="button"
              onClick={() => setActiveConnectionTab("received")}
              className="rounded-full px-5 py-2.5 text-xs font-black transition"
              style={{
                color: activeConnectionTab === "received" ? "#ffffff" : primary,
                backgroundColor:
                  activeConnectionTab === "received" ? primary : "transparent",
              }}
            >
              Received ({receivedConnections.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveConnectionTab("sent")}
              className="rounded-full px-5 py-2.5 text-xs font-black transition"
              style={{
                color: activeConnectionTab === "sent" ? "#ffffff" : primary,
                backgroundColor:
                  activeConnectionTab === "sent" ? primary : "transparent",
              }}
            >
              Sent ({sentConnections.length})
            </button>
          </div>

          {connectionInboxLoading && (
            <p className="mt-7 text-sm font-bold text-slate-400">
              Loading connections...
            </p>
          )}

          {!connectionInboxLoading && connectionInboxError && (
            <div className="mt-7 rounded-[24px] border border-amber-100 bg-amber-50 p-5">
              <p className="text-sm font-bold text-amber-800">
                {connectionInboxError}
              </p>
            </div>
          )}

          {!connectionInboxLoading &&
            !connectionInboxError &&
            visibleConnections.length === 0 && (
              <div className="mt-7 rounded-[28px] border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
                <p className="text-sm font-bold text-slate-400">
                  No {activeConnectionTab} connections yet.
                </p>
              </div>
            )}

          {!connectionInboxLoading &&
            !connectionInboxError &&
            visibleConnections.length > 0 && (
              <div className="mt-7 grid gap-3">
                {visibleConnections.map((connection) => {
                  const otherMember = connection?.otherMember || {};

                  const otherName =
                    otherMember.fullName ||
                    [otherMember.firstName, otherMember.lastName]
                      .filter(Boolean)
                      .join(" ") ||
                    "Bridge Member";

                  return (
                    <button
                      type="button"
                      key={connection.connectionRecordId}
                      onClick={() => {
                        setPanelOpen(false);
                        openConnection(connection);
                      }}
                      className={`
                        flex
                        w-full
                        items-center
                        gap-4
                        rounded-[26px]
                        border
                        p-5
                        text-left
                        transition
                        hover:shadow-md
                        ${
                          connection.unread
                            ? "border-blue-200 bg-blue-50 shadow-sm"
                            : "border-slate-100 bg-slate-50/60 hover:bg-white"
                        }
                      `}
                    >
                      <div
                        className="
                          flex
                          h-14
                          w-14
                          shrink-0
                          items-center
                          justify-center
                          overflow-hidden
                          rounded-2xl
                          font-black
                          text-white
                        "
                        style={{
                          background: `linear-gradient(
                            135deg,
                            ${primary},
                            ${secondary}
                          )`,
                        }}
                      >
                        {otherMember.profilePhoto ? (
                          <img
                            src={otherMember.profilePhoto}
                            alt={otherName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(otherName)
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className="truncate text-lg font-black"
                            style={{ color: primary }}
                          >
                            {otherName}
                          </p>

                          {connection.unread && (
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                          )}
                        </div>

                        {(otherMember.role ||
                          otherMember.businessOrganization) && (
                          <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                            {otherMember.role}

                            {otherMember.role &&
                            otherMember.businessOrganization
                              ? " · "
                              : ""}

                            {otherMember.businessOrganization}
                          </p>
                        )}

                        <p className="mt-2 truncate text-sm font-semibold text-slate-600">
                          {connection.connectionReason}
                        </p>
                      </div>

                      {connection.unread && (
                        <span className="rounded-full bg-blue-600 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                          New
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
        </motion.div>
      </div>
    )}
    {/* =====================================================
    CONVERSATION THREAD MODAL
===================================================== */}

    {selectedConnection && (
      <div
        className="
      fixed
      inset-0
      z-[12500]
      flex
      items-center
      justify-center
      bg-slate-950/45
      p-4
      backdrop-blur-sm
    "
        onClick={() => setSelectedConnection(null)}
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
          className="
        flex
        max-h-[85vh]
        w-full
        max-w-2xl
        flex-col
        overflow-hidden
        rounded-[32px]
        bg-white
        shadow-[0_35px_120px_rgba(15,23,42,.30)]
      "
        >
          {/* HEADER */}

          <div
            className="
          flex
          shrink-0
          items-center
          justify-between
          gap-4
          border-b
          border-slate-100
          p-6
        "
          >
            <div className="min-w-0">
              <p
                className="
              text-[10px]
              font-black
              uppercase
              tracking-[0.16em]
            "
                style={{
                  color: secondary,
                }}
              >
                Bridge Conversation
              </p>

              <h2
                className="
              mt-2
              truncate
              text-2xl
              font-black
              tracking-[-0.04em]
            "
                style={{
                  color: primary,
                }}
              >
                {selectedConnection?.otherMember?.fullName ||
                  [
                    selectedConnection?.otherMember?.firstName,
                    selectedConnection?.otherMember?.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ") ||
                  "Bridge Member"}
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                {selectedConnection.connectionReason}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedConnection(null)}
              className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-slate-100
            text-lg
            font-black
            text-slate-500
            transition
            hover:bg-slate-200
          "
              aria-label="Close conversation"
            >
              ×
            </button>
          </div>

          {/* MESSAGES */}

          <div
            className="
          min-h-0
          flex-1
          overflow-y-auto
          bg-slate-50/70
          p-5
          md:p-6
        "
          >
            {connectionMessagesLoading && (
              <div className="space-y-5 py-2">
                <div className="flex justify-start">
                  <div className="w-[68%] animate-pulse rounded-[22px] bg-white px-4 py-4 shadow-sm">
                    <div className="h-3 w-[85%] rounded-full bg-slate-200" />
                    <div className="mt-3 h-3 w-[65%] rounded-full bg-slate-200" />
                    <div className="mt-4 h-2 w-24 rounded-full bg-slate-100" />
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="w-[58%] animate-pulse rounded-[22px] bg-blue-100 px-4 py-4">
                    <div className="h-3 w-[80%] rounded-full bg-blue-200" />
                    <div className="mt-3 h-3 w-[55%] rounded-full bg-blue-200" />
                    <div className="ml-auto mt-4 h-2 w-20 rounded-full bg-blue-200/70" />
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="w-[72%] animate-pulse rounded-[22px] bg-white px-4 py-4 shadow-sm">
                    <div className="h-3 w-[90%] rounded-full bg-slate-200" />
                    <div className="mt-3 h-3 w-[75%] rounded-full bg-slate-200" />
                    <div className="mt-3 h-3 w-[48%] rounded-full bg-slate-200" />
                    <div className="mt-4 h-2 w-24 rounded-full bg-slate-100" />
                  </div>
                </div>
              </div>
            )}

            {!connectionMessagesLoading && connectionMessagesError && (
              <div className="rounded-[22px] border border-amber-100 bg-amber-50 p-5">
                <p className="text-sm font-bold text-amber-800">
                  {connectionMessagesError}
                </p>
              </div>
            )}

            {!connectionMessagesLoading &&
              !connectionMessagesError &&
              connectionMessages.length === 0 && (
                <p className="py-10 text-center text-sm font-bold text-slate-400">
                  No messages in this conversation yet.
                </p>
              )}

            {!connectionMessagesLoading &&
              !connectionMessagesError &&
              connectionMessages.length > 0 && (
                <div className="space-y-4">
                  {connectionMessages.map((item) => (
                    <div
                      key={item.messageRecordId}
                      className={`flex ${
                        item.isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className="
                      max-w-[82%]
                      rounded-[22px]
                      px-4
                      py-3
                      shadow-sm
                    "
                        style={{
                          background: item.isMine
                            ? `linear-gradient(
                            135deg,
                            ${primary},
                            ${secondary}
                          )`
                            : "#ffffff",

                          color: item.isMine ? "#ffffff" : "#334155",
                        }}
                      >
                        <p className="whitespace-pre-wrap text-sm font-medium leading-6">
                          {item.message}
                        </p>

                        {item.createdAt && (
                          <p
                            className={`
                          mt-2
                          text-[9px]
                          font-bold
                          ${item.isMine ? "text-white/60" : "text-slate-400"}
                        `}
                          >
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* REPLY */}

          <form
            onSubmit={handleConnectionReply}
            className="
          shrink-0
          border-t
          border-slate-100
          bg-white
          p-5
        "
          >
            {selectedConnection?.connectionStatus === "Closed" ? (
              <div className="rounded-[20px] bg-slate-50 px-5 py-4 text-center">
                <p className="text-sm font-bold text-slate-400">
                  This conversation is closed.
                </p>
              </div>
            ) : (
              <>
                {connectionReplySent && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 10,
                      scale: 0.95,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    className="
                  mb-3
                  flex
                  items-center
                  justify-center
                  gap-2
                  rounded-[18px]
                  bg-emerald-50
                  px-4
                  py-3
                  text-sm
                  font-black
                  text-emerald-700
                "
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
                      ✓
                    </span>
                    Message sent
                  </motion.div>
                )}

                <textarea
                  value={connectionReply}
                  onChange={(event) => {
                    setConnectionReply(event.target.value);

                    if (connectionMessagesError) {
                      setConnectionMessagesError("");
                    }
                  }}
                  rows={3}
                  maxLength={4000}
                  placeholder={`Reply to ${
                    selectedConnection?.otherMember?.firstName ||
                    selectedConnection?.otherMember?.fullName ||
                    "this member"
                  }...`}
                  disabled={connectionReplySubmitting}
                  className="
                w-full
                resize-none
                rounded-[22px]
                border
                border-slate-200
                bg-slate-50/60
                px-5
                py-4
                text-sm
                font-medium
                leading-6
                text-slate-700
                outline-none
                transition
                placeholder:text-slate-300
                focus:border-blue-300
                focus:bg-white
                focus:ring-4
                focus:ring-blue-50
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
                />

                <div className="mt-3 flex items-center justify-between gap-4">
                  <p className="text-[11px] font-semibold text-slate-400">
                    {connectionReply.length}/4000
                  </p>

                  <button
                    type="submit"
                    disabled={
                      connectionReplySubmitting || !connectionReply.trim()
                    }
                    className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-full
                  px-6
                  py-3
                  text-sm
                  font-black
                  text-white
                  shadow-lg
                  transition
                  hover:-translate-y-0.5
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  disabled:hover:translate-y-0
                "
                    style={{
                      background: `linear-gradient(
                    135deg,
                    ${primary},
                    ${secondary}
                  )`,
                    }}
                  >
                    {connectionReplySubmitting ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </>
            )}
          </form>
        </motion.div>
      </div>
    )}
  </>
);
}

/* =======================================================
   MAIN PROFILE VIEW
======================================================= */

export default function ProfileView({ data, theme, onClose, onEdit }) {
  const scrollContainerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    container: scrollContainerRef,
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 130,
    damping: 26,
    mass: 0.2,
  });

  const heroY = useTransform(smoothProgress, [0, 0.35], [0, -40]);

  const heroScale = useTransform(smoothProgress, [0, 0.35], [1, 0.985]);

  const primary = theme?.primary || "#071A4A";

  const secondary = theme?.secondary || "#3B82F6";

  const background = theme?.background || "#F4F7FC";

  const font = theme?.font || "Inter";

  /* =====================================================
     LIVE PROFILE DATA
  ===================================================== */

  const [liveProfileData, setLiveProfileData] = useState(null);

  const profileData = useMemo(
    () => ({
      ...(data || {}),
      ...(liveProfileData || {}),
    }),
    [data, liveProfileData],
  );

  const token = data?.token || liveProfileData?.token || "";

  const fetchMainProfile = useCallback(async () => {
    if (!token) return null;

    try {
      const response = await fetch(
        `${API_BASE}/api/recommendations/${encodeURIComponent(
          token,
        )}?t=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        return null;
      }

      return result;
    } catch (error) {
      console.error("Profile refresh error:", error);

      return null;
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const result = await fetchMainProfile();

      if (!cancelled && result) {
        setLiveProfileData(result);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [fetchMainProfile]);

  useEffect(() => {
    if (!profileData?.profileNeedsProcessing || !token) {
      return undefined;
    }

    let attempts = 0;
    let cancelled = false;

    const timer = setInterval(async () => {
      attempts += 1;

      const result = await fetchMainProfile();

      if (!cancelled && result) {
        setLiveProfileData(result);
      }

      if (!result?.profileNeedsProcessing || attempts >= 12) {
        clearInterval(timer);
      }
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [profileData?.profileNeedsProcessing, fetchMainProfile, token]);

  /* =====================================================
     PROFILE VALUES
  ===================================================== */

  const fullName =
    profileData?.fullName ||
    [profileData?.firstName, profileData?.lastName].filter(Boolean).join(" ") ||
    "Bridge Member";

  const firstName =
    profileData?.firstName || fullName.split(" ")[0] || "Member";

  const profilePhoto = profileData?.profilePhoto || "";

  const role = profileData?.role || "";

  const business = profileData?.businessOrganization || "";

  const bio = profileData?.profileBio || "";

  const profileStatus = profileData?.profileStatus || "";

  const email = profileData?.email || "";

  const phone = profileData?.phone || "";

  const website = profileData?.website || "";

  const websiteUrl = cleanExternalUrl(website);

  const aiProfileSummary = profileData?.aiProfileSummary || "";

  const showEmail = Boolean(profileData?.showEmailInDirectory);

  const showPhone = Boolean(profileData?.showPhoneInDirectory);

  const showSocialLinks = Boolean(profileData?.showSocialLinksInDirectory);

  const creatorLevel = profileData?.creatorLevel || "";

  const submissionCount = Number(profileData?.submissionCount) || 0;

  const memberSince = formatMemberSince(profileData?.creationDate);

  const city = profileData?.city || "";

  const state = profileData?.state || "";

  const location = [city, state].filter(Boolean).join(", ");

  const openToOpportunities = Boolean(profileData?.openToOpportunities);

  const profileStrength = Number(profileData?.profileStrength) || 0;

  const memberRecordId = profileData?.memberRecordId || "";

  /* =====================================================
   FOLLOWERS / FOLLOWING
===================================================== */

  const [socialSummary, setSocialSummary] = useState({
    followersCount: 0,
    followingCount: 0,
    followers: [],
    following: [],
  });

  const [socialSummaryLoading, setSocialSummaryLoading] = useState(false);
  const [activeFollowList, setActiveFollowList] = useState("");
  const [selectedFollowMemberId, setSelectedFollowMemberId] = useState("");

  useEffect(() => {
    if (!memberRecordId) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadSocialSummary() {
      try {
        setSocialSummaryLoading(true);

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

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.error || "Could not load profile connections.",
          );
        }

        if (controller.signal.aborted) {
          return;
        }

        setSocialSummary({
          followersCount: Number(result?.followersCount) || 0,
          followingCount: Number(result?.followingCount) || 0,
          followers: Array.isArray(result?.followers) ? result.followers : [],
          following: Array.isArray(result?.following) ? result.following : [],
        });
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Profile social summary error:", error);
      } finally {
        if (!controller.signal.aborted) {
          setSocialSummaryLoading(false);
        }
      }
    }

    loadSocialSummary();

    return () => controller.abort();
  }, [memberRecordId]);

  /* =====================================================
   CONNECTION INBOX
===================================================== */

  const [connectionInbox, setConnectionInbox] = useState([]);
  const [connectionInboxLoading, setConnectionInboxLoading] = useState(
    Boolean(token),
  );
  const [connectionInboxError, setConnectionInboxError] = useState("");
  const [activeConnectionTab, setActiveConnectionTab] = useState("received");
  const [showConnectionsPanel, setShowConnectionsPanel] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [connectionMessages, setConnectionMessages] = useState([]);
  const [connectionMessagesLoading, setConnectionMessagesLoading] =
    useState(false);
  const [connectionMessagesError, setConnectionMessagesError] = useState("");
  const [connectionReply, setConnectionReply] = useState("");

  const [connectionReplySubmitting, setConnectionReplySubmitting] =
    useState(false);
  
  const [connectionReplySent, setConnectionReplySent] = useState(false);

 useEffect(() => {
   if (!token) {
     return undefined;
   }

   const controller = new AbortController();

   async function loadConnectionInbox() {
     try {
       const response = await fetch(`${API_BASE}/api/profile/connect/inbox`, {
         method: "POST",

         headers: {
           "Content-Type": "application/json",
         },

         body: JSON.stringify({
           memberToken: token,
         }),

         signal: controller.signal,
       });

       const result = await response.json();

       if (!response.ok || !result?.success) {
         throw new Error(result?.error || "Could not load Bridge connections.");
       }

       if (controller.signal.aborted) {
         return;
       }

       setConnectionInbox(
         Array.isArray(result?.connections) ? result.connections : [],
       );

       setConnectionInboxError("");
     } catch (error) {
       if (error?.name === "AbortError") {
         return;
       }

       console.error("Connection inbox error:", error);

       setConnectionInboxError(
         error?.message || "Connections are temporarily unavailable.",
       );
     } finally {
       if (!controller.signal.aborted) {
         setConnectionInboxLoading(false);
       }
     }
   }

   loadConnectionInbox();

   return () => controller.abort();
 }, [token]);
  
  useEffect(() => {
    const connectionRecordId = selectedConnection?.connectionRecordId;

    if (!token || !connectionRecordId) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadConnectionMessages() {
      try {
        const response = await fetch(
          `${API_BASE}/api/profile/connect/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              memberToken: token,
              connectionRecordId,
            }),
            signal: controller.signal,
          },
        );

        const result = await response.json();

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.error || "Could not load conversation messages.",
          );
        }

        if (controller.signal.aborted) {
          return;
        }

        setConnectionMessages(
          Array.isArray(result?.messages) ? result.messages : [],
        );

        setConnectionMessagesError("");
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Connection messages error:", error);

        setConnectionMessagesError(
          error?.message || "Conversation is temporarily unavailable.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setConnectionMessagesLoading(false);
        }
      }
    }

    loadConnectionMessages();

    return () => controller.abort();
  }, [token, selectedConnection]);

  useEffect(() => {
    const connectionRecordId = selectedConnection?.connectionRecordId;

    if (!token || !connectionRecordId || !selectedConnection?.unread) {
      return undefined;
    }

    const controller = new AbortController();

    async function markConnectionRead() {
      try {
        const response = await fetch(`${API_BASE}/api/profile/connect/read`, {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            memberToken: token,
            connectionRecordId,
          }),

          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.error || "Could not mark conversation as read.",
          );
        }

        if (controller.signal.aborted) {
          return;
        }

        setConnectionInbox((current) =>
          current.map((connection) =>
            connection.connectionRecordId === connectionRecordId
              ? {
                  ...connection,
                  unread: false,
                }
              : connection,
          ),
        );

        setSelectedConnection((current) =>
          current?.connectionRecordId === connectionRecordId
            ? {
                ...current,
                unread: false,
              }
            : current,
        );
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Mark connection read error:", error);
      }
    }

    markConnectionRead();

    return () => controller.abort();
  }, [
    token,
    selectedConnection?.connectionRecordId,
    selectedConnection?.unread,
  ]);

  function openConnection(connection) {
    setConnectionMessagesLoading(true);
    setConnectionMessages([]);
    setConnectionMessagesError("");
    setConnectionReply("");
    setConnectionReplySent(false);

    setSelectedConnection(connection);
  }

  async function handleConnectionReply(event) {
    event.preventDefault();

    const connectionRecordId = selectedConnection?.connectionRecordId;

    const cleanReply = connectionReply.trim();

    if (
      !token ||
      !connectionRecordId ||
      !cleanReply ||
      connectionReplySubmitting
    ) {
      return;
    }

    try {
      setConnectionReplySubmitting(true);

      /* =====================================================
       SEND REPLY
    ===================================================== */

      const response = await fetch(`${API_BASE}/api/profile/connect/reply`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          memberToken: token,
          connectionRecordId,
          message: cleanReply,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Could not send reply.");
      }

    setConnectionReply("");
    setConnectionReplySent(true);

    setTimeout(() => {
      setConnectionReplySent(false);
    }, 2500);

      /* =====================================================
       REFRESH CONVERSATION MESSAGES
    ===================================================== */

      const messagesResponse = await fetch(
        `${API_BASE}/api/profile/connect/messages`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            memberToken: token,
            connectionRecordId,
          }),
        },
      );

      const messagesResult = await messagesResponse.json();

      if (messagesResponse.ok && messagesResult?.success) {
        setConnectionMessages(
          Array.isArray(messagesResult?.messages)
            ? messagesResult.messages
            : [],
        );
      }

      /* =====================================================
       REFRESH CONNECTION INBOX
    ===================================================== */

      const inboxResponse = await fetch(
        `${API_BASE}/api/profile/connect/inbox`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            memberToken: token,
          }),
        },
      );

      const inboxResult = await inboxResponse.json();

      if (inboxResponse.ok && inboxResult?.success) {
        const nextConnections = Array.isArray(inboxResult?.connections)
          ? inboxResult.connections
          : [];

        setConnectionInbox(nextConnections);

        const updatedSelectedConnection = nextConnections.find(
          (connection) => connection.connectionRecordId === connectionRecordId,
        );

        if (updatedSelectedConnection) {
          setSelectedConnection(updatedSelectedConnection);
        }
      }
    } catch (error) {
      console.error("Connection reply error:", error);

      setConnectionMessagesError(
        error?.message || "Could not send your reply.",
      );
    } finally {
      setConnectionReplySubmitting(false);
    }
  }

  const receivedConnections = useMemo(
    () =>
      connectionInbox.filter(
        (connection) => connection?.direction === "received",
      ),
    [connectionInbox],
  );

  const sentConnections = useMemo(
    () =>
      connectionInbox.filter((connection) => connection?.direction === "sent"),
    [connectionInbox],
  );

  const visibleConnections =
    activeConnectionTab === "received" ? receivedConnections : sentConnections;
  


  /* =====================================================
     PROFILE LISTS
  ===================================================== */

  const expertiseItems = useMemo(
    () => splitTags(profileData?.expertise).slice(0, 18),
    [profileData?.expertise],
  );

  const affiliations = useMemo(
    () => splitList(profileData?.additionalAffiliations).slice(0, 16),
    [profileData?.additionalAffiliations],
  );

  const parsedSocialLinks = useMemo(
    () => parseSocialLinks(profileData?.socialLinks).slice(0, 12),
    [profileData?.socialLinks],
  );

  /*
    IMPORTANT:
    Social links only show when member allows them.
  */

  const publicSocialLinks = showSocialLinks ? parsedSocialLinks : [];

  const opportunityTypes = useMemo(
    () => splitList(profileData?.opportunityTypes),
    [profileData?.opportunityTypes],
  );

  /* =====================================================
     CONTRIBUTIONS
  ===================================================== */

  const [contributions, setContributions] = useState([]);

  const [contributionsLoading, setContributionsLoading] = useState(
    Boolean(token),
  );

  const [contributionsError, setContributionsError] = useState("");

  const [contributionReloadKey, setContributionReloadKey] = useState(0);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadContributions() {
      try {
        const response = await fetch(
          `${API_BASE}/api/profile/${encodeURIComponent(token)}/contributions`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "Could not load contributions.");
        }

        if (controller.signal.aborted) {
          return;
        }

        const items = Array.isArray(result?.contributions)
          ? result.contributions
          : [];

        const sorted = [...items].sort(
          (a, b) => sortContributionDate(b) - sortContributionDate(a),
        );

        setContributions(sorted);
        setContributionsError("");
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Profile contributions error:", error);

        setContributionsError("Contributions are temporarily unavailable.");
      } finally {
        if (!controller.signal.aborted) {
          setContributionsLoading(false);
        }
      }
    }

    loadContributions();

    return () => controller.abort();
  }, [token, contributionReloadKey]);

  const sharedContributions = useMemo(() => contributions, [contributions]);

  const liveSharedCount = contributionsLoading
    ? submissionCount
    : Math.max(submissionCount, sharedContributions.length);

  function retryContributions() {
    setContributionsLoading(true);
    setContributionsError("");

    setContributionReloadKey((value) => value + 1);
  }

  /* =====================================================
     BRIDGE QUESTIONS
  ===================================================== */

  const [bridgeQuestions, setBridgeQuestions] = useState([]);

  const [answeredQuestionNumbers, setAnsweredQuestionNumbers] = useState([]);

  const [bridgeQuestionsLoading, setBridgeQuestionsLoading] = useState(
    Boolean(token),
  );

  const [bridgeQuestionsError, setBridgeQuestionsError] = useState("");

  const [bridgeAnswer, setBridgeAnswer] = useState("");

  const [bridgeAnswerSubmitting, setBridgeAnswerSubmitting] = useState(false);

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
          setBridgeQuestionsLoading(false);
        }
      }
    }

    loadBridgeQuestions();

    return () => controller.abort();
  }, [token]);

  const nextBridgeQuestion = useMemo(() => {
    const answered = new Set(answeredQuestionNumbers.map(Number));

    return (
      bridgeQuestions.find(
        (item) => !answered.has(Number(item?.questionNumber)),
      ) || null
    );
  }, [bridgeQuestions, answeredQuestionNumbers]);

  const answeredCount = useMemo(() => {
    const available = new Set(
      bridgeQuestions.map((item) => Number(item.questionNumber)),
    );

    return answeredQuestionNumbers.filter((number) =>
      available.has(Number(number)),
    ).length;
  }, [answeredQuestionNumbers, bridgeQuestions]);

  const bridgeQuestionProgress = bridgeQuestions.length
    ? Math.round((answeredCount / bridgeQuestions.length) * 100)
    : 0;

  const bridgeQuestionsComplete =
    !bridgeQuestionsLoading &&
    !bridgeQuestionsError &&
    bridgeQuestions.length > 0 &&
    !nextBridgeQuestion;

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
            questionNumber: nextBridgeQuestion.questionNumber,

            questionId: nextBridgeQuestion.id,

            answer: cleanAnswer,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Could not submit your answer.");
      }

      const answeredNumber = Number(nextBridgeQuestion.questionNumber);

      setAnsweredQuestionNumbers((current) => [
        ...new Set([...current.map(Number), answeredNumber]),
      ]);

      setBridgeAnswer("");
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
     INTERESTS
  ===================================================== */

  const interestTags = useMemo(
    () => splitTags(profileData?.interestTags),
    [profileData?.interestTags],
  );

  const interestBuckets = useMemo(
    () => splitTags(profileData?.interestBuckets),
    [profileData?.interestBuckets],
  );

  const interests = useMemo(
    () => [...new Set([...interestBuckets, ...interestTags])].slice(0, 20),
    [interestBuckets, interestTags],
  );

  /* =====================================================
     CONNECT VISIBILITY
  ===================================================== */

  const hasConnectInfo =
    Boolean(websiteUrl) ||
    publicSocialLinks.length > 0 ||
    (showEmail && Boolean(email)) ||
    (showPhone && Boolean(phone));

  const activeFollowMembers =
    activeFollowList === "followers"
      ? socialSummary.followers
      : activeFollowList === "following"
        ? socialSummary.following
        : [];

  const activeFollowTitle =
    activeFollowList === "followers" ? "Followers" : "Following";

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div
      ref={scrollContainerRef}
      className="
        fixed
        inset-0
        z-[9500]
        overflow-y-auto
      "
      style={{
        fontFamily: `${font}, sans-serif`,
        backgroundColor: background,
      }}
    >
      {/* PAGE PROGRESS */}

      <motion.div
        className="
          fixed
          left-0
          right-0
          top-0
          z-[10000]
          h-[3px]
          origin-left
        "
        style={{
          scaleX: smoothProgress,

          background: `linear-gradient(
            90deg,
            ${secondary},
            ${primary},
            ${secondary}
          )`,
        }}
      />

      <FloatingScene theme={theme} />
      {/* =====================================================
    FLOATING MESSAGES BUTTON
===================================================== */}

      <BridgeMessages token={token} theme={theme} />

      {activeFollowList && (
        <div
          className="
      fixed
      inset-0
      z-[12000]
      flex
      items-center
      justify-center
      bg-slate-950/45
      p-4
      backdrop-blur-sm
    "
          onClick={() => setActiveFollowList("")}
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
            onClick={(event) => event.stopPropagation()}
            className="
        max-h-[80vh]
        w-full
        max-w-xl
        overflow-y-auto
        rounded-[32px]
        bg-white
        p-6
        shadow-[0_35px_120px_rgba(15,23,42,.30)]
      "
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p
                  className="
              text-[10px]
              font-black
              uppercase
              tracking-[0.16em]
            "
                  style={{
                    color: secondary,
                  }}
                >
                  Bridge Connections
                </p>

                <h2
                  className="
              mt-2
              text-3xl
              font-black
              tracking-[-0.04em]
            "
                  style={{
                    color: primary,
                  }}
                >
                  {activeFollowTitle}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setActiveFollowList("")}
                className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            bg-slate-100
            text-lg
            font-black
            text-slate-500
            transition
            hover:bg-slate-200
          "
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {activeFollowMembers.length > 0 ? (
                activeFollowMembers.map((member) => {
                  const memberName =
                    member?.fullName ||
                    [member?.firstName, member?.lastName]
                      .filter(Boolean)
                      .join(" ") ||
                    "Bridge Member";

                  const isSelected =
                    selectedFollowMemberId === member.memberRecordId;

                  return (
                    <div
                      key={member.memberRecordId}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setSelectedFollowMemberId((current) =>
                          current === member.memberRecordId
                            ? ""
                            : member.memberRecordId,
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();

                          setSelectedFollowMemberId((current) =>
                            current === member.memberRecordId
                              ? ""
                              : member.memberRecordId,
                          );
                        }
                      }}
                      className="
            flex
            cursor-pointer
            items-start
            gap-4
            rounded-[24px]
            border
            bg-slate-50/70
            p-4
            transition
            hover:bg-white
            hover:shadow-md
          "
                      style={{
                        borderColor: isSelected ? secondary : "#f1f5f9",
                      }}
                    >
                      <div
                        className="
              flex
              h-14
              w-14
              shrink-0
              items-center
              justify-center
              overflow-hidden
              rounded-2xl
              text-sm
              font-black
              text-white
            "
                        style={{
                          background: `linear-gradient(
                135deg,
                ${primary},
                ${secondary}
              )`,
                        }}
                      >
                        {member.profilePhoto ? (
                          <img
                            src={member.profilePhoto}
                            alt={memberName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(memberName)
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className="text-lg font-black"
                          style={{
                            color: primary,
                          }}
                        >
                          {memberName}
                        </p>

                        {(member.role || member.businessOrganization) && (
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {member.role}

                            {member.role && member.businessOrganization
                              ? " · "
                              : ""}

                            {member.businessOrganization}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {member.email && (
                            <a
                              href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                                member.email,
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="
        rounded-full
        bg-white
        px-3
        py-2
        text-xs
        font-black
        shadow-sm
      "
                              style={{
                                color: primary,
                              }}
                            >
                              Email
                            </a>
                          )}

                          {member.phone && (
                            <a
                              href={`tel:${member.phone}`}
                              onClick={(event) => event.stopPropagation()}
                              className="
        rounded-full
        bg-white
        px-3
        py-2
        text-xs
        font-black
        shadow-sm
      "
                              style={{
                                color: primary,
                              }}
                            >
                              Phone
                            </a>
                          )}
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{
                              opacity: 0,
                              height: 0,
                              y: -6,
                            }}
                            animate={{
                              opacity: 1,
                              height: "auto",
                              y: 0,
                            }}
                            className="
      mt-4
      border-t
      border-slate-200
      pt-4
    "
                          >
                            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                              Public Profile Details
                            </p>
                            {member.email && (
                              <div className="mt-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                                  Email
                                </p>

                                <a
                                  href={`mailto:${member.email}`}
                                  onClick={(event) => event.stopPropagation()}
                                  className="mt-1 block break-all text-sm font-black hover:underline"
                                  style={{
                                    color: primary,
                                  }}
                                >
                                  {member.email}
                                </a>
                              </div>
                            )}

                            {member.phone && (
                              <div className="mt-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                                  Phone
                                </p>

                                <a
                                  href={`tel:${member.phone}`}
                                  onClick={(event) => event.stopPropagation()}
                                  className="mt-1 block text-sm font-black hover:underline"
                                  style={{
                                    color: primary,
                                  }}
                                >
                                  {member.phone}
                                </a>
                              </div>
                            )}

                            {member.website &&
                              cleanExternalUrl(member.website) && (
                                <a
                                  href={cleanExternalUrl(member.website)}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="
          mt-3
          block
          text-sm
          font-black
          hover:underline
        "
                                  style={{
                                    color: primary,
                                  }}
                                >
                                  Website ↗
                                </a>
                              )}

                            {member.socialLinks &&
                              parseSocialLinks(member.socialLinks).map(
                                (item, index) => {
                                  const socialInfo = getSocialInfo(item);

                                  if (!item.url) return null;

                                  return (
                                    <a
                                      key={`${item.url}-${index}`}
                                      href={item.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(event) =>
                                        event.stopPropagation()
                                      }
                                      className="
              mt-2
              block
              text-sm
              font-bold
              text-slate-600
              hover:underline
            "
                                    >
                                      {socialInfo.name} ↗
                                    </a>
                                  );
                                },
                              )}

                            {!member.email &&
                              !member.phone &&
                              !member.website &&
                              !member.socialLinks && (
                                <p className="mt-3 text-sm font-medium text-slate-400">
                                  No additional public contact details are
                                  available.
                                </p>
                              )}
                          </motion.div>
                        )}
                      </div>

                      <div
                        className="
              mt-2
              text-lg
              font-black
              text-slate-300
            "
                      >
                        {isSelected ? "−" : "+"}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p
                  className="
        rounded-[24px]
        bg-slate-50
        p-6
        text-center
        text-sm
        font-semibold
        text-slate-400
      "
                >
                  No connections yet.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {selectedConnection && (
        <div
          className="
      fixed
      inset-0
      z-[12500]
      flex
      items-center
      justify-center
      bg-slate-950/45
      p-4
      backdrop-blur-sm
    "
          onClick={() => setSelectedConnection(null)}
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
            className="
        flex
        max-h-[85vh]
        w-full
        max-w-2xl
        flex-col
        overflow-hidden
        rounded-[32px]
        bg-white
        shadow-[0_35px_120px_rgba(15,23,42,.30)]
      "
          >
            {/* =====================================================
          HEADER
      ===================================================== */}

            <div
              className="
          flex
          shrink-0
          items-center
          justify-between
          gap-4
          border-b
          border-slate-100
          p-6
        "
            >
              <div className="min-w-0">
                <p
                  className="
              text-[10px]
              font-black
              uppercase
              tracking-[0.16em]
            "
                  style={{
                    color: secondary,
                  }}
                >
                  Bridge Conversation
                </p>

                <h2
                  className="
              mt-2
              truncate
              text-2xl
              font-black
              tracking-[-0.04em]
            "
                  style={{
                    color: primary,
                  }}
                >
                  {selectedConnection?.otherMember?.fullName ||
                    [
                      selectedConnection?.otherMember?.firstName,
                      selectedConnection?.otherMember?.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ") ||
                    "Bridge Member"}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {selectedConnection.connectionReason}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedConnection(null)}
                className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-slate-100
            text-lg
            font-black
            text-slate-500
            transition
            hover:bg-slate-200
          "
              >
                ×
              </button>
            </div>

            {/* =====================================================
          MESSAGES
      ===================================================== */}

            <div
              className="
          min-h-0
          flex-1
          overflow-y-auto
          bg-slate-50/70
          p-5
          md:p-6
        "
            >
              {connectionMessagesLoading && (
                <div className="space-y-5 py-2">
                  {/* LEFT MESSAGE */}

                  <div className="flex justify-start">
                    <div
                      className="
          w-[68%]
          animate-pulse
          rounded-[22px]
          bg-white
          px-4
          py-4
          shadow-sm
        "
                    >
                      <div className="h-3 w-[85%] rounded-full bg-slate-200" />

                      <div className="mt-3 h-3 w-[65%] rounded-full bg-slate-200" />

                      <div className="mt-4 h-2 w-24 rounded-full bg-slate-100" />
                    </div>
                  </div>

                  {/* RIGHT MESSAGE */}

                  <div className="flex justify-end">
                    <div
                      className="
          w-[58%]
          animate-pulse
          rounded-[22px]
          bg-blue-100
          px-4
          py-4
        "
                    >
                      <div className="h-3 w-[80%] rounded-full bg-blue-200" />

                      <div className="mt-3 h-3 w-[55%] rounded-full bg-blue-200" />

                      <div className="mt-4 ml-auto h-2 w-20 rounded-full bg-blue-200/70" />
                    </div>
                  </div>

                  {/* LEFT MESSAGE */}

                  <div className="flex justify-start">
                    <div
                      className="
          w-[72%]
          animate-pulse
          rounded-[22px]
          bg-white
          px-4
          py-4
          shadow-sm
        "
                    >
                      <div className="h-3 w-[90%] rounded-full bg-slate-200" />

                      <div className="mt-3 h-3 w-[75%] rounded-full bg-slate-200" />

                      <div className="mt-3 h-3 w-[48%] rounded-full bg-slate-200" />

                      <div className="mt-4 h-2 w-24 rounded-full bg-slate-100" />
                    </div>
                  </div>
                </div>
              )}

              {!connectionMessagesLoading && connectionMessagesError && (
                <div
                  className="
              rounded-[22px]
              border
              border-amber-100
              bg-amber-50
              p-5
            "
                >
                  <p className="text-sm font-bold text-amber-800">
                    {connectionMessagesError}
                  </p>
                </div>
              )}

              {!connectionMessagesLoading &&
                !connectionMessagesError &&
                connectionMessages.length === 0 && (
                  <p className="py-10 text-center text-sm font-bold text-slate-400">
                    No messages in this conversation yet.
                  </p>
                )}

              {!connectionMessagesLoading &&
                !connectionMessagesError &&
                connectionMessages.length > 0 && (
                  <div className="space-y-4">
                    {connectionMessages.map((item) => (
                      <div
                        key={item.messageRecordId}
                        className={`flex ${
                          item.isMine ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className="
                      max-w-[82%]
                      rounded-[22px]
                      px-4
                      py-3
                      shadow-sm
                    "
                          style={{
                            background: item.isMine
                              ? `linear-gradient(
                            135deg,
                            ${primary},
                            ${secondary}
                          )`
                              : "#ffffff",

                            color: item.isMine ? "#ffffff" : "#334155",
                          }}
                        >
                          <p className="whitespace-pre-wrap text-sm font-medium leading-6">
                            {item.message}
                          </p>

                          {item.createdAt && (
                            <p
                              className={`
                          mt-2
                          text-[9px]
                          font-bold
                          ${item.isMine ? "text-white/60" : "text-slate-400"}
                        `}
                            >
                              {new Date(item.createdAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* =====================================================
          REPLY BOX
      ===================================================== */}

            <form
              onSubmit={handleConnectionReply}
              className="
          shrink-0
          border-t
          border-slate-100
          bg-white
          p-5
        "
            >
              {selectedConnection?.connectionStatus === "Closed" ? (
                <div className="rounded-[20px] bg-slate-50 px-5 py-4 text-center">
                  <p className="text-sm font-bold text-slate-400">
                    This conversation is closed.
                  </p>
                </div>
              ) : (
                <>
                  {connectionReplySent && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        y: 10,
                        scale: 0.95,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                      }}
                      className="
          mb-3
          flex
          items-center
          justify-center
          gap-2
          rounded-[18px]
          bg-emerald-50
          px-4
          py-3
          text-sm
          font-black
          text-emerald-700
        "
                    >
                      <span
                        className="
            flex
            h-6
            w-6
            items-center
            justify-center
            rounded-full
            bg-emerald-500
            text-xs
            text-white
          "
                      >
                        ✓
                      </span>
                      Message sent
                    </motion.div>
                  )}

                  <textarea
                    value={connectionReply}
                    onChange={(event) => {
                      setConnectionReply(event.target.value);

                      if (connectionMessagesError) {
                        setConnectionMessagesError("");
                      }
                    }}
                    rows={3}
                    maxLength={4000}
                    placeholder={`Reply to ${
                      selectedConnection?.otherMember?.firstName ||
                      selectedConnection?.otherMember?.fullName ||
                      "this member"
                    }...`}
                    disabled={connectionReplySubmitting}
                    className="
                w-full
                resize-none
                rounded-[22px]
                border
                border-slate-200
                bg-slate-50/60
                px-5
                py-4
                text-sm
                font-medium
                leading-6
                text-slate-700
                outline-none
                transition
                placeholder:text-slate-300
                focus:border-blue-300
                focus:bg-white
                focus:ring-4
                focus:ring-blue-50
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
                  />

                  <div className="mt-3 flex items-center justify-between gap-4">
                    <p className="text-[11px] font-semibold text-slate-400">
                      {connectionReply.length}/4000
                    </p>

                    <button
                      type="submit"
                      disabled={
                        connectionReplySubmitting || !connectionReply.trim()
                      }
                      className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-full
                  px-6
                  py-3
                  text-sm
                  font-black
                  text-white
                  shadow-lg
                  transition
                  hover:-translate-y-0.5
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  disabled:hover:translate-y-0
                "
                      style={{
                        background: `linear-gradient(
                    135deg,
                    ${primary},
                    ${secondary}
                  )`,
                      }}
                    >
                      {connectionReplySubmitting ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </motion.div>
        </div>
      )}

      {/* =====================================================
          PREMIUM AMBIENT BACKGROUND
      ===================================================== */}

      <div
        className="
          pointer-events-none
          fixed
          inset-0
          z-0
          overflow-hidden
        "
      >
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(
                circle at 8% 7%,
                ${secondary}20,
                transparent 26%
              ),
              radial-gradient(
                circle at 90% 15%,
                ${primary}17,
                transparent 30%
              ),
              radial-gradient(
                circle at 52% 85%,
                ${secondary}12,
                transparent 28%
              ),
              linear-gradient(
                180deg,
                #ffffff 0%,
                ${background} 45%,
                #ffffff 100%
              )
            `,
          }}
        />

        <motion.div
          animate={{
            x: ["-10%", "18%", "-3%", "-10%"],

            y: ["0%", "-12%", "13%", "0%"],
          }}
          transition={{
            repeat: Infinity,
            duration: 26,
            ease: "easeInOut",
          }}
          className="
            absolute
            -left-[250px]
            top-[120px]
            h-[650px]
            w-[650px]
            rounded-full
            blur-[130px]
          "
          style={{
            backgroundColor: `${secondary}15`,
          }}
        />

        <motion.div
          animate={{
            x: ["10%", "-14%", "4%", "10%"],

            y: ["0%", "11%", "-7%", "0%"],
          }}
          transition={{
            repeat: Infinity,
            duration: 32,
            ease: "easeInOut",
          }}
          className="
            absolute
            -right-[270px]
            top-[200px]
            h-[720px]
            w-[720px]
            rounded-full
            blur-[145px]
          "
          style={{
            backgroundColor: `${primary}12`,
          }}
        />

        <div
          className="
            absolute
            inset-0
            opacity-[0.035]
          "
          style={{
            backgroundImage: `
              linear-gradient(
                ${primary} 1px,
                transparent 1px
              ),
              linear-gradient(
                90deg,
                ${primary} 1px,
                transparent 1px
              )
            `,

            backgroundSize: "58px 58px",

            maskImage: "linear-gradient(to bottom, black, transparent 80%)",
          }}
        />
      </div>

      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <div
        className="
          sticky
          top-0
          z-50
          border-b
          border-white/10
          px-4
          py-3
          text-white
          shadow-[0_8px_30px_rgba(7,26,74,.18)]
          backdrop-blur-3xl
          md:px-6
        "
        style={{
          backgroundColor: `${primary}EE`,
        }}
      >
        <div
          className="
            mx-auto
            flex
            max-w-[1400px]
            items-center
            justify-between
            gap-4
          "
        >
          <motion.button
            type="button"
            onClick={onClose}
            whileHover={{
              x: -3,
            }}
            whileTap={{
              scale: 0.97,
            }}
            className="
              flex
              items-center
              gap-2
              rounded-full
              px-3
              py-2
              text-sm
              font-black
              transition
              hover:bg-white/10
            "
          >
            <span className="text-xl">←</span>

            <span className="hidden sm:inline">Back to My Page</span>
          </motion.button>

          <div
            className="
              hidden
              items-center
              gap-3
              sm:flex
            "
          >
            <motion.span
              animate={{
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 2,
              }}
              className="
                h-2
                w-2
                rounded-full
                bg-emerald-400
                shadow-[0_0_14px_rgba(52,211,153,.9)]
              "
            />

            <span
              className="
                text-[9px]
                font-black
                uppercase
                tracking-[0.22em]
                text-white/65
              "
            >
              Live Bridge Profile
            </span>
          </div>

          <motion.button
            type="button"
            onClick={onEdit}
            whileHover={{
              y: -2,
            }}
            whileTap={{
              scale: 0.97,
            }}
            className="
              rounded-full
              border
              border-white/15
              bg-white/10
              px-4
              py-2.5
              text-xs
              font-black
              transition
              hover:bg-white/20
            "
          >
            Edit Profile ✎
          </motion.button>
        </div>
      </div>

      {/* =====================================================
          BRAND
      ===================================================== */}

      <section
        className="
          relative
          z-10
          px-6
          pb-2
          pt-7
          text-center
        "
      >
        <motion.img
          initial={{
            opacity: 0,
            y: -15,
            scale: 0.94,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            duration: 0.7,
          }}
          src="https://mcusercontent.com/2ead8cf9844eae73676cdedb6/images/5c553236-b34b-a985-35dd-24d9bba8f0a1.png"
          alt="BridgeAZ"
          className="
            mx-auto
            w-40
            drop-shadow-[0_12px_30px_rgba(0,0,0,.08)]
            md:w-52
          "
        />
      </section>

      {/* =====================================================
          HERO
      ===================================================== */}

      <motion.section
        style={{
          y: heroY,
          scale: heroScale,
        }}
        className="
          relative
          z-10
          px-4
          py-5
          md:px-6
        "
      >
        <div
          className="
            relative
            mx-auto
            max-w-[1400px]
            overflow-hidden
            rounded-[44px]
            border
            border-white/80
            bg-white/72
            p-6
            shadow-[0_40px_130px_rgba(15,23,42,.13)]
            backdrop-blur-3xl
            md:p-10
          "
        >
          <div
            className="
              absolute
              inset-x-0
              top-0
              h-[4px]
            "
            style={{
              background: `linear-gradient(
                90deg,
                transparent,
                ${secondary},
                ${primary},
                ${secondary},
                transparent
              )`,
            }}
          />

          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              repeat: Infinity,
              duration: 35,
              ease: "linear",
            }}
            className="
              pointer-events-none
              absolute
              -right-[190px]
              -top-[200px]
              h-[500px]
              w-[500px]
              rounded-full
              opacity-50
              blur-[80px]
            "
            style={{
              background: `conic-gradient(
                from 180deg,
                ${secondary}30,
                transparent,
                ${primary}25,
                transparent,
                ${secondary}30
              )`,
            }}
          />

          <div
            className="
              relative
              z-10
              grid
              items-center
              gap-9
              lg:grid-cols-[290px_minmax(0,1fr)_270px]
            "
          >
            <PremiumAvatar
              profilePhoto={profilePhoto}
              fullName={fullName}
              primary={primary}
              secondary={secondary}
            />

            <div
              className="
                min-w-0
                text-center
                lg:text-left
              "
            >
              <Eyebrow secondary={secondary}>Member Profile</Eyebrow>

              <motion.h1
                initial={{
                  opacity: 0,
                  y: 22,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.15,
                  duration: 0.7,
                }}
                className="
                  mt-4
                  text-4xl
                  font-black
                  leading-[0.95]
                  tracking-[-0.06em]
                  md:text-6xl
                  xl:text-7xl
                "
                style={{
                  color: primary,
                }}
              >
                {fullName}
              </motion.h1>

              {(role || business) && (
                <p
                  className="
                    mt-5
                    text-base
                    font-black
                    text-slate-500
                    md:text-lg
                  "
                >
                  {role}

                  {role && business ? " · " : ""}

                  {business}
                </p>
              )}

              {profileStatus && (
                <motion.div
                  initial={{
                    opacity: 0,
                    x: -12,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  transition={{
                    delay: 0.3,
                  }}
                  className="
                    mx-auto
                    mt-5
                    flex
                    max-w-3xl
                    items-start
                    gap-3
                    text-left
                    lg:mx-0
                  "
                >
                  <motion.span
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [1, 0.5, 1],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                    }}
                    className="
                      mt-2
                      h-2.5
                      w-2.5
                      shrink-0
                      rounded-full
                    "
                    style={{
                      backgroundColor: secondary,

                      boxShadow: `0 0 16px ${secondary}`,
                    }}
                  />

                  <p
                    className="
                      text-sm
                      font-semibold
                      leading-6
                      text-slate-600
                    "
                  >
                    {profileStatus}
                  </p>
                </motion.div>
              )}

              <div className="mt-6 flex items-center justify-center gap-6 lg:justify-start">
                <button
                  type="button"
                  onClick={() => setActiveFollowList("followers")}
                  className="cursor-pointer text-center transition hover:opacity-70 lg:text-left"
                >
                  <p
                    className="text-2xl font-black"
                    style={{
                      color: primary,
                    }}
                  >
                    {socialSummaryLoading ? "…" : socialSummary.followersCount}
                  </p>

                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Followers
                  </p>
                </button>

                <div className="h-9 w-px bg-slate-200" />

                <button
                  type="button"
                  onClick={() => setActiveFollowList("following")}
                  className="cursor-pointer text-center transition hover:opacity-70 lg:text-left"
                >
                  <p
                    className="text-2xl font-black"
                    style={{
                      color: primary,
                    }}
                  >
                    {socialSummaryLoading ? "…" : socialSummary.followingCount}
                  </p>

                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Following
                  </p>
                </button>
              </div>

              <div
                className="
                  mt-6
                  flex
                  flex-wrap
                  justify-center
                  gap-2
                  lg:justify-start
                "
              >
                {creatorLevel && (
                  <motion.span
                    whileHover={{
                      y: -3,
                    }}
                    className="
                      rounded-full
                      px-4
                      py-2
                      text-[10px]
                      font-black
                      uppercase
                      tracking-[0.15em]
                    "
                    style={{
                      color: primary,
                      backgroundColor: `${secondary}12`,
                    }}
                  >
                    {creatorLevel}
                  </motion.span>
                )}

                {memberSince && (
                  <motion.span
                    whileHover={{
                      y: -3,
                    }}
                    className="
                      rounded-full
                      bg-slate-50
                      px-4
                      py-2
                      text-[10px]
                      font-black
                      uppercase
                      tracking-[0.13em]
                      text-slate-500
                    "
                  >
                    Since {memberSince}
                  </motion.span>
                )}

                {location && (
                  <motion.span
                    whileHover={{
                      y: -3,
                    }}
                    className="
                      rounded-full
                      bg-slate-50
                      px-4
                      py-2
                      text-[10px]
                      font-black
                      uppercase
                      tracking-[0.13em]
                      text-slate-500
                    "
                  >
                    ◉ {location}
                  </motion.span>
                )}

                {openToOpportunities && (
                  <motion.span
                    animate={{
                      boxShadow: [
                        "0 0 0 rgba(16,185,129,0)",
                        "0 0 22px rgba(16,185,129,.18)",
                        "0 0 0 rgba(16,185,129,0)",
                      ],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 3,
                    }}
                    className="
                      rounded-full
                      bg-emerald-50
                      px-4
                      py-2
                      text-[10px]
                      font-black
                      uppercase
                      tracking-[0.13em]
                      text-emerald-700
                    "
                  >
                    Open to opportunities
                  </motion.span>
                )}
              </div>
            </div>

            <GlassCard className="p-5">
              <StrengthRing
                value={profileStrength}
                primary={primary}
                secondary={secondary}
              />

              <div className="mt-5">
                <MiniStat
                  value={contributionsLoading ? "…" : liveSharedCount}
                  label="Shared through Bridge"
                  primary={primary}
                  secondary={secondary}
                />
              </div>
            </GlassCard>
          </div>
        </div>
      </motion.section>

      {/* =====================================================
          WEATHER
      ===================================================== */}

      <section
        className="
          relative
          z-10
          px-4
          py-5
          md:px-6
        "
      >
        <Reveal>
          <div
            className="
              relative
              mx-auto
              max-w-[1400px]
              overflow-hidden
              rounded-[38px]
              border
              border-white/20
              shadow-[0_32px_110px_rgba(15,23,42,.18)]
            "
            style={{
              background: `linear-gradient(
                135deg,
                ${primary},
                ${secondary}
              )`,
            }}
          >
            <motion.div
              animate={{
                x: ["-100%", "160%"],
              }}
              transition={{
                repeat: Infinity,
                duration: 10,
                ease: "linear",
              }}
              className="
                pointer-events-none
                absolute
                inset-y-0
                w-48
                rotate-12
                bg-white/10
                blur-3xl
              "
            />

            <ProfileWeather primary={primary} secondary={secondary} />
          </div>
        </Reveal>
      </section>

      {/* =====================================================
          ABOUT / BRIDGE SUMMARY
      ===================================================== */}

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
          className="
            mx-auto
            grid
            max-w-[1400px]
            gap-6
            lg:grid-cols-12
          "
        >
          <Reveal className="lg:col-span-7">
            <GlassCard className="h-full p-7 md:p-9">
              <Eyebrow secondary={secondary}>About {firstName}</Eyebrow>

              <h2
                className="
                  mt-4
                  text-3xl
                  font-black
                  tracking-[-0.045em]
                  md:text-4xl
                "
                style={{
                  color: primary,
                }}
              >
                More than a name.
              </h2>

              {bio ? (
                <p
                  className="
                    mt-6
                    max-w-3xl
                    whitespace-pre-wrap
                    text-base
                    font-medium
                    leading-8
                    text-slate-600
                  "
                >
                  {bio}
                </p>
              ) : (
                <div
                  className="
                    mt-6
                    rounded-[26px]
                    border
                    border-dashed
                    border-slate-200
                    bg-slate-50/70
                    p-6
                  "
                >
                  <p className="font-bold text-slate-400">
                    {firstName} hasn’t added an About section yet.
                  </p>
                </div>
              )}
            </GlassCard>
          </Reveal>

          <Reveal delay={0.08} className="lg:col-span-5">
            <motion.div
              whileHover={{
                y: -4,
              }}
              className="
                relative
                h-full
                overflow-hidden
                rounded-[36px]
                p-7
                text-white
                shadow-[0_30px_100px_rgba(7,26,74,.24)]
                md:p-9
              "
              style={{
                background: `linear-gradient(
                  145deg,
                  ${primary} 0%,
                  ${primary} 55%,
                  ${secondary} 145%
                )`,
              }}
            >
              <motion.div
                animate={{
                  rotate: 360,
                }}
                transition={{
                  repeat: Infinity,
                  duration: 24,
                  ease: "linear",
                }}
                className="
                  pointer-events-none
                  absolute
                  -right-28
                  -top-28
                  h-72
                  w-72
                  rounded-full
                  border
                  border-white/10
                "
              />

              <div className="relative z-10">
                <Eyebrow secondary={secondary} light>
                  Bridge Summary
                </Eyebrow>

                <h2
                  className="
                    mt-4
                    text-3xl
                    font-black
                    tracking-[-0.045em]
                    md:text-4xl
                  "
                >
                  Bridge knows more as you participate.
                </h2>

                {aiProfileSummary ? (
                  <p
                    className="
                      mt-6
                      whitespace-pre-wrap
                      text-[15px]
                      font-medium
                      leading-8
                      text-white/80
                    "
                  >
                    {aiProfileSummary}
                  </p>
                ) : (
                  <p
                    className="
                      mt-6
                      text-sm
                      font-semibold
                      leading-7
                      text-white/60
                    "
                  >
                    Bridge will build this summary as your Profile and
                    contributions grow.
                  </p>
                )}

                <div
                  className="
                    mt-7
                    flex
                    items-center
                    gap-3
                    rounded-[22px]
                    border
                    border-white/10
                    bg-white/10
                    px-4
                    py-3
                    backdrop-blur-xl
                  "
                >
                  <motion.span
                    animate={{
                      opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                    }}
                    className="
                      h-2.5
                      w-2.5
                      rounded-full
                      bg-emerald-300
                    "
                  />

                  <p
                    className="
                      text-xs
                      font-black
                      text-white/70
                    "
                  >
                    Living Profile
                  </p>
                </div>
              </div>
            </motion.div>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          EXPERTISE / INTERESTS
      ===================================================== */}

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
          className="
            mx-auto
            grid
            max-w-[1400px]
            gap-6
            lg:grid-cols-12
          "
        >
          <Reveal className="lg:col-span-8">
            <GlassCard className="h-full p-7 md:p-9">
              <Eyebrow secondary={secondary}>Expertise</Eyebrow>

              <div
                className="
                  mt-4
                  flex
                  flex-col
                  gap-3
                  md:flex-row
                  md:items-end
                  md:justify-between
                "
              >
                <div>
                  <h2
                    className="
                      text-3xl
                      font-black
                      tracking-[-0.045em]
                      md:text-4xl
                    "
                    style={{
                      color: primary,
                    }}
                  >
                    Ask {firstName} about
                  </h2>

                  <p
                    className="
                      mt-2
                      max-w-2xl
                      text-sm
                      font-medium
                      leading-6
                      text-slate-500
                    "
                  >
                    Knowledge, experience and topics connected to this Profile.
                  </p>
                </div>

                <span
                  className="
                    w-fit
                    rounded-full
                    bg-slate-50
                    px-4
                    py-2
                    text-[9px]
                    font-black
                    uppercase
                    tracking-[0.16em]
                    text-slate-400
                  "
                >
                  {expertiseItems.length} topics
                </span>
              </div>

              {expertiseItems.length > 0 ? (
                <div
                  className="
                    mt-8
                    flex
                    flex-wrap
                    gap-3
                  "
                >
                  {expertiseItems.map((item, index) => (
                    <motion.span
                      key={`${item}-${index}`}
                      initial={{
                        opacity: 0,
                        scale: 0.8,
                        y: 15,
                      }}
                      whileInView={{
                        opacity: 1,
                        scale: 1,
                        y: 0,
                      }}
                      viewport={{
                        once: true,
                      }}
                      transition={{
                        delay: Math.min(index * 0.035, 0.4),
                      }}
                      whileHover={{
                        y: -5,
                        scale: 1.035,
                      }}
                      className="
                          rounded-full
                          border
                          border-slate-200
                          bg-white
                          px-4
                          py-2.5
                          text-sm
                          font-black
                          shadow-sm
                        "
                      style={{
                        color: primary,
                      }}
                    >
                      <span
                        className="
                            mr-2
                            inline-block
                            h-2
                            w-2
                            rounded-full
                          "
                        style={{
                          backgroundColor: secondary,

                          boxShadow: `0 0 10px ${secondary}`,
                        }}
                      />

                      {item}
                    </motion.span>
                  ))}
                </div>
              ) : (
                <div
                  className="
                    mt-7
                    rounded-[26px]
                    border
                    border-dashed
                    border-slate-200
                    bg-slate-50/70
                    p-6
                    text-sm
                    font-semibold
                    text-slate-400
                  "
                >
                  Expertise hasn’t been added yet.
                </div>
              )}
            </GlassCard>
          </Reveal>

          <Reveal delay={0.08} className="lg:col-span-4">
            <GlassCard className="h-full p-7 md:p-9">
              <Eyebrow secondary={secondary}>Interests</Eyebrow>

              <h2
                className="
                  mt-4
                  text-3xl
                  font-black
                  tracking-[-0.045em]
                "
                style={{
                  color: primary,
                }}
              >
                Curious about
              </h2>

              <p
                className="
                  mt-3
                  text-sm
                  font-medium
                  leading-6
                  text-slate-500
                "
              >
                Interests connected to {firstName}'s activity and Profile.
              </p>

              {interests.length > 0 ? (
                <div
                  className="
                    mt-6
                    flex
                    flex-wrap
                    gap-2
                  "
                >
                  {interests.map((interest, index) => (
                    <motion.span
                      key={`${interest}-${index}`}
                      animate={{
                        y: [0, index % 2 === 0 ? -3 : 3, 0],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 4 + (index % 4),
                        ease: "easeInOut",
                      }}
                      className="
                          rounded-full
                          border
                          border-slate-200
                          bg-white
                          px-3
                          py-2
                          text-xs
                          font-black
                          shadow-sm
                        "
                      style={{
                        color: primary,
                      }}
                    >
                      {interest}
                    </motion.span>
                  ))}
                </div>
              ) : (
                <p
                  className="
                    mt-6
                    rounded-[22px]
                    bg-slate-50
                    p-5
                    text-sm
                    font-semibold
                    text-slate-400
                  "
                >
                  No connected interests yet.
                </p>
              )}
            </GlassCard>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          BRIDGE QUESTIONS
      ===================================================== */}

      <section
        className="
          relative
          z-10
          px-4
          py-5
          md:px-6
        "
      >
        <Reveal>
          <div
            className="
              relative
              mx-auto
              grid
              max-w-[1400px]
              overflow-hidden
              rounded-[42px]
              border
              border-white/70
              bg-white/80
              shadow-[0_32px_105px_rgba(15,23,42,.10)]
              backdrop-blur-3xl
              lg:grid-cols-[.82fr_1.18fr]
            "
          >
            <div
              className="
                relative
                overflow-hidden
                p-7
                text-white
                md:p-10
              "
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
                <Eyebrow secondary={secondary} light>
                  Bridge Questions
                </Eyebrow>

                <h2
                  className="
                    mt-5
                    text-4xl
                    font-black
                    leading-tight
                    tracking-[-0.05em]
                    md:text-5xl
                  "
                >
                  Your experience has value.
                </h2>

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
                  Bridge asks one question at a time. Your answers help your
                  Profile become richer and more useful.
                </p>

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
              </div>
            </div>

            <div className="p-7 md:p-10">
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

                  <textarea
                    value={bridgeAnswer}
                    onChange={(event) => {
                      setBridgeAnswer(event.target.value);

                      if (bridgeQuestionsError) {
                        setBridgeQuestionsError("");
                      }
                    }}
                    rows={6}
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
                      {bridgeAnswer.length}/4000
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
                      {bridgeAnswerSubmitting
                        ? "Submitting..."
                        : "Submit Answer"}
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

              {bridgeQuestionsComplete && (
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
                    <motion.div
                      animate={{
                        rotate: [0, 8, -8, 0],
                      }}
                      transition={{
                        duration: 0.6,
                      }}
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
                    </motion.div>

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
                        You’ve answered all currently available Bridge
                        Questions.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

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

              {!bridgeQuestionsLoading &&
                !bridgeQuestionsError &&
                bridgeQuestions.length === 0 && (
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
        </Reveal>
      </section>

      {/* =====================================================
          CONTRIBUTIONS
      ===================================================== */}

      <section
        className="
          relative
          z-10
          px-4
          py-5
          md:px-6
        "
      >
        <Reveal>
          <GlassCard
            className="
              mx-auto
              max-w-[1400px]
              p-7
              md:p-10
            "
          >
            <div
              className="
                pointer-events-none
                absolute
                -right-36
                -top-36
                h-96
                w-96
                rounded-full
                blur-[120px]
              "
              style={{
                backgroundColor: `${secondary}12`,
              }}
            />

            <div className="relative z-10">
              <div
                className="
                  grid
                  gap-7
                  lg:grid-cols-[minmax(0,1fr)_260px]
                  lg:items-end
                "
              >
                <div>
                  <Eyebrow secondary={secondary}>Shared Through Bridge</Eyebrow>

                  <h2
                    className="
                      mt-4
                      text-4xl
                      font-black
                      tracking-[-0.055em]
                      md:text-6xl
                    "
                    style={{
                      color: primary,
                    }}
                  >
                    Shared by {firstName}
                  </h2>

                  <p
                    className="
                      mt-4
                      max-w-3xl
                      text-sm
                      font-medium
                      leading-7
                      text-slate-500
                      md:text-base
                    "
                  >
                    Ideas, events, resources, classes and other contributions
                    shared with the Bridge community.
                  </p>
                </div>

                <MiniStat
                  value={contributionsLoading ? "…" : liveSharedCount}
                  label="Contributions"
                  primary={primary}
                  secondary={secondary}
                />
              </div>

              {contributionsLoading && (
                <div
                  className="
                    mt-8
                    grid
                    gap-4
                  "
                >
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="
                          animate-pulse
                          rounded-[28px]
                          border
                          border-slate-100
                          bg-white
                          p-6
                        "
                    >
                      <div
                        className="
                            h-3
                            w-24
                            rounded-full
                            bg-slate-100
                          "
                      />

                      <div
                        className="
                            mt-4
                            h-7
                            w-3/4
                            rounded-full
                            bg-slate-100
                          "
                      />

                      <div
                        className="
                            mt-4
                            h-4
                            w-full
                            rounded-full
                            bg-slate-50
                          "
                      />
                    </div>
                  ))}
                </div>
              )}

              {!contributionsLoading && contributionsError && (
                <div
                  className="
                      mt-8
                      rounded-[28px]
                      border
                      border-amber-100
                      bg-amber-50/80
                      p-6
                    "
                >
                  <p
                    className="
                        font-black
                        text-amber-900
                      "
                  >
                    Contributions couldn’t be loaded.
                  </p>

                  <p
                    className="
                        mt-2
                        text-sm
                        font-medium
                        text-amber-700
                      "
                  >
                    {contributionsError}
                  </p>

                  <button
                    type="button"
                    onClick={retryContributions}
                    className="
                        mt-4
                        rounded-full
                        bg-white
                        px-5
                        py-2.5
                        text-sm
                        font-black
                        text-amber-900
                        shadow-sm
                      "
                  >
                    Try again
                  </button>
                </div>
              )}

              {!contributionsLoading &&
                !contributionsError &&
                sharedContributions.length === 0 && (
                  <div
                    className="
                      mt-8
                      rounded-[30px]
                      border
                      border-dashed
                      border-slate-200
                      bg-slate-50/70
                      px-6
                      py-12
                      text-center
                    "
                  >
                    <motion.div
                      animate={{
                        rotate: [0, 8, -8, 0],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 4,
                      }}
                      className="
                        mx-auto
                        flex
                        h-16
                        w-16
                        items-center
                        justify-center
                        rounded-[22px]
                        text-2xl
                      "
                      style={{
                        backgroundColor: `${secondary}12`,
                        color: primary,
                      }}
                    >
                      ✦
                    </motion.div>

                    <h3
                      className="
                        mt-5
                        text-2xl
                        font-black
                      "
                      style={{
                        color: primary,
                      }}
                    >
                      Contributions will appear here.
                    </h3>

                    <p
                      className="
                        mx-auto
                        mt-2
                        max-w-md
                        text-sm
                        font-medium
                        leading-6
                        text-slate-500
                      "
                    >
                      When {firstName} shares content through Bridge, it becomes
                      part of this Profile.
                    </p>
                  </div>
                )}

              {!contributionsLoading &&
                !contributionsError &&
                sharedContributions.length > 0 && (
                  <div
                    className="
                      mt-8
                      grid
                      gap-4
                    "
                  >
                    {sharedContributions.map((contribution, index) => (
                      <ContributionCard
                        key={`${
                          contribution?.link ||
                          contribution?.title ||
                          "contribution"
                        }-${index}`}
                        contribution={contribution}
                        primary={primary}
                        secondary={secondary}
                        index={index}
                      />
                    ))}
                  </div>
                )}
            </div>
          </GlassCard>
        </Reveal>
      </section>

      {/* =====================================================
    BRIDGE CONNECTIONS
===================================================== */}

      {/* =====================================================
    BRIDGE CONNECTIONS MODAL
===================================================== */}

      {showConnectionsPanel && (
        <div
          className="
      fixed
      inset-0
      z-[12000]
      flex
      items-center
      justify-center
      bg-slate-950/45
      p-4
      backdrop-blur-sm
    "
          onClick={() => setShowConnectionsPanel(false)}
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
            className="
        max-h-[85vh]
        w-full
        max-w-4xl
        overflow-y-auto
        rounded-[34px]
        border
        border-white/80
        bg-white/95
        p-6
        shadow-[0_35px_120px_rgba(15,23,42,.30)]
        backdrop-blur-3xl
        md:p-8
      "
          >
            {/* HEADER */}

            <div
              className="
          flex
          items-start
          justify-between
          gap-5
        "
            >
              <div>
                <Eyebrow secondary={secondary}>Bridge Connections</Eyebrow>

                <h2
                  className="
              mt-3
              text-3xl
              font-black
              tracking-[-0.045em]
              md:text-4xl
            "
                  style={{
                    color: primary,
                  }}
                >
                  Your conversations
                </h2>

                <p className="mt-2 text-sm font-medium text-slate-500">
                  Connection requests and conversations facilitated through
                  Bridge.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowConnectionsPanel(false)}
                className="
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-slate-100
            text-xl
            font-black
            text-slate-500
            transition
            hover:bg-slate-200
          "
                aria-label="Close messages"
              >
                ×
              </button>
            </div>

            {/* TABS */}

            <div className="mt-6 flex w-fit gap-2 rounded-full bg-slate-100 p-1.5">
              <button
                type="button"
                onClick={() => setActiveConnectionTab("received")}
                className="
            rounded-full
            px-5
            py-2.5
            text-xs
            font-black
            transition
          "
                style={{
                  color:
                    activeConnectionTab === "received" ? "#ffffff" : primary,

                  backgroundColor:
                    activeConnectionTab === "received"
                      ? primary
                      : "transparent",
                }}
              >
                Received ({receivedConnections.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveConnectionTab("sent")}
                className="
            rounded-full
            px-5
            py-2.5
            text-xs
            font-black
            transition
          "
                style={{
                  color: activeConnectionTab === "sent" ? "#ffffff" : primary,

                  backgroundColor:
                    activeConnectionTab === "sent" ? primary : "transparent",
                }}
              >
                Sent ({sentConnections.length})
              </button>
            </div>

            {/* LOADING */}

            {connectionInboxLoading && (
              <div className="mt-7 space-y-3">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="
                flex
                animate-pulse
                items-center
                gap-4
                rounded-[26px]
                border
                border-slate-100
                bg-slate-50
                p-5
              "
                  >
                    <div className="h-14 w-14 rounded-2xl bg-slate-200" />

                    <div className="flex-1">
                      <div className="h-4 w-40 rounded-full bg-slate-200" />

                      <div className="mt-3 h-3 w-28 rounded-full bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ERROR */}

            {!connectionInboxLoading && connectionInboxError && (
              <div
                className="
            mt-7
            rounded-[24px]
            border
            border-amber-100
            bg-amber-50
            p-5
          "
              >
                <p className="text-sm font-bold text-amber-800">
                  {connectionInboxError}
                </p>
              </div>
            )}

            {/* EMPTY */}

            {!connectionInboxLoading &&
              !connectionInboxError &&
              visibleConnections.length === 0 && (
                <div
                  className="
              mt-7
              rounded-[28px]
              border
              border-dashed
              border-slate-200
              bg-slate-50/70
              p-8
              text-center
            "
                >
                  <p className="text-sm font-bold text-slate-400">
                    No {activeConnectionTab} connections yet.
                  </p>
                </div>
              )}

            {/* CONVERSATIONS */}

            {!connectionInboxLoading &&
              !connectionInboxError &&
              visibleConnections.length > 0 && (
                <div className="mt-7 grid gap-3">
                  {visibleConnections.map((connection) => {
                    const otherMember = connection?.otherMember || {};

                    const otherName =
                      otherMember.fullName ||
                      [otherMember.firstName, otherMember.lastName]
                        .filter(Boolean)
                        .join(" ") ||
                      "Bridge Member";

                    return (
                      <button
                        type="button"
                        key={connection.connectionRecordId}
                        onClick={() => {
                          setShowConnectionsPanel(false);
                          openConnection(connection);
                        }}
                        className={`
                    flex
                    w-full
                    items-center
                    gap-4
                    rounded-[26px]
                    border
                    p-5
                    text-left
                    transition
                    hover:shadow-md
                    ${
                      connection.unread
                        ? "border-blue-200 bg-blue-50 shadow-sm"
                        : "border-slate-100 bg-slate-50/60 hover:bg-white"
                    }
                  `}
                      >
                        <div
                          className="
                      flex
                      h-14
                      w-14
                      shrink-0
                      items-center
                      justify-center
                      overflow-hidden
                      rounded-2xl
                      font-black
                      text-white
                    "
                          style={{
                            background: `linear-gradient(
                        135deg,
                        ${primary},
                        ${secondary}
                      )`,
                          }}
                        >
                          {otherMember.profilePhoto ? (
                            <img
                              src={otherMember.profilePhoto}
                              alt={otherName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getInitials(otherName)
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p
                              className="truncate text-lg font-black"
                              style={{
                                color: primary,
                              }}
                            >
                              {otherName}
                            </p>

                            {connection.unread && (
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                            )}
                          </div>

                          {(otherMember.role ||
                            otherMember.businessOrganization) && (
                            <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                              {otherMember.role}

                              {otherMember.role &&
                              otherMember.businessOrganization
                                ? " · "
                                : ""}

                              {otherMember.businessOrganization}
                            </p>
                          )}

                          <p className="mt-2 truncate text-sm font-semibold text-slate-600">
                            {connection.connectionReason}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {connection.unread && (
                            <span
                              className="
                          rounded-full
                          bg-blue-600
                          px-3
                          py-2
                          text-[10px]
                          font-black
                          uppercase
                          tracking-[0.12em]
                          text-white
                        "
                            >
                              New
                            </span>
                          )}

                          <span
                            className="
                        hidden
                        rounded-full
                        px-3
                        py-2
                        text-[10px]
                        font-black
                        uppercase
                        tracking-[0.12em]
                        sm:inline-flex
                      "
                            style={{
                              color:
                                connection.connectionStatus === "Pending"
                                  ? "#92400e"
                                  : primary,

                              backgroundColor:
                                connection.connectionStatus === "Pending"
                                  ? "#fef3c7"
                                  : `${secondary}12`,
                            }}
                          >
                            {connection.connectionStatus}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
          </motion.div>
        </div>
      )}

      {/* =====================================================
          DETAILS / CONNECT / OPPORTUNITIES
      ===================================================== */}

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
          className="
            mx-auto
            grid
            max-w-[1400px]
            gap-6
            lg:grid-cols-3
          "
        >
          {/* MEMBER DETAILS */}

          <Reveal>
            <GlassCard className="h-full p-7">
              <Eyebrow secondary={secondary}>Member Details</Eyebrow>

              <h3
                className="
                  mt-4
                  text-3xl
                  font-black
                  tracking-[-0.04em]
                "
                style={{
                  color: primary,
                }}
              >
                Profile details
              </h3>

              <div
                className="
                  mt-6
                  divide-y
                  divide-slate-100
                "
              >
                {business && (
                  <div className="py-4 first:pt-0">
                    <p
                      className="
                        text-[9px]
                        font-black
                        uppercase
                        tracking-[0.16em]
                        text-slate-400
                      "
                    >
                      Organization
                    </p>

                    <p
                      className="
                        mt-2
                        font-black
                        text-slate-700
                      "
                    >
                      {business}
                    </p>
                  </div>
                )}

                {role && (
                  <div className="py-4">
                    <p
                      className="
                        text-[9px]
                        font-black
                        uppercase
                        tracking-[0.16em]
                        text-slate-400
                      "
                    >
                      Role
                    </p>

                    <p
                      className="
                        mt-2
                        font-black
                        text-slate-700
                      "
                    >
                      {role}
                    </p>
                  </div>
                )}

                {location && (
                  <div className="py-4">
                    <p
                      className="
                        text-[9px]
                        font-black
                        uppercase
                        tracking-[0.16em]
                        text-slate-400
                      "
                    >
                      Location
                    </p>

                    <p
                      className="
                        mt-2
                        font-black
                        text-slate-700
                      "
                    >
                      {location}
                    </p>
                  </div>
                )}

                {creatorLevel && (
                  <div className="py-4">
                    <p
                      className="
                        text-[9px]
                        font-black
                        uppercase
                        tracking-[0.16em]
                        text-slate-400
                      "
                    >
                      Creator Level
                    </p>

                    <span
                      className="
                        mt-2
                        inline-flex
                        rounded-full
                        px-3
                        py-2
                        text-xs
                        font-black
                      "
                      style={{
                        color: primary,

                        backgroundColor: `${secondary}12`,
                      }}
                    >
                      {creatorLevel}
                    </span>
                  </div>
                )}

                {memberSince && (
                  <div className="py-4">
                    <p
                      className="
                        text-[9px]
                        font-black
                        uppercase
                        tracking-[0.16em]
                        text-slate-400
                      "
                    >
                      Member Since
                    </p>

                    <p
                      className="
                        mt-2
                        font-black
                        text-slate-700
                      "
                    >
                      {memberSince}
                    </p>
                  </div>
                )}
              </div>

              {affiliations.length > 0 && (
                <div
                  className="
                    mt-5
                    border-t
                    border-slate-100
                    pt-5
                  "
                >
                  <p
                    className="
                      text-[9px]
                      font-black
                      uppercase
                      tracking-[0.16em]
                      text-slate-400
                    "
                  >
                    Affiliations
                  </p>

                  <div
                    className="
                      mt-3
                      flex
                      flex-wrap
                      gap-2
                    "
                  >
                    {affiliations.map((affiliation, index) => (
                      <span
                        key={`${affiliation}-${index}`}
                        className="
                            rounded-full
                            bg-slate-50
                            px-3
                            py-2
                            text-xs
                            font-bold
                            text-slate-600
                          "
                      >
                        {affiliation}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          </Reveal>

          {/* CONNECT */}

          <Reveal delay={0.06}>
            <GlassCard className="h-full p-7">
              <Eyebrow secondary={secondary}>Connect</Eyebrow>

              <h3
                className="
                  mt-4
                  text-3xl
                  font-black
                  tracking-[-0.04em]
                "
                style={{
                  color: primary,
                }}
              >
                Connect with {firstName}
              </h3>

              {hasConnectInfo ? (
                <div
                  className="
                    mt-6
                    space-y-3
                  "
                >
                  {websiteUrl && (
                    <ContactCard
                      label="Website"
                      value={getHostnameLabel(websiteUrl)}
                      href={websiteUrl}
                      primary={primary}
                      secondary={secondary}
                      icon="↗"
                    />
                  )}

                  {publicSocialLinks.map((item, index) => {
                    const info = getSocialInfo(item);

                    return (
                      <ContactCard
                        key={`${item.url || item.label}-${index}`}
                        label={info.name}
                        value={item.label || info.name}
                        href={item.url}
                        primary={primary}
                        secondary={secondary}
                        icon={info.icon}
                      />
                    );
                  })}

                  {showEmail && email && (
                    <ContactCard
                      label="Email"
                      value={email}
                      href={`mailto:${email}`}
                      primary={primary}
                      secondary={secondary}
                      icon="@"
                    />
                  )}

                  {showPhone && phone && (
                    <ContactCard
                      label="Phone"
                      value={phone}
                      href={`tel:${phone}`}
                      primary={primary}
                      secondary={secondary}
                      icon="☎"
                    />
                  )}
                </div>
              ) : (
                <p
                  className="
                    mt-6
                    rounded-3xl
                    bg-slate-50
                    p-5
                    text-sm
                    font-semibold
                    leading-6
                    text-slate-400
                  "
                >
                  No public contact information is available.
                </p>
              )}
            </GlassCard>
          </Reveal>

          {/* OPPORTUNITIES */}

          <Reveal delay={0.12}>
            <motion.div
              whileHover={{
                y: -4,
              }}
              className="
                relative
                h-full
                overflow-hidden
                rounded-[34px]
                p-7
                text-white
                shadow-[0_30px_100px_rgba(7,26,74,.22)]
              "
              style={{
                background: openToOpportunities
                  ? `linear-gradient(
                        145deg,
                        ${primary},
                        ${secondary}
                      )`
                  : `linear-gradient(
                        145deg,
                        ${primary},
                        #334155
                      )`,
              }}
            >
              <motion.div
                animate={{
                  x: ["-170%", "220%"],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 7,
                  ease: "linear",
                }}
                className="
                  pointer-events-none
                  absolute
                  inset-y-0
                  w-28
                  rotate-12
                  bg-white/10
                  blur-2xl
                "
              />

              <div className="relative z-10">
                <Eyebrow secondary={secondary} light>
                  Opportunities
                </Eyebrow>

                <h3
                  className="
                    mt-4
                    text-3xl
                    font-black
                    leading-tight
                    tracking-[-0.04em]
                  "
                >
                  {openToOpportunities
                    ? "Open to meaningful connections."
                    : "Growing through Bridge."}
                </h3>

                <p
                  className="
                    mt-4
                    text-sm
                    font-medium
                    leading-7
                    text-white/75
                  "
                >
                  {openToOpportunities
                    ? `${firstName} is open to relevant introductions and opportunities through Bridge.`
                    : `${firstName}'s Profile can continue to grow through participation and contributions.`}
                </p>

                {openToOpportunities && opportunityTypes.length > 0 && (
                  <div
                    className="
                        mt-6
                        flex
                        flex-wrap
                        gap-2
                      "
                  >
                    {opportunityTypes.map((item, index) => (
                      <motion.span
                        whileHover={{
                          y: -3,
                        }}
                        key={`${item}-${index}`}
                        className="
                              rounded-full
                              border
                              border-white/15
                              bg-white/10
                              px-3
                              py-2
                              text-xs
                              font-black
                              text-white/90
                              backdrop-blur-xl
                            "
                      >
                        {item}
                      </motion.span>
                    ))}
                  </div>
                )}

                <div
                  className="
                    mt-7
                    grid
                    grid-cols-2
                    gap-3
                  "
                >
                  <div
                    className="
                      rounded-[22px]
                      border
                      border-white/10
                      bg-white/10
                      p-4
                      backdrop-blur-xl
                    "
                  >
                    <p
                      className="
                        text-[9px]
                        font-black
                        uppercase
                        tracking-[0.16em]
                        text-white/50
                      "
                    >
                      Shared
                    </p>

                    <p
                      className="
                        mt-2
                        text-3xl
                        font-black
                      "
                    >
                      {liveSharedCount}
                    </p>
                  </div>

                  <div
                    className="
                      rounded-[22px]
                      border
                      border-white/10
                      bg-white/10
                      p-4
                      backdrop-blur-xl
                    "
                  >
                    <p
                      className="
                        text-[9px]
                        font-black
                        uppercase
                        tracking-[0.16em]
                        text-white/50
                      "
                    >
                      Strength
                    </p>

                    <p
                      className="
                        mt-2
                        text-3xl
                        font-black
                      "
                    >
                      {profileStrength}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer
        className="
          relative
          z-10
          mt-8
          overflow-hidden
          px-6
          py-14
          text-center
          text-white
        "
        style={{
          background: `linear-gradient(
            135deg,
            ${primary},
            ${secondary}
          )`,
        }}
      >
        <motion.div
          animate={{
            x: ["-140%", "190%"],
          }}
          transition={{
            repeat: Infinity,
            duration: 10,
            ease: "linear",
          }}
          className="
            pointer-events-none
            absolute
            inset-y-0
            w-44
            rotate-12
            bg-white/10
            blur-3xl
          "
        />

        <div
          className="
            relative
            z-10
            mx-auto
            max-w-5xl
          "
        >
          <motion.h3
            whileHover={{
              scale: 1.04,
            }}
            className="
              text-3xl
              font-black
              tracking-[-0.04em]
            "
          >
            BridgeAZ
          </motion.h3>

          <div
            className="
              mx-auto
              mt-4
              h-1
              w-16
              rounded-full
              bg-white/60
            "
          />

          <p
            className="
              mx-auto
              mt-5
              max-w-xl
              text-sm
              font-medium
              leading-7
              text-white/75
            "
          >
            Connecting people, businesses, resources and ideas across our local
            community.
          </p>

          <motion.button
            type="button"
            onClick={onClose}
            whileHover={{
              y: -3,
            }}
            whileTap={{
              scale: 0.98,
            }}
            className="
              mt-7
              rounded-full
              border
              border-white/25
              bg-white/10
              px-7
              py-3
              text-sm
              font-black
              backdrop-blur-xl
              transition
              hover:bg-white/20
            "
          >
            Back to My Page
          </motion.button>
        </div>
      </footer>
    </div>
  );
}
