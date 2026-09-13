import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const API_URL =
  "https://bridgeaz-recommendations-server.vercel.app/api/directory";

const PAGE_SIZE = 5;

const fallbackTheme = {
  primary: "#2F66D0",
  secondary: "#F4C900",
};

/* =========================================================
   HELPERS
========================================================= */

function cleanText(value) {
  return String(value || "").trim();
}

function getDisplayName(member) {
  const fullName = cleanText(member?.fullName);

  if (fullName) {
    return fullName;
  }

  const name = [cleanText(member?.firstName), cleanText(member?.lastName)]
    .filter(Boolean)
    .join(" ");

  return name || "Bridge Member";
}

function getInitials(member) {
  return getDisplayName(member)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getLocation(member) {
  return [cleanText(member?.city), cleanText(member?.state)]
    .filter(Boolean)
    .join(", ");
}

function normalizeExternalUrl(value) {
  const text = cleanText(value);

  if (!text) {
    return "";
  }

  if (/^https?:\/\//i.test(text)) {
    return text;
  }

  if (/^www\./i.test(text)) {
    return `https://${text}`;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(text)) {
    return `https://${text}`;
  }

  return "";
}

function normalizeWebsite(value) {
  return normalizeExternalUrl(value);
}

function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function splitValues(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map(cleanText).filter(Boolean);
  }

  return String(value)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/* =========================================================
   SOCIAL MEDIA
========================================================= */

function parseSocialLinks(value) {
  if (!value) {
    return [];
  }

  const rawItems = Array.isArray(value)
    ? value
    : String(value).split(/\r?\n|;/);

  const parsed = [];

  rawItems.forEach((rawItem) => {
    const line = cleanText(rawItem);

    if (!line) {
      return;
    }

    /*
      Finds:
      https://linkedin.com/...
      http://facebook.com/...
      www.instagram.com/...
    */

    const matches = [...line.matchAll(/(?:https?:\/\/|www\.)[^\s,]+/gi)];

    if (matches.length > 0) {
      matches.forEach((match, index) => {
        const rawUrl = match[0].replace(/[),.;]+$/, "");

        const url = normalizeExternalUrl(rawUrl);

        if (!url) {
          return;
        }

        let label = "";

        if (index === 0 && match.index > 0) {
          label = line
            .slice(0, match.index)
            .replace(/[:\-–—,\s]+$/, "")
            .trim();
        }

        parsed.push({
          label,
          url,
        });
      });

      return;
    }

    /*
      Handles a simple value like:
      google.com
      linkedin.com/in/name
    */

    const url = normalizeExternalUrl(line);

    if (url) {
      parsed.push({
        label: "",
        url,
      });
    }
  });

  /*
    Remove duplicate URLs.
  */

  const seen = new Set();

  return parsed.filter((item) => {
    const key = item.url.toLowerCase().replace(/\/$/, "");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

function getSocialMeta(item) {
  const value = `${item?.label || ""} ${item?.url || ""}`.toLowerCase();

  if (value.includes("linkedin")) {
    return {
      name: "LinkedIn",
      shortName: "LinkedIn",
      icon: "in",
    };
  }

  if (value.includes("facebook")) {
    return {
      name: "Facebook",
      shortName: "Facebook",
      icon: "f",
    };
  }

  if (value.includes("instagram")) {
    return {
      name: "Instagram",
      shortName: "Instagram",
      icon: "◎",
    };
  }

  if (value.includes("youtube") || value.includes("youtu.be")) {
    return {
      name: "YouTube",
      shortName: "YouTube",
      icon: "▶",
    };
  }

  if (value.includes("twitter.com") || value.includes("x.com")) {
    return {
      name: "X",
      shortName: "X",
      icon: "𝕏",
    };
  }

  if (value.includes("tiktok")) {
    return {
      name: "TikTok",
      shortName: "TikTok",
      icon: "♪",
    };
  }

  const hostname = getHostname(item?.url);

  return {
    name: hostname || item?.label || "Social Link",
    shortName: hostname || "Social",
    icon: "↗",
  };
}

/* =========================================================
   ICONS
========================================================= */

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
    >
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
    >
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.3 19.3 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7A2 2 0 0 1 22 16.9Z" />
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
      className="h-4 w-4"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18" />
      <path d="M12 3a15 15 0 0 0 0 18" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path
        d="M12 3l1.3 4.2L17.5 9l-4.2 1.8L12 15l-1.3-4.2L6.5 9l4.2-1.8L12 3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M18.5 15.5l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <motion.svg
      animate={{
        rotate: open ? 180 : 0,
      }}
      transition={{
        duration: 0.22,
      }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
    >
      <path d="m6 9 6 6 6-6" />
    </motion.svg>
  );
}

/* =========================================================
   MEMBER AVATAR
========================================================= */

function MemberAvatar({ member, theme }) {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState("");

  const photo = cleanText(member?.profilePhoto);

  const showImage = Boolean(photo) && failedPhotoUrl !== photo;

  return (
    <div className="relative h-[70px] w-[70px] shrink-0">
      <div
        className="
          absolute
          inset-[-4px]
          rounded-[23px]
          opacity-40
          blur-[9px]
        "
        style={{
          background: `linear-gradient(
            135deg,
            ${theme.primary},
            ${theme.secondary}
          )`,
        }}
      />

      <div
        className="
          relative
          h-full
          w-full
          overflow-hidden
          rounded-[20px]
          border-[3px]
          border-white
          bg-white
          shadow-[0_10px_30px_rgba(7,26,74,.16)]
        "
      >
        {showImage ? (
          <img
            key={photo}
            src={photo}
            alt={getDisplayName(member)}
            loading="lazy"
            onError={() => setFailedPhotoUrl(photo)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="
              flex
              h-full
              w-full
              items-center
              justify-center
              text-lg
              font-black
              text-white
            "
            style={{
              background: `linear-gradient(
                135deg,
                ${theme.primary},
                ${theme.secondary}
              )`,
            }}
          >
            {getInitials(member)}
          </div>
        )}
      </div>

      {member?.openToOpportunities && (
        <motion.span
          animate={{
            scale: [1, 1.3, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 2.2,
          }}
          title="Open to opportunities"
          className="
            absolute
            -bottom-1
            -right-1
            h-4
            w-4
            rounded-full
            border-[3px]
            border-white
            bg-emerald-500
          "
        />
      )}
    </div>
  );
}

/* =========================================================
   EXPERTISE TAG
========================================================= */

function ExpertiseTag({ children, theme }) {
  return (
    <motion.span
      whileHover={{
        y: -2,
      }}
      className="
        inline-flex
        max-w-full
        items-center
        gap-2
        rounded-full
        border
        border-slate-200
        bg-white
        px-3
        py-1.5
        text-[10px]
        font-black
        text-slate-600
        shadow-sm
      "
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          backgroundColor: theme.secondary,
        }}
      />

      <span className="truncate">{children}</span>
    </motion.span>
  );
}

/* =========================================================
   CONNECTION BUTTON
========================================================= */

function ConnectItem({ icon, label, value, href, theme }) {
  return (
    <motion.a
      href={href}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      whileHover={{
        y: -2,
        x: 1,
      }}
      whileTap={{
        scale: 0.99,
      }}
      className="
        group
        flex
        min-w-0
        items-center
        gap-3
        rounded-[17px]
        border
        border-slate-100
        bg-white
        px-3
        py-3
        shadow-sm
        transition
        hover:border-blue-100
        hover:shadow-[0_10px_28px_rgba(15,23,42,.08)]
      "
    >
      <div
        className="
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-[12px]
          text-xs
          font-black
          text-white
        "
        style={{
          background: `linear-gradient(
            135deg,
            ${theme.primary},
            ${theme.secondary}
          )`,
        }}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="
            text-[8px]
            font-black
            uppercase
            tracking-[0.16em]
            text-slate-400
          "
        >
          {label}
        </p>

        <p
          className="
            mt-0.5
            truncate
            text-xs
            font-black
            text-[#071A4A]
          "
        >
          {value}
        </p>
      </div>

      <span
        className="
          shrink-0
          text-sm
          text-slate-300
          transition-transform
          group-hover:translate-x-1
        "
      >
        ↗
      </span>
    </motion.a>
  );
}

/* =========================================================
   SOCIAL PILL
========================================================= */

function SocialPill({ item, theme }) {
  const meta = getSocialMeta(item);

  return (
    <motion.a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{
        y: -2,
        scale: 1.015,
      }}
      whileTap={{
        scale: 0.98,
      }}
      className="
        inline-flex
        min-w-0
        items-center
        gap-2
        rounded-full
        border
        border-slate-200
        bg-white
        px-3
        py-2
        text-[10px]
        font-black
        text-slate-600
        shadow-sm
        transition
        hover:border-blue-200
        hover:shadow-md
      "
    >
      <span
        className="
          flex
          h-6
          w-6
          shrink-0
          items-center
          justify-center
          rounded-full
          text-[9px]
          font-black
          text-white
        "
        style={{
          background: `linear-gradient(
            135deg,
            ${theme.primary},
            ${theme.secondary}
          )`,
        }}
      >
        {meta.icon}
      </span>

      <span className="truncate">{meta.name}</span>

      <span className="text-slate-300">↗</span>
    </motion.a>
  );
}

/* =========================================================
   MEMBER ROW
========================================================= */

function MemberRow({ member, theme, index, expanded, onToggle, viewerToken }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followSubmitting, setFollowSubmitting] = useState(false);
  const [followError, setFollowError] = useState("");
const [selectedFollowContentTypes, setSelectedFollowContentTypes] = useState([
  "Everything",
]);
  const [showFollowOptions, setShowFollowOptions] = useState(false);

  useEffect(() => {
    if (!viewerToken || !member?.profileMemberId) {
      return;
    }

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
              followingMemberRecordId: member.profileMemberId,
            }),
          },
        );

        const result = await response.json();

        if (response.ok && result?.success === true) {
          setIsFollowing(result.following === true);
        }
      } catch (error) {
        console.error("Follow status error:", error);
      }
    }

    loadFollowStatus();
  }, [viewerToken, member?.profileMemberId]);

  const name = getDisplayName(member);

  const role = cleanText(member?.role);

  const business = cleanText(member?.businessOrganization);

  const location = getLocation(member);

  const website = normalizeWebsite(member?.website);

  const expertise = splitValues(member?.expertise);

  const opportunityTypes = splitValues(member?.opportunityTypes);

  /*
    This reads ONLY the socialLinks field returned from
    /api/directory.

    If privacy is OFF, backend should return "".
  */

  const socialLinks = useMemo(
    () => parseSocialLinks(member?.socialLinks),
    [member?.socialLinks],
  );

  const summary =
    cleanText(member?.aiProfileSummary) ||
    cleanText(member?.profileBio) ||
    cleanText(member?.profileStatus);

  const hasConnect =
    Boolean(website) ||
    Boolean(member?.email) ||
    Boolean(member?.phone) ||
    socialLinks.length > 0;
  
  async function handleFollow() {
    if (!viewerToken || !member?.profileMemberId || followSubmitting) {
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
            followingMemberRecordId: member.profileMemberId,
            followContentType: selectedFollowContentTypes,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || result?.success !== true) {
        throw new Error(result?.error || "Could not follow this member.");
      }

      setIsFollowing(true);
    } catch (error) {
      console.error("Follow error:", error);

      setFollowError(
        error?.message || "Could not follow this member. Please try again.",
      );
    } finally {
      setFollowSubmitting(false);
    }
  }

  async function handleUnfollow() {
    if (!viewerToken || !member?.profileMemberId || followSubmitting) {
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
            followingMemberRecordId: member.profileMemberId,
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
      console.error("Unfollow error:", error);

      setFollowError(
        error?.message || "Could not unfollow this member. Please try again.",
      );
    } finally {
      setFollowSubmitting(false);
    }
  }

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

  return (
    <motion.article
      layout
      initial={{
        opacity: 0,
        y: 16,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.38,
        delay: Math.min(index * 0.04, 0.18),
      }}
      className="
        group
        relative
        overflow-hidden
        border-b
        border-slate-100
        bg-white/70
        last:border-b-0
      "
    >
      {/* LEFT HOVER ACCENT */}

      <div
        className="
          pointer-events-none
          absolute
          inset-y-0
          left-0
          w-[3px]
          opacity-0
          transition-opacity
          duration-300
          group-hover:opacity-100
        "
        style={{
          background: `linear-gradient(
            180deg,
            ${theme.primary},
            ${theme.secondary}
          )`,
        }}
      />

      {/* =================================================
          MAIN DIRECTORY ROW
      ================================================= */}

      <div
        className="
          relative
          grid
          gap-5
          px-5
          py-5
          transition-colors
          duration-300
          hover:bg-slate-50/70
          md:px-7
          xl:grid-cols-[minmax(300px,1.2fr)_minmax(300px,1.25fr)_minmax(210px,.75fr)_145px]
          xl:items-center
        "
      >
        {/* MEMBER */}

        <div className="flex min-w-0 items-center gap-4">
          <MemberAvatar member={member} theme={theme} />

          <div className="min-w-0">
            <h3
              className="
                truncate
                text-lg
                font-black
                tracking-[-0.025em]
                text-[#071A4A]
                md:text-xl
              "
            >
              {name}
            </h3>

            {role && (
              <p
                className="
                  mt-1
                  truncate
                  text-sm
                  font-black
                "
                style={{
                  color: theme.primary,
                }}
              >
                {role}
              </p>
            )}

            {business && (
              <p
                className="
                  mt-1
                  truncate
                  text-xs
                  font-semibold
                  text-slate-500
                "
              >
                {business}
              </p>
            )}

            {!role && !business && (
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Bridge community member
              </p>
            )}
          </div>
        </div>

        {/* EXPERTISE */}

        <div className="min-w-0">
          <p
            className="
              mb-2
              text-[8px]
              font-black
              uppercase
              tracking-[0.16em]
              text-slate-300
              xl:hidden
            "
          >
            Expertise
          </p>

          {expertise.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {expertise.slice(0, 3).map((item) => (
                <ExpertiseTag key={item} theme={theme}>
                  {item}
                </ExpertiseTag>
              ))}

              {expertise.length > 3 && (
                <span
                  className="
                    inline-flex
                    items-center
                    rounded-full
                    bg-slate-100
                    px-3
                    py-1.5
                    text-[10px]
                    font-black
                    text-slate-500
                  "
                >
                  +{expertise.length - 3}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm font-medium text-slate-300">
              Profile details coming soon
            </span>
          )}
        </div>

        {/* CONNECTION */}

        <div className="min-w-0">
          {location && (
            <div
              className="
                flex
                items-center
                gap-2
                text-sm
                font-semibold
                text-slate-500
              "
            >
              <MapPinIcon />

              <span className="truncate">{location}</span>
            </div>
          )}

          {member?.openToOpportunities && (
            <div className={location ? "mt-2" : ""}>
              <span
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  bg-emerald-50
                  px-3
                  py-1.5
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.1em]
                  text-emerald-700
                "
              >
                <span
                  className="
                    h-1.5
                    w-1.5
                    rounded-full
                    bg-emerald-500
                  "
                />
                Open
              </span>
            </div>
          )}

          {!location && !member?.openToOpportunities && (
            <span className="text-sm font-medium text-slate-300">—</span>
          )}
        </div>

        {/* QUICK VIEW */}

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <motion.button
            type="button"
            onClick={() => {
              if (isFollowing) {
                handleUnfollow();
              } else {
                setShowFollowOptions((current) => !current);
              }
            }}
            disabled={
              followSubmitting || !viewerToken || !member?.profileMemberId
            }
            whileHover={
              isFollowing || followSubmitting
                ? undefined
                : {
                    y: -2,
                  }
            }
            whileTap={
              isFollowing || followSubmitting
                ? undefined
                : {
                    scale: 0.97,
                  }
            }
            className="
    inline-flex
    h-10
    items-center
    justify-center
    rounded-full
    border
    px-4
    text-xs
    font-black
    transition
    disabled:cursor-default
  "
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
          </motion.button>
          <motion.button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            whileHover={{
              y: -2,
            }}
            whileTap={{
              scale: 0.97,
            }}
            className="
              inline-flex
              h-10
              items-center
              justify-center
              gap-2
              rounded-full
              px-5
              text-xs
              font-black
              text-white
              shadow-[0_10px_24px_rgba(47,102,208,.18)]
            "
            style={{
              background: `linear-gradient(
                135deg,
                ${theme.primary},
                ${theme.primary}DD
              )`,
            }}
          >
            {expanded ? "Close" : "Quick View"}

            <ChevronIcon open={expanded} />
          </motion.button>
        </div>

        {showFollowOptions && !isFollowing && (
          <div className="xl:col-span-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black text-[#071A4A]">
              What would you like to follow?
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
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
                    onClick={() => toggleFollowContentType(type)}
                    className="
          inline-flex
          items-center
          justify-center
          rounded-full
          border
          px-4
          py-2
          text-xs
          font-black
          transition
        "
                    style={{
                      color: selected ? "#FFFFFF" : theme.primary,
                      backgroundColor: selected ? theme.primary : "#FFFFFF",
                      borderColor: selected
                        ? theme.primary
                        : `${theme.primary}33`,
                    }}
                  >
                    {selected ? "✓ " : ""}
                    {type}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleFollow}
              disabled={followSubmitting}
              className="mt-4 rounded-full px-5 py-2.5 text-xs font-black text-white disabled:opacity-60"
              style={{ backgroundColor: theme.primary }}
            >
              {followSubmitting ? "Following..." : "Confirm Follow"}
            </button>
          </div>
        )}
        {followError && (
          <p className="w-full text-[10px] font-bold text-rose-600 xl:text-right">
            {followError}
          </p>
        )}
      </div>

      {/* =================================================
          FULL WIDTH QUICK VIEW
      ================================================= */}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{
              opacity: 0,
              height: 0,
            }}
            animate={{
              opacity: 1,
              height: "auto",
            }}
            exit={{
              opacity: 0,
              height: 0,
            }}
            transition={{
              duration: 0.34,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="overflow-hidden"
          >
            <div
              className="
                relative
                border-t
                border-slate-100
                bg-[#F7F9FC]
                px-5
                py-5
                md:px-7
              "
            >
              {/* subtle background accent */}

              <div
                className="
                  pointer-events-none
                  absolute
                  -right-24
                  -top-24
                  h-56
                  w-56
                  rounded-full
                  opacity-[0.06]
                  blur-[70px]
                "
                style={{
                  backgroundColor: theme.primary,
                }}
              />

              <div
                className="
                  relative
                  z-10
                  grid
                  items-start
                  gap-4
                  xl:grid-cols-12
                "
              >
                {/* =====================================
                    ABOUT
                ===================================== */}

                <section
                  className="
                    self-start
                    rounded-[22px]
                    border
                    border-white
                    bg-white/90
                    p-5
                    shadow-[0_10px_30px_rgba(15,23,42,.045)]
                    xl:col-span-5
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-4
                    "
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="
                          flex
                          h-9
                          w-9
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                        "
                        style={{
                          color: theme.primary,
                          backgroundColor: `${theme.primary}0D`,
                        }}
                      >
                        <SparkIcon />
                      </div>

                      <div className="min-w-0">
                        <p
                          className="
                            text-[8px]
                            font-black
                            uppercase
                            tracking-[0.18em]
                            text-slate-400
                          "
                        >
                          About
                        </p>

                        <h4
                          className="
                            mt-0.5
                            truncate
                            text-sm
                            font-black
                            text-[#071A4A]
                          "
                        >
                          About {name}
                        </h4>
                      </div>
                    </div>

                    {location && (
                      <span
                        className="
                          hidden
                          max-w-[180px]
                          items-center
                          gap-1.5
                          truncate
                          rounded-full
                          bg-slate-50
                          px-3
                          py-1.5
                          text-[9px]
                          font-bold
                          text-slate-400
                          sm:inline-flex
                        "
                      >
                        <MapPinIcon />
                        <span className="truncate">{location}</span>
                      </span>
                    )}
                  </div>

                  {summary ? (
                    <p
                      className="
                        mt-4
                        line-clamp-5
                        text-[13px]
                        font-medium
                        leading-6
                        text-slate-600
                      "
                    >
                      {summary}
                    </p>
                  ) : (
                    <p
                      className="
                        mt-4
                        text-[13px]
                        font-medium
                        leading-6
                        text-slate-400
                      "
                    >
                      More information will appear as this member builds their
                      Bridge Profile.
                    </p>
                  )}

                  {expertise.length > 0 && (
                    <div
                      className="
                        mt-4
                        border-t
                        border-slate-100
                        pt-4
                      "
                    >
                      <div
                        className="
                          flex
                          items-center
                          justify-between
                          gap-3
                        "
                      >
                        <p
                          className="
                            text-[8px]
                            font-black
                            uppercase
                            tracking-[0.18em]
                            text-slate-400
                          "
                        >
                          Ask me about
                        </p>

                        <span
                          className="
                            text-[8px]
                            font-black
                            uppercase
                            tracking-[0.12em]
                            text-slate-300
                          "
                        >
                          {expertise.length} topics
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {expertise.slice(0, 6).map((item) => (
                          <ExpertiseTag key={item} theme={theme}>
                            {item}
                          </ExpertiseTag>
                        ))}

                        {expertise.length > 6 && (
                          <span
                            className="
                              inline-flex
                              items-center
                              rounded-full
                              bg-slate-100
                              px-3
                              py-1.5
                              text-[10px]
                              font-black
                              text-slate-500
                            "
                          >
                            +{expertise.length - 6}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                {/* =====================================
                    CONNECT
                ===================================== */}

                <section
                  className="
                    self-start
                    rounded-[22px]
                    border
                    border-white
                    bg-white/90
                    p-5
                    shadow-[0_10px_30px_rgba(15,23,42,.045)]
                    xl:col-span-3
                  "
                >
                  <div
                    className="
                      flex
                      items-start
                      justify-between
                      gap-3
                    "
                  >
                    <div>
                      <p
                        className="
                          text-[8px]
                          font-black
                          uppercase
                          tracking-[0.18em]
                          text-slate-400
                        "
                      >
                        Connect
                      </p>

                      <h4
                        className="
                          mt-0.5
                          text-sm
                          font-black
                          text-[#071A4A]
                        "
                      >
                        Public connections
                      </h4>
                    </div>

                    {hasConnect && (
                      <span
                        className="
                          shrink-0
                          rounded-full
                          bg-emerald-50
                          px-2.5
                          py-1
                          text-[8px]
                          font-black
                          uppercase
                          tracking-[0.12em]
                          text-emerald-700
                        "
                      >
                        Shared
                      </span>
                    )}
                  </div>

                  {hasConnect ? (
                    <>
                      <div
                        className="
                        mt-4
    grid
    grid-cols-1
    gap-2
                        "
                      >
                        {website && (
                          <ConnectItem
                            label="Website"
                            value={getHostname(website) || "Visit website"}
                            href={website}
                            theme={theme}
                            icon={<GlobeIcon />}
                          />
                        )}

                        {member?.email && (
                          <ConnectItem
                            label="Email"
                            value={member.email}
                            href={`mailto:${member.email}`}
                            theme={theme}
                            icon={<MailIcon />}
                          />
                        )}

                        {member?.phone && (
                          <ConnectItem
                            label="Phone"
                            value={member.phone}
                            href={`tel:${member.phone}`}
                            theme={theme}
                            icon={<PhoneIcon />}
                          />
                        )}
                      </div>

                      {socialLinks.length > 0 && (
                        <div
                          className="
                            mt-4
                            border-t
                            border-slate-100
                            pt-4
                          "
                        >
                          <p
                            className="
                              text-[8px]
                              font-black
                              uppercase
                              tracking-[0.18em]
                              text-slate-400
                            "
                          >
                            Social
                          </p>

                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {socialLinks.map((item, socialIndex) => (
                              <SocialPill
                                key={`${item.url}-${socialIndex}`}
                                item={item}
                                theme={theme}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      className="
                        mt-4
                        rounded-[17px]
                        border
                        border-dashed
                        border-slate-200
                        bg-slate-50
                        px-4
                        py-4
                      "
                    >
                      <p
                        className="
                          text-xs
                          font-medium
                          leading-5
                          text-slate-400
                        "
                      >
                        This member has not shared public contact information.
                      </p>
                    </div>
                  )}
                </section>

                {/* =====================================
                    OPPORTUNITIES
                ===================================== */}

                <section
                  className="
    relative
    self-start
    overflow-hidden
    rounded-3xl
    border
    border-white/10
    p-6
    text-white
    shadow-[0_18px_55px_rgba(7,26,74,.20)]
    xl:col-span-4
  "
                  style={{
                    background: member?.openToOpportunities
                      ? `linear-gradient(
          135deg,
          ${theme.primary} 0%,
          #10275f 48%,
          #071A4A 100%
        )`
                      : "linear-gradient(135deg, #334155 0%, #0f172a 100%)",
                  }}
                >
                  {/* Background glow */}
                  <div
                    className="
      pointer-events-none
      absolute
      -right-12
      -top-16
      h-48
      w-48
      rounded-full
      bg-white/10
      blur-[55px]
    "
                  />

                  <div
                    className="
      pointer-events-none
      absolute
      -bottom-20
      -left-10
      h-44
      w-44
      rounded-full
      bg-cyan-300/10
      blur-[60px]
    "
                  />

                  <div className="relative z-10">
                    {/* Header */}
                    <div
                      className="
    flex
    flex-col
    items-start
    gap-3
    sm:flex-row
    sm:items-start
    sm:justify-between
    sm:gap-4
  "
                    >
                      <div>
                        <p
                          className="
            text-[9px]
            font-black
            uppercase
            tracking-[0.22em]
            text-white/50
          "
                        >
                          Opportunities
                        </p>

                        <h4
                          className="
            mt-2
            text-[22px]
            font-black
            tracking-[-0.035em]
          "
                        >
                          {member?.openToOpportunities
                            ? "Open to opportunities"
                            : "Not currently open"}
                        </h4>
                      </div>

                      {member?.openToOpportunities && (
                        <div
                          className="
            flex
            items-center
            gap-2
            rounded-full
            border
            border-emerald-300/20
            bg-emerald-300/10
            px-3
            py-1.5
            text-[9px]
            font-black
            uppercase
            tracking-[0.12em]
            text-emerald-200
            backdrop-blur-xl
          "
                        >
                          <motion.span
                            animate={{
                              scale: [1, 1.4, 1],
                              opacity: [0.65, 1, 0.65],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 2,
                            }}
                            className="
              h-2
              w-2
              rounded-full
              bg-emerald-300
              shadow-[0_0_12px_rgba(110,231,183,.9)]
            "
                          />
                          Available
                        </div>
                      )}
                    </div>

                    {/* Opportunity types */}
                    {member?.openToOpportunities ? (
                      <>
                        {opportunityTypes.length > 0 ? (
                          <div className="mt-5 flex flex-wrap gap-2">
                            {opportunityTypes.slice(0, 6).map((item) => (
                              <span
                                key={item}
                                className="
                  rounded-xl
                  border
                  border-white/12
                  bg-white/9
                  px-3.5
                  py-2
                  text-[10px]
                  font-bold
                  text-white/90
                  shadow-[inset_0_1px_0_rgba(255,255,255,.08)]
                  backdrop-blur-xl
                  transition
                  duration-200
                  hover:bg-white/[0.14]
                "
                              >
                                {item}
                              </span>
                            ))}

                            {opportunityTypes.length > 6 && (
                              <span
                                className="
                  rounded-xl
                  border
                  border-white/12
                  bg-white/[0.07]
                  px-3.5
                  py-2
                  text-[10px]
                  font-bold
                  text-white/65
                "
                              >
                                +{opportunityTypes.length - 6} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <p
                            className="
              mt-4
              max-w-xl
              text-xs
              font-medium
              leading-5
              text-white/65
            "
                          >
                            This member is open to relevant introductions and
                            new opportunities through Bridge.
                          </p>
                        )}
                      </>
                    ) : (
                      <p
                        className="
          mt-4
          max-w-xl
          text-xs
          font-medium
          leading-5
          text-white/60
        "
                      >
                        This member is not currently listing opportunity
                        preferences.
                      </p>
                    )}

                    {/* Location */}
                    {location && (
                      <div
                        className="
          mt-5
          flex
          items-center
          gap-2.5
          border-t
          border-white/10
          pt-4
        "
                      >
                        <div
                          className="
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-lg
            border
            border-white/10
            bg-white/[0.08]
            text-white/75
            backdrop-blur-xl
          "
                        >
                          <MapPinIcon />
                        </div>

                        <div className="min-w-0">
                          <p
                            className="
              text-[8px]
              font-black
              uppercase
              tracking-[0.18em]
              text-white/40
            "
                          >
                            Location
                          </p>

                          <p
                            className="
              mt-0.5
              truncate
              text-[11px]
              font-bold
              text-white/80
            "
                          >
                            {location}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

/* =========================================================
   SKELETON
========================================================= */

function DirectorySkeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({
        length: PAGE_SIZE,
      }).map((_, index) => (
        <div
          key={index}
          className="
            animate-pulse
            px-5
            py-5
            md:px-7
          "
        >
          <div className="flex items-center gap-4">
            <div
              className="
                h-[70px]
                w-[70px]
                shrink-0
                rounded-[20px]
                bg-slate-200
              "
            />

            <div className="flex-1">
              <div
                className="
                  h-4
                  w-48
                  rounded-full
                  bg-slate-200
                "
              />

              <div
                className="
                  mt-3
                  h-3
                  w-32
                  rounded-full
                  bg-slate-100
                "
              />

              <div
                className="
                  mt-3
                  h-3
                  w-64
                  max-w-full
                  rounded-full
                  bg-slate-100
                "
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   MAIN DIRECTORY
========================================================= */

export default function LocalDirectory({ theme: suppliedTheme, viewerToken }) {
  const theme = {
    ...fallbackTheme,
    ...(suppliedTheme || {}),
  };

  const directoryRef = useRef(null);

  const [members, setMembers] = useState([]);

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [expandedMember, setExpandedMember] = useState(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  /* =======================================================
     LOAD DIRECTORY
  ======================================================= */

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(
      async () => {
        try {
          setLoading(true);

          const params = new URLSearchParams();

          params.set("page", String(page));

          params.set("limit", String(PAGE_SIZE));

          if (search.trim()) {
            params.set("search", search.trim());
          }

          const response = await fetch(`${API_URL}?${params.toString()}`, {
            signal: controller.signal,
            cache: "no-store",
          });

          if (!response.ok) {
            throw new Error("Could not load directory");
          }

          const data = await response.json();

          if (!data?.success) {
            throw new Error(data?.error || "Could not load directory");
          }

          setMembers(Array.isArray(data.members) ? data.members : []);

          setPagination({
            page: Number(data.pagination?.page) || page,

            limit: Number(data.pagination?.limit) || PAGE_SIZE,

            total: Number(data.pagination?.total) || 0,

            totalPages: Number(data.pagination?.totalPages) || 0,

            hasNextPage: data.pagination?.hasNextPage === true,

            hasPreviousPage: data.pagination?.hasPreviousPage === true,
          });

          setExpandedMember(null);

          setError("");
        } catch (fetchError) {
          if (fetchError.name !== "AbortError") {
            console.error("Directory load error:", fetchError);

            setError("We couldn't load the Bridge Directory right now.");

            setMembers([]);
          }
        } finally {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        }
      },

      search ? 300 : 40,
    );

    return () => {
      clearTimeout(timer);

      controller.abort();
    };
  }, [page, search]);

  /* =======================================================
     EVENTS
  ======================================================= */

  function handleSearchChange(event) {
    setSearch(event.target.value);

    setPage(1);

    setExpandedMember(null);
  }

  function clearSearch() {
    setSearch("");

    setPage(1);

    setExpandedMember(null);
  }

  function changePage(nextPage) {
    if (nextPage < 1) {
      return;
    }

    if (pagination.totalPages && nextPage > pagination.totalPages) {
      return;
    }

    setPage(nextPage);

    setExpandedMember(null);

    window.setTimeout(() => {
      directoryRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  /* =======================================================
     PAGE NUMBERS
  ======================================================= */

  const pageNumbers = useMemo(() => {
    const totalPages = pagination.totalPages;

    if (totalPages <= 1) {
      return [];
    }

    const numbers = [];

    const start = Math.max(1, page - 2);

    const end = Math.min(totalPages, page + 2);

    for (let current = start; current <= end; current += 1) {
      numbers.push(current);
    }

    return numbers;
  }, [page, pagination.totalPages]);

  const startNumber =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;

  const endNumber = Math.min(
    pagination.page * pagination.limit,

    pagination.total,
  );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section
      ref={directoryRef}
      className="
        relative
        overflow-hidden
        border-t
        border-white/60
        px-4
        pb-24
        pt-16
        md:px-6
      "
    >
      {/* BACKGROUND */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
        "
        style={{
          background: `
            radial-gradient(
              circle at 10% 10%,
              ${theme.primary}10,
              transparent 28%
            ),
            radial-gradient(
              circle at 92% 15%,
              ${theme.secondary}12,
              transparent 26%
            ),
            linear-gradient(
              180deg,
              #ffffff,
              #f8fafc
            )
          `,
        }}
      />

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          opacity-[0.025]
        "
        style={{
          backgroundImage: `
            linear-gradient(
              ${theme.primary} 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              ${theme.primary} 1px,
              transparent 1px
            )
          `,

          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative mx-auto max-w-[1450px]">
        {/* =================================================
            HERO
        ================================================= */}

        <motion.div
          initial={{
            opacity: 0,
            y: 25,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            duration: 0.6,
          }}
          className="
            mx-auto
            max-w-5xl
            text-center
          "
        >
          <div
            className="
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-white
              bg-white/75
              px-4
              py-2
              text-[10px]
              font-black
              uppercase
              tracking-[0.22em]
              shadow-sm
              backdrop-blur-xl
            "
            style={{
              color: theme.primary,
            }}
          >
            <motion.span
              animate={{
                scale: [1, 1.5, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 2,
              }}
              className="
                h-2
                w-2
                rounded-full
              "
              style={{
                backgroundColor: theme.secondary,
              }}
            />
            BridgeAZ Directory
          </div>

          <h1
            className="
              mt-6
              text-4xl
              font-black
              tracking-[-0.05em]
              text-[#071A4A]
              sm:text-5xl
              lg:text-6xl
            "
          >
            People worth{" "}
            <span
              style={{
                color: theme.primary,
              }}
            >
              discovering.
            </span>
          </h1>

          <p
            className="
              mx-auto
              mt-4
              max-w-3xl
              text-base
              font-medium
              leading-7
              text-slate-500
            "
          >
            Find people, organizations, expertise and opportunities across the
            BridgeAZ community.
          </p>
        </motion.div>

        {/* =================================================
            SEARCH
        ================================================= */}

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
          transition={{
            duration: 0.55,
            delay: 0.08,
          }}
          className="
            mx-auto
            mt-9
            max-w-4xl
          "
        >
          <div
            className="
              flex
              items-center
              rounded-[26px]
              border
              border-white
              bg-white/85
              p-2
              shadow-[0_20px_65px_rgba(7,26,74,.10)]
              backdrop-blur-xl
            "
          >
            <div
              className="
                ml-1
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-2xl
              "
              style={{
                color: theme.primary,

                backgroundColor: `${theme.primary}0D`,
              }}
            >
              <SearchIcon />
            </div>

            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search people, businesses, expertise, location..."
              className="
                h-12
                min-w-0
                flex-1
                bg-transparent
                px-4
                text-base
                font-semibold
                text-slate-800
                outline-none
                placeholder:font-medium
                placeholder:text-slate-400
              "
            />

            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="
                  mr-2
                  rounded-xl
                  px-4
                  py-2
                  text-xs
                  font-black
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-700
                "
              >
                Clear
              </button>
            )}
          </div>
        </motion.div>

        {/* =================================================
            DIRECTORY
        ================================================= */}

        <motion.div
          initial={{
            opacity: 0,
            y: 25,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            duration: 0.6,
            delay: 0.12,
          }}
          className="
            mt-10
            overflow-hidden
            rounded-[30px]
            border
            border-white
            bg-white/80
            shadow-[0_28px_90px_rgba(7,26,74,.10)]
            backdrop-blur-xl
          "
        >
          {/* HEADER */}

          <div
            className="
              flex
              flex-col
              gap-3
              border-b
              border-slate-100
              bg-white/85
              px-5
              py-5
              sm:flex-row
              sm:items-center
              sm:justify-between
              md:px-7
            "
          >
            <div>
              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-3
                "
              >
                <h2
                  className="
                    text-xl
                    font-black
                    tracking-[-0.025em]
                    text-[#071A4A]
                  "
                >
                  Community Directory
                </h2>

                {!loading && !error && (
                  <span
                    className="
                        rounded-full
                        px-3
                        py-1
                        text-[9px]
                        font-black
                        uppercase
                        tracking-[0.12em]
                      "
                    style={{
                      color: theme.primary,

                      backgroundColor: `${theme.secondary}22`,
                    }}
                  >
                    {pagination.total} members
                  </span>
                )}
              </div>

              {!loading && !error && pagination.total > 0 && (
                <p
                  className="
                      mt-1
                      text-xs
                      font-medium
                      text-slate-400
                    "
                >
                  Showing {startNumber}–{endNumber} of {pagination.total}
                </p>
              )}
            </div>

            {search && (
              <p
                className="
                  text-sm
                  font-semibold
                  text-slate-400
                "
              >
                Results for{" "}
                <span
                  className="
                    font-black
                    text-[#071A4A]
                  "
                >
                  “{search}”
                </span>
              </p>
            )}
          </div>

          {/* COLUMN HEADERS */}

          {!loading && !error && members.length > 0 && (
            <div
              className="
                  hidden
                  grid-cols-[minmax(300px,1.2fr)_minmax(300px,1.25fr)_minmax(210px,.75fr)_145px]
                  gap-5
                  border-b
                  border-slate-100
                  bg-slate-50/70
                  px-7
                  py-3
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.18em]
                  text-slate-400
                  xl:grid
                "
            >
              <span>Member</span>
              <span>Expertise</span>
              <span>Connection</span>
              <span className="text-right">Explore</span>
            </div>
          )}

          {/* RESULTS */}

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
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
                <DirectorySkeleton />
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                className="
                  px-6
                  py-20
                  text-center
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
                    rounded-2xl
                    bg-rose-50
                    text-xl
                    font-black
                    text-rose-500
                  "
                >
                  !
                </div>

                <h3
                  className="
                    mt-4
                    text-xl
                    font-black
                    text-[#071A4A]
                  "
                >
                  Directory unavailable
                </h3>

                <p
                  className="
                    mt-2
                    text-sm
                    font-medium
                    text-slate-500
                  "
                >
                  {error}
                </p>
              </motion.div>
            ) : members.length === 0 ? (
              <motion.div
                key="empty"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                className="
                  px-6
                  py-20
                  text-center
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
                    rounded-2xl
                  "
                  style={{
                    color: theme.primary,

                    backgroundColor: `${theme.primary}0D`,
                  }}
                >
                  <SearchIcon />
                </div>

                <h3
                  className="
                    mt-5
                    text-2xl
                    font-black
                    text-[#071A4A]
                  "
                >
                  No connections found
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
                  Try another name, organization, skill, location or
                  opportunity.
                </p>

                {search && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="
                      mt-6
                      rounded-full
                      px-5
                      py-3
                      text-sm
                      font-black
                      text-white
                    "
                    style={{
                      backgroundColor: theme.primary,
                    }}
                  >
                    Clear search
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={`${page}-${search}`}
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
              >
                {members.map((member, index) => {
                  const memberKey = `${getDisplayName(member)}-${
                    member.businessOrganization || ""
                  }-${index}`;

                  return (
                 <MemberRow
  key={memberKey}
  member={member}
  theme={theme}
  index={index}
  expanded={expandedMember === memberKey}
  onToggle={() =>
    setExpandedMember((current) =>
      current === memberKey ? null : memberKey,
    )
  }
  viewerToken={viewerToken}
/>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* =================================================
              PAGINATION
          ================================================= */}

          {!loading && !error && pagination.totalPages > 1 && (
            <div
              className="
                  flex
                  flex-col
                  gap-4
                  border-t
                  border-slate-100
                  bg-white/90
                  px-5
                  py-5
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                  md:px-7
                "
            >
              <p
                className="
                    text-sm
                    font-semibold
                    text-slate-400
                  "
              >
                Page{" "}
                <span className="font-black text-[#071A4A]">
                  {pagination.page}
                </span>{" "}
                of{" "}
                <span className="font-black text-[#071A4A]">
                  {pagination.totalPages}
                </span>
              </p>

              <div
                className="
                    flex
                    flex-wrap
                    items-center
                    gap-2
                  "
              >
                <button
                  type="button"
                  disabled={!pagination.hasPreviousPage}
                  onClick={() => changePage(page - 1)}
                  className="
                      flex
                      h-10
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      px-4
                      text-xs
                      font-black
                      text-slate-700
                      disabled:cursor-not-allowed
                      disabled:opacity-30
                    "
                >
                  ←
                </button>

                {pageNumbers.map((pageNumber) => {
                  const active = pageNumber === page;

                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => changePage(pageNumber)}
                      className="
                            flex
                            h-10
                            min-w-10
                            items-center
                            justify-center
                            rounded-xl
                            px-3
                            text-xs
                            font-black
                          "
                      style={
                        active
                          ? {
                              color: "white",

                              backgroundColor: theme.primary,

                              boxShadow: "0 8px 20px rgba(7,26,74,.14)",
                            }
                          : {
                              color: "#475569",

                              backgroundColor: "white",

                              border: "1px solid #e2e8f0",
                            }
                      }
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={!pagination.hasNextPage}
                  onClick={() => changePage(page + 1)}
                  className="
                      flex
                      h-10
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      px-4
                      text-xs
                      font-black
                      text-slate-700
                      disabled:cursor-not-allowed
                      disabled:opacity-30
                    "
                >
                  →
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* FOOT NOTE */}

        <p
          className="
            mt-5
            text-center
            text-xs
            font-semibold
            text-slate-400
          "
        >
          Bridge Profiles grow as members participate, share expertise and
          contribute to the community.
        </p>
      </div>
    </section>
  );
}
