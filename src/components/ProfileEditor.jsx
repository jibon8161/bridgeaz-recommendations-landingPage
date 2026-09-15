import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useParams } from "react-router-dom";
import ProfileView from "./ProfileView";

const PROFILE_API =
  "https://bridgeaz-recommendations-server.vercel.app/api/profile";

const RECOMMENDATION_API =
  "https://bridgeaz-recommendations-server.vercel.app/api/recommendations";

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;

const PROMOTION_OPTIONS = [
  "Services",
  "Expertise",
  "Events",
  "Classes / Workshops",
  "Books",
  "Resources",
  "Speaking",
  "Content",
  "Community Work",
];

const OPPORTUNITY_OPTIONS = [
  "Speaking",
  "Interviews / Podcasts",
  "Teaching",
  "Mentoring",
  "Collaborations",
  "Business Referrals",
  "Community Projects",
  "Student Shadowing",
];

/* -------------------------------------------------------
   MOTION
------------------------------------------------------- */

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.965,
    y: 34,
  },

  visible: {
    opacity: 1,
    scale: 1,
    y: 0,

    transition: {
      type: "spring",
      stiffness: 210,
      damping: 24,
      mass: 0.95,
    },
  },

  exit: {
    opacity: 0,
    scale: 0.98,
    y: 20,

    transition: {
      duration: 0.2,
    },
  },
};

const panelVariants = {
  hidden: {
    opacity: 0,
    y: 22,
  },

  visible: (index = 0) => ({
    opacity: 1,
    y: 0,

    transition: {
      delay: 0.06 + index * 0.045,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

function getInitials(name) {
  if (!name) return "M";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");

      const base64 = result.includes(",") ? result.split(",")[1] : result;

      resolve(base64);
    };

    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

function normalizeMultiSelect(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toggleArrayValue(values, value) {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }

  return [...values, value];
}

function getCompletionScore({
  profileBio,
  profileStatus,
  website,
  expertise,
  socialLinks,
  additionalAffiliations,
  profilePhoto,
}) {
  const items = [
    Boolean(profilePhoto),
    Boolean(profileBio?.trim()),
    Boolean(profileStatus?.trim()),
    Boolean(website?.trim()),
    Boolean(expertise?.trim()),
    Boolean(socialLinks?.trim()),
    Boolean(additionalAffiliations?.trim()),
  ];

  return Math.round(
    (items.filter(Boolean).length / Math.max(items.length, 1)) * 100,
  );
}

/* -------------------------------------------------------
   ICONS
------------------------------------------------------- */

function SparkleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
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

function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />

      <path d="M3 12h18" />

      <path d="M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9" />

      <path d="M12 3c-2.4 2.5-3.6 5.5-3.6 9s1.2 6.5 3.6 9" />
    </svg>
  );
}

function PrivacyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3 5 6v5c0 4.8 2.8 8.2 7 10 4.2-1.8 7-5.2 7-10V6l-7-3Z" />

      <path d="M9.5 12.2 11 13.7l3.7-4" />
    </svg>
  );
}

function OpportunityIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 19 19 5" />

      <path d="M10 5h9v9" />

      <path d="M5 9v10h10" />
    </svg>
  );
}

/* -------------------------------------------------------
   PROFILE PHOTO

   One component is used everywhere so expired Airtable
   image URLs cannot leave broken-image icons around.
------------------------------------------------------- */

function ProfilePhoto({
  src,
  alt,
  initials,
  primary,
  secondary,
  onError,
  refreshing = false,
  fallbackTextClass = "text-sm",
}) {
  return (
    <>
      {src ? (
        <img
          key={src}
          src={src}
          alt={alt}
          onError={onError}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className={`
            flex
            h-full
            w-full
            items-center
            justify-center
            font-black
            text-white
            ${fallbackTextClass}
          `}
          style={{
            background: `linear-gradient(
              135deg,
              ${primary},
              ${secondary}
            )`,
          }}
        >
          {initials}
        </div>
      )}

      <AnimatePresence>
        {refreshing && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="
              absolute
              inset-0
              flex
              items-center
              justify-center
              bg-[#071A4A]/25
              backdrop-blur-[2px]
            "
          >
            <motion.span
              animate={{
                rotate: 360,
              }}
              transition={{
                repeat: Infinity,
                duration: 0.8,
                ease: "linear",
              }}
              className="
                h-5
                w-5
                rounded-full
                border-2
                border-white/40
                border-t-white
              "
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* -------------------------------------------------------
   SECTION CARD
------------------------------------------------------- */

function SectionCard({
  eyebrow,
  title,
  description,
  children,
  index = 0,
  icon,
}) {
  return (
    <motion.section
      custom={index}
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      whileHover={{
        y: -3,
      }}
      className="
        group
        relative
        overflow-hidden
        rounded-[28px]
        border
        border-white/80
        bg-white/75
        p-5
        shadow-[0_20px_60px_rgba(15,23,42,0.065)]
        backdrop-blur-2xl
        transition-all
        duration-300
        hover:border-blue-100
        hover:shadow-[0_28px_80px_rgba(15,23,42,0.10)]
        md:p-6
      "
    >
      <div
        className="
          pointer-events-none
          absolute
          -right-20
          -top-20
          h-48
          w-48
          rounded-full
          bg-blue-400/5
          blur-3xl
          transition
          duration-700
          group-hover:bg-blue-400/10
        "
      />

      <div className="relative z-10">
        <div className="flex items-start gap-4">
          <motion.div
            whileHover={{
              rotate: 6,
              scale: 1.06,
            }}
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-2xl
              border
              border-blue-100
              bg-gradient-to-br
              from-blue-50
              to-white
              text-blue-600
              shadow-sm
            "
          >
            {icon}
          </motion.div>

          <div className="min-w-0">
            {eyebrow && (
              <p
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.22em]
                  text-blue-500
                "
              >
                {eyebrow}
              </p>
            )}

            <h3
              className="
                mt-1
                text-[18px]
                font-black
                tracking-[-0.025em]
                text-[#071A4A]
              "
            >
              {title}
            </h3>

            {description && (
              <p
                className="
                  mt-1
                  max-w-3xl
                  text-xs
                  font-medium
                  leading-5
                  text-slate-400
                "
              >
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </motion.section>
  );
}

/* -------------------------------------------------------
   FIELD LABEL
------------------------------------------------------- */

function FieldLabel({ children }) {
  return (
    <span
      className="
        text-[10px]
        font-black
        uppercase
        tracking-[0.17em]
        text-slate-500
      "
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------
   TOGGLE
------------------------------------------------------- */

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
  icon,
}) {
  return (
    <motion.label
      whileHover={
        disabled
          ? undefined
          : {
              y: -2,
            }
      }
      whileTap={
        disabled
          ? undefined
          : {
              scale: 0.995,
            }
      }
      className={`
        group
        relative
        flex
        items-center
        justify-between
        gap-4
        overflow-hidden
        rounded-2xl
        border
        px-4
        py-4
        transition-all
        duration-300

        ${
          checked
            ? "border-blue-200 bg-blue-50/70 shadow-[0_10px_30px_rgba(59,130,246,0.08)]"
            : "border-slate-100 bg-white/80 shadow-[0_8px_22px_rgba(15,23,42,0.035)]"
        }

        ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:border-blue-100 hover:bg-white hover:shadow-md"
        }
      `}
    >
      {checked && (
        <motion.div
          layoutId={`toggleGlow-${title}`}
          className="
            pointer-events-none
            absolute
            -left-14
            -top-14
            h-28
            w-28
            rounded-full
            bg-blue-300/15
            blur-2xl
          "
        />
      )}

      <div className="relative z-10 flex min-w-0 items-start gap-3">
        {icon && (
          <div
            className={`
              mt-0.5
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              transition

              ${
                checked
                  ? "bg-blue-100 text-blue-600"
                  : "bg-slate-50 text-slate-400"
              }
            `}
          >
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <p className="text-sm font-black text-[#071A4A]">{title}</p>

          {description && (
            <p className="mt-1 break-all text-xs leading-5 text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="relative z-10 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange?.(event.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />

        <div
          className="
            h-7
            w-12
            rounded-full
            bg-slate-200
            shadow-inner
            transition-all
            duration-300
            peer-checked:bg-blue-500
            peer-focus-visible:ring-4
            peer-focus-visible:ring-blue-100
          "
        />

        <div
          className="
            absolute
            left-1
            top-1
            h-5
            w-5
            rounded-full
            bg-white
            shadow-md
            transition-transform
            duration-300
            peer-checked:translate-x-5
          "
        />
      </div>
    </motion.label>
  );
}

/* -------------------------------------------------------
   OPTION GRID
------------------------------------------------------- */

function OptionGrid({ options, selected, onToggle, disabled = false }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {options.map((option) => {
        const checked = selected.includes(option);

        return (
          <motion.label
            key={option}
            whileHover={
              disabled
                ? undefined
                : {
                    y: -2,
                  }
            }
            whileTap={
              disabled
                ? undefined
                : {
                    scale: 0.98,
                  }
            }
            className={`
              flex
              items-center
              gap-3
              rounded-2xl
              border
              px-4
              py-3.5
              text-sm
              font-bold
              transition-all
              duration-300

              ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}

              ${
                checked
                  ? "border-blue-200 bg-gradient-to-br from-blue-50 to-white text-blue-700 shadow-[0_10px_28px_rgba(59,130,246,0.08)]"
                  : "border-slate-100 bg-white/75 text-slate-600 shadow-sm hover:border-blue-100 hover:bg-white"
              }
            `}
          >
            <div
              className={`
                flex
                h-5
                w-5
                shrink-0
                items-center
                justify-center
                rounded-md
                border
                transition

                ${
                  checked
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-slate-300 bg-white"
                }
              `}
            >
              {checked && (
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-3.5 w-3.5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    d="m5 10 3 3 7-7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>

            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => onToggle(option)}
              className="sr-only"
            />

            <span>{option}</span>
          </motion.label>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------
   MAIN
------------------------------------------------------- */

export default function ProfileEditor({
  initialData,
  theme,
  onProfileSaved,
  unreadConnectionCount = 0,
  onOpenMessages,
}) {
  const { token } = useParams();

  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  /*
    Prevents all three images from triggering three
    simultaneous refresh requests when an Airtable URL
    expires.
  */
  const photoRefreshInProgressRef = useRef(false);

  const [menuOpen, setMenuOpen] = useState(false);

  const [editMode, setEditMode] = useState(false);

  const [showProfileView, setShowProfileView] = useState(false);

  /* -------------------------------------------------------
     PROFILE
  ------------------------------------------------------- */

  const [profileBio, setProfileBio] = useState(initialData?.profileBio || "");

  const [profileStatus, setProfileStatus] = useState(
    initialData?.profileStatus || "",
  );

  const [showEmail, setShowEmail] = useState(
    Boolean(initialData?.showEmailInDirectory),
  );

  const [showPhone, setShowPhone] = useState(
    Boolean(initialData?.showPhoneInDirectory),
  );

  const [showSocialLinks, setShowSocialLinks] = useState(
    Boolean(initialData?.showSocialLinksInDirectory),
  );

  const [website, setWebsite] = useState(initialData?.website || "");

  const [expertise, setExpertise] = useState(initialData?.expertise || "");

  const [socialLinks, setSocialLinks] = useState(
    initialData?.socialLinks || "",
  );

  const [additionalAffiliations, setAdditionalAffiliations] = useState(
    initialData?.additionalAffiliations || "",
  );

  const [promoteMePersonally, setPromoteMePersonally] = useState(
    Boolean(initialData?.promoteMePersonally),
  );

  const [promoteMyBusinessOrganization, setPromoteMyBusinessOrganization] =
    useState(Boolean(initialData?.promoteMyBusinessOrganization));

  const [whatIWantBridgeToPromote, setWhatIWantBridgeToPromote] = useState(
    normalizeMultiSelect(initialData?.whatIWantBridgeToPromote),
  );

  const [openToOpportunities, setOpenToOpportunities] = useState(
    Boolean(initialData?.openToOpportunities),
  );

  const [opportunityTypes, setOpportunityTypes] = useState(
    normalizeMultiSelect(initialData?.opportunityTypes),
  );

  /* -------------------------------------------------------
     PHOTO
  ------------------------------------------------------- */

  const [profilePhoto, setProfilePhoto] = useState(
    initialData?.profilePhoto || "",
  );

  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const [photoPreview, setPhotoPreview] = useState("");

  /*
    Stores the exact URL that failed.

    If a new Airtable URL arrives, it is different from
    this URL, so React automatically attempts the new one.
  */
  const [failedPhotoUrl, setFailedPhotoUrl] = useState("");

  const [refreshingPhoto, setRefreshingPhoto] = useState(false);

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [messageType, setMessageType] = useState("info");

  const [generatingBio, setGeneratingBio] = useState(false);

  /* -------------------------------------------------------
     MEMBER
  ------------------------------------------------------- */

  const primary = theme?.primary || "#071A4A";

  const secondary = theme?.secondary || "#3B82F6";

  const fullName =
    initialData?.fullName ||
    [initialData?.firstName, initialData?.lastName].filter(Boolean).join(" ") ||
    "Bridge Member";

  const role = initialData?.role || "";

  const business = initialData?.businessOrganization || "";

  const email = initialData?.email || "";

  const phone = initialData?.phone || "";

  const creatorLevel = initialData?.creatorLevel || "";

  const membershipLevel = initialData?.membershipLevel || "";

  const earnedStatus = initialData?.earnedStatus || "";

  const displayedPhoto = photoPreview || profilePhoto || "";

  /*
    This is the URL that is safe to render.

    If the current URL has already failed, we render the
    initials instead of showing the browser's broken-image
    icon.
  */
  const safeDisplayedPhoto =
    displayedPhoto && displayedPhoto !== failedPhotoUrl ? displayedPhoto : "";

  const completionScore = useMemo(
    () =>
      getCompletionScore({
        profileBio,
        profileStatus,
        website,
        expertise,
        socialLinks,
        additionalAffiliations,

        /*
            Count the actual profile-photo field for
            completeness, even while a temporary Airtable
            URL is being refreshed.
          */
        profilePhoto: displayedPhoto,
      }),
    [
      profileBio,
      profileStatus,
      website,
      expertise,
      socialLinks,
      additionalAffiliations,
      displayedPhoto,
    ],
  );

  /* -------------------------------------------------------
     CURRENT PROFILE
  ------------------------------------------------------- */

  const currentProfileData = useMemo(
    () => ({
      ...initialData,

      profileBio,
      profileStatus,

      website,
      expertise,
      socialLinks,
      additionalAffiliations,

      promoteMePersonally,
      promoteMyBusinessOrganization,
      whatIWantBridgeToPromote,

      openToOpportunities,
      opportunityTypes,

      showEmailInDirectory: showEmail,

      showPhoneInDirectory: showPhone,

      showSocialLinksInDirectory: showSocialLinks,

      /*
          Do not pass a known-broken URL into ProfileView.
          ProfileView will also fetch the latest profile
          data independently.
        */
      profilePhoto: safeDisplayedPhoto,
    }),
    [
      initialData,
      profileBio,
      profileStatus,
      website,
      expertise,
      socialLinks,
      additionalAffiliations,
      promoteMePersonally,
      promoteMyBusinessOrganization,
      whatIWantBridgeToPromote,
      openToOpportunities,
      opportunityTypes,
      showEmail,
      showPhone,
      showSocialLinks,
      safeDisplayedPhoto,
    ],
  );

  /* -------------------------------------------------------
     SELF-HEALING PROFILE PHOTO
  ------------------------------------------------------- */

  async function refreshProfilePhoto(failedUrl = profilePhoto) {
    /*
      We do not need to refresh a local File API preview.
    */
    if (photoPreview) {
      return;
    }

    if (!token || photoRefreshInProgressRef.current) {
      return;
    }

    photoRefreshInProgressRef.current = true;

    setRefreshingPhoto(true);

    try {
      const response = await fetch(
        `${RECOMMENDATION_API}/${encodeURIComponent(token)}?t=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || result?.success !== true) {
        throw new Error(result?.error || "Could not refresh profile photo.");
      }

      const freshPhoto = result?.profilePhoto || "";

      /*
        Airtable's new signed URL should normally be
        different from the expired URL.
      */
      if (freshPhoto && freshPhoto !== failedUrl) {
        setProfilePhoto(freshPhoto);

        setFailedPhotoUrl("");
      } else if (!freshPhoto) {
        /*
          No image currently exists in Airtable.
        */
        setProfilePhoto("");
      }
    } catch (error) {
      console.error("PROFILE PHOTO REFRESH ERROR:", error);

      /*
        Don't turn this into a user-visible profile error.
        The initials remain as a graceful fallback.
      */
    } finally {
      photoRefreshInProgressRef.current = false;

      setRefreshingPhoto(false);
    }
  }

  function handleProfilePhotoError() {
    if (!displayedPhoto) {
      return;
    }

    /*
      Immediately stop rendering the broken URL.
    */
    setFailedPhotoUrl(displayedPhoto);

    /*
      Only remote Airtable photos should trigger the API
      refresh. A local upload preview should not.
    */
    if (!photoPreview && displayedPhoto === profilePhoto) {
      void refreshProfilePhoto(displayedPhoto);
    }
  }

  /* -------------------------------------------------------
     MENU
  ------------------------------------------------------- */

  function handleAvatarClick() {
    const opening = !menuOpen;

    setMenuOpen(opening);

    setMessage("");

    /*
      If the current photo previously failed and the member
      opens their Profile control again, give the backend
      another chance to retrieve a fresh Airtable URL.
    */
    if (
      opening &&
      !photoPreview &&
      profilePhoto &&
      failedPhotoUrl === profilePhoto
    ) {
      void refreshProfilePhoto(profilePhoto);
    }
  }

  function openFullProfile() {
    setMenuOpen(false);

    setEditMode(false);

    setShowProfileView(true);

    setMessage("");
  }

  function openEditProfile() {
    setShowProfileView(false);

    setMenuOpen(false);

    setEditMode(true);

    setMessage("");
  }

  /* -------------------------------------------------------
     CANCEL
  ------------------------------------------------------- */

  function closeEditProfile() {
    if (saving) return;

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoPreview("");

    setSelectedPhoto(null);

    setProfileBio(initialData?.profileBio || "");

    setProfileStatus(initialData?.profileStatus || "");

    setWebsite(initialData?.website || "");

    setExpertise(initialData?.expertise || "");

    setSocialLinks(initialData?.socialLinks || "");

    setAdditionalAffiliations(initialData?.additionalAffiliations || "");

    setPromoteMePersonally(Boolean(initialData?.promoteMePersonally));

    setPromoteMyBusinessOrganization(
      Boolean(initialData?.promoteMyBusinessOrganization),
    );

    setWhatIWantBridgeToPromote(
      normalizeMultiSelect(initialData?.whatIWantBridgeToPromote),
    );

    setOpenToOpportunities(Boolean(initialData?.openToOpportunities));

    setOpportunityTypes(normalizeMultiSelect(initialData?.opportunityTypes));

    setShowEmail(Boolean(initialData?.showEmailInDirectory));

    setShowPhone(Boolean(initialData?.showPhoneInDirectory));

    setShowSocialLinks(Boolean(initialData?.showSocialLinksInDirectory));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setMessage("");

    setEditMode(false);
  }

  /* -------------------------------------------------------
     PHOTO SELECT
  ------------------------------------------------------- */

  function handlePhotoSelect(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setMessageType("error");

      setMessage("Please choose a JPG, PNG, or WEBP image.");

      event.target.value = "";

      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setMessageType("error");

      setMessage("Profile photo must be smaller than 2 MB.");

      event.target.value = "";

      return;
    }

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    const previewUrl = URL.createObjectURL(file);

    /*
      New local preview = new image, so clear any old
      failed remote URL.
    */
    setFailedPhotoUrl("");

    setSelectedPhoto(file);

    setPhotoPreview(previewUrl);

    setMessage("");
  }

  /* -------------------------------------------------------
     AI BIO
  ------------------------------------------------------- */

  async function handleGenerateBio() {
    try {
      setGeneratingBio(true);

      setMessage("");

      const response = await fetch(`${PROFILE_API}/${token}/ai-bio`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          profileStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok || result?.success !== true) {
        throw new Error(
          result?.details || result?.error || "Could not generate bio.",
        );
      }

      setProfileBio(result.bio || "");

      setMessageType("info");

      setMessage("AI bio created. You can edit it before saving.");
    } catch (error) {
      console.error("AI BIO ERROR:", error);

      setMessageType("error");

      setMessage(
        error?.message || "Could not generate your bio. Please try again.",
      );
    } finally {
      setGeneratingBio(false);
    }
  }

  /* -------------------------------------------------------
     SAVE
  ------------------------------------------------------- */

  async function handleSave() {
    try {
      setSaving(true);

      setMessage("");

      let photoPayload = {};

      if (selectedPhoto) {
        const base64 = await fileToBase64(selectedPhoto);

        photoPayload = {
          profilePhotoName: selectedPhoto.name,

          profilePhotoType: selectedPhoto.type,

          profilePhotoBase64: base64,
        };
      }

      const response = await fetch(`${PROFILE_API}/${token}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          profileBio,
          profileStatus,

          website,
          expertise,
          socialLinks,
          additionalAffiliations,

          promoteMePersonally,
          promoteMyBusinessOrganization,
          whatIWantBridgeToPromote,

          openToOpportunities,
          opportunityTypes,

          showEmailInDirectory: showEmail,

          showPhoneInDirectory: showPhone,

          showSocialLinksInDirectory: showSocialLinks,

          ...photoPayload,
        }),
      });

      const result = await response.json();

      if (!response.ok || result?.success !== true) {
        throw new Error(
          result?.details || result?.error || "Profile update failed.",
        );
      }

      const returnedPhoto = result?.profilePhoto || "";

      if (returnedPhoto) {
        setProfilePhoto(returnedPhoto);

        setFailedPhotoUrl("");
      }

      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }

      setPhotoPreview("");

      setSelectedPhoto(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      const savedProfile = {
        profileBio:
          result?.profileBio !== undefined ? result.profileBio : profileBio,

        profileStatus:
          result?.profileStatus !== undefined
            ? result.profileStatus
            : profileStatus,

        website: result?.website !== undefined ? result.website : website,

        expertise:
          result?.expertise !== undefined ? result.expertise : expertise,

        socialLinks:
          result?.socialLinks !== undefined ? result.socialLinks : socialLinks,

        additionalAffiliations:
          result?.additionalAffiliations !== undefined
            ? result.additionalAffiliations
            : additionalAffiliations,

        promoteMePersonally:
          result?.promoteMePersonally !== undefined
            ? result.promoteMePersonally
            : promoteMePersonally,

        promoteMyBusinessOrganization:
          result?.promoteMyBusinessOrganization !== undefined
            ? result.promoteMyBusinessOrganization
            : promoteMyBusinessOrganization,

        whatIWantBridgeToPromote:
          result?.whatIWantBridgeToPromote !== undefined
            ? result.whatIWantBridgeToPromote
            : whatIWantBridgeToPromote.join(", "),

        openToOpportunities:
          result?.openToOpportunities !== undefined
            ? result.openToOpportunities
            : openToOpportunities,

        opportunityTypes:
          result?.opportunityTypes !== undefined
            ? result.opportunityTypes
            : opportunityTypes.join(", "),

        showEmailInDirectory:
          result?.showEmailInDirectory !== undefined
            ? result.showEmailInDirectory
            : showEmail,

        showPhoneInDirectory:
          result?.showPhoneInDirectory !== undefined
            ? result.showPhoneInDirectory
            : showPhone,

        showSocialLinksInDirectory:
          result?.showSocialLinksInDirectory !== undefined
            ? result.showSocialLinksInDirectory
            : showSocialLinks,

        ...(returnedPhoto
          ? {
              profilePhoto: returnedPhoto,
            }
          : {}),
      };

      setProfileBio(savedProfile.profileBio || "");

      setProfileStatus(savedProfile.profileStatus || "");

      setWebsite(savedProfile.website || "");

      setExpertise(savedProfile.expertise || "");

      setSocialLinks(savedProfile.socialLinks || "");

      setAdditionalAffiliations(savedProfile.additionalAffiliations || "");

      setPromoteMePersonally(Boolean(savedProfile.promoteMePersonally));

      setPromoteMyBusinessOrganization(
        Boolean(savedProfile.promoteMyBusinessOrganization),
      );

      setWhatIWantBridgeToPromote(
        normalizeMultiSelect(savedProfile.whatIWantBridgeToPromote),
      );

      setOpenToOpportunities(Boolean(savedProfile.openToOpportunities));

      setOpportunityTypes(normalizeMultiSelect(savedProfile.opportunityTypes));

      setShowEmail(Boolean(savedProfile.showEmailInDirectory));

      setShowPhone(Boolean(savedProfile.showPhoneInDirectory));

      setShowSocialLinks(Boolean(savedProfile.showSocialLinksInDirectory));

      onProfileSaved?.(savedProfile);

      setMessageType("success");

      setMessage("Profile updated successfully.");

      setEditMode(false);

      setMenuOpen(true);
    } catch (error) {
      console.error("PROFILE UPDATE ERROR:", error);

      setMessageType("error");

      setMessage(error?.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /* -------------------------------------------------------
     NOTICE
  ------------------------------------------------------- */

  const noticeClass =
    messageType === "error"
      ? "border-red-100 bg-red-50/90 text-red-700"
      : messageType === "success"
        ? "border-emerald-100 bg-emerald-50/90 text-emerald-700"
        : "border-blue-100 bg-blue-50/90 text-blue-700";

  const initials = getInitials(fullName);

  return (
    <>
      {/* =====================================================
          PROFILE CONTROL
      ===================================================== */}

      <div
        ref={menuRef}
        className="
    fixed
    right-4
    top-14
    z-9000
    flex
    items-start
    gap-2
    md:right-7
    md:top-15
  "
      >
        <motion.button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            onOpenMessages?.();
          }}
          whileHover={{
            y: -3,
            scale: 1.05,
          }}
          whileTap={{
            scale: 0.95,
          }}
          aria-label="Open Bridge messages"
          className="
    relative
    flex
    h-14
    w-14
    shrink-0
    items-center
    justify-center
    rounded-full
    border
    border-white/80
    bg-white/78
    text-[#071A4A]
    shadow-[0_20px_60px_rgba(7,26,74,0.18)]
    backdrop-blur-2xl
    transition-all
    duration-300
    hover:bg-white/95
    hover:shadow-[0_28px_80px_rgba(7,26,74,0.24)]
    md:h-[60px]
    md:w-[60px]
  "
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
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
        <motion.button
          type="button"
          onClick={handleAvatarClick}
          aria-label="Open profile menu"
          whileHover={{
            y: -3,
            scale: 1.015,
          }}
          whileTap={{
            scale: 0.975,
          }}
          className="
            group
            relative
            flex
            items-center
            gap-2.5
            overflow-hidden
            rounded-full
            border
            border-white/80
            bg-white/78
            p-1.5
            shadow-[0_20px_60px_rgba(7,26,74,0.18)]
            backdrop-blur-2xl
            transition-all
            duration-300
            hover:bg-white/95
            hover:shadow-[0_28px_80px_rgba(7,26,74,0.24)]
          "
        >
          {/* subtle moving highlight */}

          <motion.div
            animate={{
              x: ["-180%", "300%"],
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
              w-10
              rotate-12
              bg-white/30
              blur-lg
            "
          />

          <div
            className="
              relative
              h-11
              w-11
              shrink-0
              overflow-hidden
              rounded-full
              border-2
              border-white
              bg-white
              shadow-[0_8px_24px_rgba(7,26,74,0.20)]
              md:h-12
              md:w-12
            "
          >
            <ProfilePhoto
              src={safeDisplayedPhoto}
              alt={fullName}
              initials={initials}
              primary={primary}
              secondary={secondary}
              onError={handleProfilePhotoError}
              refreshing={refreshingPhoto}
            />

            <span
              className="
                absolute
                bottom-0
                right-0
                z-20
                h-3
                w-3
                rounded-full
                border-2
                border-white
                bg-emerald-500
              "
            />
          </div>

          <div
            className="
              relative
              z-10
              hidden
              min-w-0
              text-left
              md:block
            "
          >
            <p
              className="
                max-w-[155px]
                truncate
                text-[13px]
                font-black
                text-[#071A4A]
              "
            >
              {fullName}
            </p>

            <p
              className="
                mt-0.5
                text-[8px]
                font-black
                uppercase
                tracking-[0.22em]
                text-slate-400
              "
            >
              My Bridge Profile
            </p>
          </div>

          <motion.div
            animate={{
              rotate: menuOpen ? 180 : 0,
            }}
            className="
              relative
              z-10
              mr-0.5
              hidden
              h-7
              w-7
              items-center
              justify-center
              rounded-full
              border
              border-white/70
              bg-white/70
              text-slate-400
              md:flex
            "
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="m6 8 4 4 4-4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        </motion.button>

        {/* =================================================
            PROFILE MENU
        ================================================= */}

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{
                opacity: 0,
                y: -12,
                scale: 0.97,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: -8,
                scale: 0.98,
              }}
              transition={{
                duration: 0.2,
              }}
              className="
                absolute
                right-0
                mt-3
                w-[calc(100vw-24px)]
                max-w-[370px]
                overflow-hidden
                rounded-[30px]
                border
                border-white/80
                bg-white/88
                shadow-[0_35px_100px_rgba(7,26,74,0.24)]
                backdrop-blur-3xl
              "
            >
              <div
                className="
                  pointer-events-none
                  absolute
                  -right-24
                  -top-24
                  h-56
                  w-56
                  rounded-full
                  blur-3xl
                "
                style={{
                  backgroundColor: `${secondary}18`,
                }}
              />

              <div className="relative p-3.5">
                <button
                  type="button"
                  onClick={openFullProfile}
                  className="
                    group
                    flex
                    w-full
                    items-center
                    gap-4
                    rounded-3xl
                    border
                    border-white
                    bg-white/70
                    p-3.5
                    text-left
                    shadow-[0_10px_30px_rgba(7,26,74,0.07)]
                    transition
                    hover:-translate-y-0.5
                    hover:bg-white
                    hover:shadow-[0_16px_42px_rgba(7,26,74,0.11)]
                  "
                >
                  <div
                    className="
                      relative
                      h-16
                      w-16
                      shrink-0
                      overflow-hidden
                      rounded-2xl
                      border-[3px]
                      border-white
                      bg-slate-100
                      shadow-[0_10px_30px_rgba(7,26,74,0.16)]
                    "
                  >
                    <ProfilePhoto
                      src={safeDisplayedPhoto}
                      alt={fullName}
                      initials={initials}
                      primary={primary}
                      secondary={secondary}
                      onError={handleProfilePhotoError}
                      refreshing={refreshingPhoto}
                      fallbackTextClass="text-lg"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3
                      className="
                        truncate
                        text-base
                        font-black
                        text-[#071A4A]
                      "
                    >
                      {fullName}
                    </h3>

                    {(role || business) && (
                      <p
                        className="
                          mt-1
                          truncate
                          text-xs
                          font-semibold
                          text-slate-500
                        "
                      >
                        {role}

                        {role && business ? " · " : ""}

                        {business}
                      </p>
                    )}

                    {profileStatus && (
                      <div className="mt-2 flex items-center gap-2">
                        <motion.span
                          animate={{
                            scale: [1, 1.35, 1],
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 2,
                          }}
                          className="
                            h-2
                            w-2
                            shrink-0
                            rounded-full
                            bg-emerald-500
                          "
                        />

                        <p
                          className="
                            truncate
                            text-xs
                            font-semibold
                            text-slate-500
                          "
                        >
                          {profileStatus}
                        </p>
                      </div>
                    )}
                  </div>

                  <span className="text-xl text-slate-300">›</span>
                </button>

                {message && (
                  <div
                    aria-live="polite"
                    className={`
                      mt-3
                      rounded-2xl
                      border
                      px-4
                      py-3
                      text-center
                      text-xs
                      font-bold
                      ${noticeClass}
                    `}
                  >
                    {message}
                  </div>
                )}
              </div>

              <div
                className="
                  relative
                  border-t
                  border-slate-100
                  p-2.5
                "
              >
                <button
                  type="button"
                  onClick={openFullProfile}
                  className="
                    flex
                    w-full
                    items-center
                    justify-between
                    rounded-2xl
                    px-4
                    py-3.5
                    text-left
                    transition
                    hover:bg-slate-50
                  "
                >
                  <div>
                    <p className="text-sm font-black text-[#071A4A]">
                      View Profile
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      See your Bridge Profile
                    </p>
                  </div>

                  <span className="text-xl text-slate-300">›</span>
                </button>

                <button
                  type="button"
                  onClick={openEditProfile}
                  className="
                    mt-1
                    flex
                    w-full
                    items-center
                    justify-between
                    rounded-2xl
                    px-4
                    py-3.5
                    text-left
                    transition
                    hover:bg-slate-50
                  "
                >
                  <div>
                    <p className="text-sm font-black text-[#071A4A]">
                      Edit Profile
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      Profile, visibility and preferences
                    </p>
                  </div>

                  <span className="text-xl text-slate-300">›</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* =====================================================
          FULL PROFILE
      ===================================================== */}

      {showProfileView && (
        <ProfileView
          data={currentProfileData}
          theme={theme}
          onClose={() => setShowProfileView(false)}
          onEdit={openEditProfile}
        />
      )}

      {/* =====================================================
          EDIT PROFILE
      ===================================================== */}

      <AnimatePresence>
        {editMode && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="
              fixed
              inset-0
              z-[9600]
              flex
              items-center
              justify-center
              overflow-hidden
              bg-[#071A4A]/60
              p-2
              backdrop-blur-xl
              md:p-4
            "
          >
            {/* ANIMATED BACKGROUND */}

            <motion.div
              animate={{
                x: ["-8%", "8%", "-8%"],

                y: ["-6%", "10%", "-6%"],

                scale: [1, 1.1, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 18,
                ease: "easeInOut",
              }}
              className="
                pointer-events-none
                absolute
                -left-48
                -top-48
                h-[600px]
                w-[600px]
                rounded-full
                blur-[130px]
              "
              style={{
                backgroundColor: `${secondary}35`,
              }}
            />

            <motion.div
              animate={{
                x: ["8%", "-8%", "8%"],

                y: ["8%", "-5%", "8%"],

                scale: [1.04, 0.98, 1.04],
              }}
              transition={{
                repeat: Infinity,
                duration: 22,
                ease: "easeInOut",
              }}
              className="
                pointer-events-none
                absolute
                -bottom-56
                -right-44
                h-[660px]
                w-[660px]
                rounded-full
                blur-[150px]
              "
              style={{
                backgroundColor: `${primary}35`,
              }}
            />

            {/* MODAL */}

            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="
                relative
                h-[96vh]
                w-[97vw]
                max-w-[1600px]
                overflow-hidden
                rounded-[34px]
                border
                border-white/80
                bg-[#F7F9FD]/95
                shadow-[0_55px_180px_rgba(7,26,74,0.50)]
                backdrop-blur-3xl
              "
            >
              <div className="relative flex h-full flex-col">
                {/* HEADER */}

                <header
                  className="
                    relative
                    z-30
                    shrink-0
                    overflow-hidden
                    border-b
                    border-white
                    bg-white/85
                    px-5
                    py-4
                    backdrop-blur-3xl
                    md:px-7
                  "
                >
                  <div
                    className="
                      pointer-events-none
                      absolute
                      right-0
                      top-0
                      h-full
                      w-1/3
                      bg-gradient-to-l
                      from-blue-50/70
                      to-transparent
                    "
                  />

                  <div className="relative flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <motion.span
                          animate={{
                            scale: [1, 1.6, 1],

                            opacity: [0.7, 1, 0.7],
                          }}
                          transition={{
                            repeat: Infinity,

                            duration: 2.2,
                          }}
                          className="
                            h-2
                            w-2
                            rounded-full
                            bg-blue-500
                          "
                        />

                        <p
                          className="
                            text-[10px]
                            font-black
                            uppercase
                            tracking-[0.24em]
                            text-blue-500
                          "
                        >
                          Profile Studio
                        </p>
                      </div>

                      <h2
                        className="
                          mt-1
                          text-2xl
                          font-black
                          tracking-[-0.04em]
                          text-[#071A4A]
                          md:text-3xl
                        "
                      >
                        Build your Bridge Profile
                      </h2>

                      <p
                        className="
                          mt-1
                          hidden
                          text-xs
                          font-medium
                          text-slate-400
                          sm:block
                        "
                      >
                        Keep your identity, expertise, visibility and
                        opportunities up to date.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <motion.button
                        type="button"
                        onClick={openFullProfile}
                        whileHover={{
                          y: -2,
                        }}
                        whileTap={{
                          scale: 0.98,
                        }}
                        className="
                          hidden
                          items-center
                          gap-2
                          rounded-full
                          border
                          border-blue-100
                          bg-blue-50
                          px-4
                          py-2.5
                          text-xs
                          font-black
                          text-blue-700
                          md:inline-flex
                        "
                      >
                        Preview
                        <span>↗</span>
                      </motion.button>

                      <motion.button
                        type="button"
                        onClick={closeEditProfile}
                        disabled={saving}
                        aria-label="Close profile editor"
                        whileHover={{
                          rotate: 5,
                          scale: 1.05,
                        }}
                        whileTap={{
                          scale: 0.95,
                        }}
                        className="
                          flex
                          h-11
                          w-11
                          items-center
                          justify-center
                          rounded-full
                          border
                          border-slate-100
                          bg-white
                          text-2xl
                          text-slate-400
                          shadow-sm
                          transition
                          hover:text-[#071A4A]
                          hover:shadow-md
                          disabled:opacity-50
                        "
                      >
                        ×
                      </motion.button>
                    </div>
                  </div>
                </header>

                {/* BODY */}

                <div
                  className="
                    relative
                    min-h-0
                    flex-1
                    overflow-y-auto
                  "
                >
                  <div
                    className="
                      relative
                      grid
                      gap-6
                      p-4
                      md:p-6
                      xl:grid-cols-[300px_minmax(0,1fr)]
                    "
                  >
                    {/* =========================================
                        LEFT SIDEBAR
                    ========================================= */}

                    <motion.aside
                      custom={0}
                      variants={panelVariants}
                      initial="hidden"
                      animate="visible"
                      className="
                        xl:sticky
                        xl:top-6
                        xl:self-start
                      "
                    >
                      <div
                        className="
                          relative
                          overflow-hidden
                          rounded-[30px]
                          border
                          border-white
                          bg-white/80
                          p-5
                          shadow-[0_25px_75px_rgba(7,26,74,0.10)]
                          backdrop-blur-2xl
                        "
                      >
                        <div
                          className="
                            pointer-events-none
                            absolute
                            inset-x-0
                            top-0
                            h-28
                            bg-gradient-to-b
                            from-blue-50
                            to-transparent
                          "
                        />

                        <div className="relative z-10 text-center">
                          {/* PHOTO */}

                          <div
                            className="
                              relative
                              mx-auto
                              h-[140px]
                              w-[140px]
                            "
                          >
                            <motion.div
                              animate={{
                                rotate: 360,
                              }}
                              transition={{
                                repeat: Infinity,

                                duration: 14,

                                ease: "linear",
                              }}
                              className="
                                absolute
                                inset-[-7px]
                                rounded-[34px]
                              "
                              style={{
                                background: `conic-gradient(
                                  ${primary},
                                  transparent 22%,
                                  ${secondary},
                                  transparent 58%,
                                  ${primary}
                                )`,
                              }}
                            />

                            <div
                              className="
                                absolute
                                inset-[-3px]
                                rounded-[32px]
                                bg-white
                              "
                            />

                            <div
                              className="
                                relative
                                h-full
                                w-full
                                overflow-hidden
                                rounded-[29px]
                                border-4
                                border-white
                                bg-slate-100
                                shadow-[0_16px_45px_rgba(7,26,74,0.20)]
                              "
                            >
                              <ProfilePhoto
                                src={safeDisplayedPhoto}
                                alt={fullName}
                                initials={initials}
                                primary={primary}
                                secondary={secondary}
                                onError={handleProfilePhotoError}
                                refreshing={refreshingPhoto}
                                fallbackTextClass="text-3xl"
                              />
                            </div>
                          </div>

                          <h3
                            className="
                              mt-5
                              text-xl
                              font-black
                              text-[#071A4A]
                            "
                          >
                            {fullName}
                          </h3>

                          {(role || business) && (
                            <p
                              className="
                                mt-1
                                text-xs
                                font-semibold
                                leading-5
                                text-slate-500
                              "
                            >
                              {role}

                              {role && business ? " · " : ""}

                              {business}
                            </p>
                          )}

                          {/* COMPLETION */}

                          <div
                            className="
                              mt-5
                              rounded-3xl
                              border
                              border-slate-100
                              bg-gradient-to-br
                              from-slate-50
                              to-white
                              p-4
                              shadow-sm
                            "
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="text-left">
                                <p
                                  className="
                                    text-[9px]
                                    font-black
                                    uppercase
                                    tracking-[0.18em]
                                    text-slate-400
                                  "
                                >
                                  Profile completion
                                </p>

                                <motion.p
                                  key={completionScore}
                                  initial={{
                                    scale: 0.92,

                                    opacity: 0.6,
                                  }}
                                  animate={{
                                    scale: 1,

                                    opacity: 1,
                                  }}
                                  className="
                                    mt-1
                                    text-2xl
                                    font-black
                                    text-[#071A4A]
                                  "
                                >
                                  {completionScore}%
                                </motion.p>
                              </div>

                              <motion.div
                                whileHover={{
                                  scale: 1.05,
                                }}
                                className="
                                  relative
                                  flex
                                  h-16
                                  w-16
                                  items-center
                                  justify-center
                                  rounded-full
                                "
                                style={{
                                  background: `conic-gradient(
                                    ${secondary} ${completionScore * 3.6}deg,
                                    #E2E8F0 0deg
                                  )`,
                                }}
                              >
                                <div
                                  className="
                                    absolute
                                    inset-[6px]
                                    rounded-full
                                    bg-white
                                  "
                                />

                                <span
                                  className="
                                    relative
                                    z-10
                                    text-[10px]
                                    font-black
                                    text-slate-500
                                  "
                                >
                                  {completionScore}%
                                </span>
                              </motion.div>
                            </div>
                          </div>

                          {/* PHOTO BUTTON */}

                          <motion.button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            whileHover={{
                              y: -2,
                            }}
                            whileTap={{
                              scale: 0.98,
                            }}
                            className="
                              mt-5
                              w-full
                              rounded-full
                              border
                              border-blue-100
                              bg-blue-50
                              px-4
                              py-2.5
                              text-xs
                              font-black
                              text-blue-600
                              transition
                              hover:bg-blue-100
                            "
                          >
                            Change Photo
                          </motion.button>

                          <p
                            className="
                              mt-2
                              text-[10px]
                              leading-4
                              text-slate-400
                            "
                          >
                            JPG, PNG or WEBP · Max 2 MB
                          </p>

                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handlePhotoSelect}
                            className="hidden"
                          />

                          {/* BRIDGE STATUS */}

                          {(membershipLevel ||
                            earnedStatus ||
                            creatorLevel) && (
                            <div
                              className="
                                mt-5
                                border-t
                                border-slate-100
                                pt-4
                                text-left
                              "
                            >
                              <p
                                className="
                                  text-[9px]
                                  font-black
                                  uppercase
                                  tracking-[0.18em]
                                  text-slate-400
                                "
                              >
                                Bridge status
                              </p>

                              <div
                                className="
                                  mt-3
                                  flex
                                  flex-wrap
                                  gap-2
                                "
                              >
                                {membershipLevel && (
                                  <span
                                    className="
                                      rounded-full
                                      bg-blue-50
                                      px-3
                                      py-1.5
                                      text-[10px]
                                      font-black
                                      text-blue-700
                                    "
                                  >
                                    {membershipLevel}
                                  </span>
                                )}

                                {creatorLevel && (
                                  <span
                                    className="
                                      rounded-full
                                      bg-slate-100
                                      px-3
                                      py-1.5
                                      text-[10px]
                                      font-black
                                      text-slate-600
                                    "
                                  >
                                    {creatorLevel}
                                  </span>
                                )}

                                {earnedStatus && (
                                  <span
                                    className="
                                      rounded-full
                                      bg-emerald-50
                                      px-3
                                      py-1.5
                                      text-[10px]
                                      font-black
                                      text-emerald-700
                                    "
                                  >
                                    {earnedStatus}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.aside>

                    {/* =========================================
                        RIGHT FORM
                    ========================================= */}

                    <div
                      className="
                        grid
                        min-w-0
                        gap-5
                        2xl:grid-cols-2
                      "
                    >
                      {/* LEFT FORM COLUMN */}

                      <div className="space-y-5">
                        {/* ABOUT */}

                        <SectionCard
                          index={1}
                          icon={<SparkleIcon />}
                          eyebrow="About You"
                          title="Your story"
                          description="Give people a quick understanding of who you are and what matters to you."
                        >
                          <label className="block">
                            <FieldLabel>Profile Status</FieldLabel>

                            <input
                              type="text"
                              value={profileStatus}
                              onChange={(event) =>
                                setProfileStatus(event.target.value)
                              }
                              placeholder="What are you working on or looking to connect about?"
                              maxLength={160}
                              className="
                                mt-2
                                w-full
                                rounded-2xl
                                border
                                border-slate-200
                                bg-white
                                px-4
                                py-3.5
                                text-sm
                                font-medium
                                text-[#071A4A]
                                shadow-sm
                                outline-none
                                transition-all
                                placeholder:text-slate-400
                                focus:border-blue-300
                                focus:ring-4
                                focus:ring-blue-100/70
                              "
                            />

                            <p
                              className="
                                mt-2
                                text-right
                                text-[10px]
                                font-semibold
                                text-slate-400
                              "
                            >
                              {profileStatus.length}
                              /160
                            </p>
                          </label>

                          <div className="mt-5">
                            <div
                              className="
                                flex
                                flex-wrap
                                items-center
                                justify-between
                                gap-3
                              "
                            >
                              <FieldLabel>About</FieldLabel>

                              {!profileBio.trim() && (
                                <motion.button
                                  type="button"
                                  onClick={handleGenerateBio}
                                  disabled={generatingBio || saving}
                                  whileHover={{
                                    y: -2,
                                  }}
                                  whileTap={{
                                    scale: 0.98,
                                  }}
                                  className="
                                    inline-flex
                                    items-center
                                    gap-2
                                    rounded-full
                                    border
                                    border-blue-100
                                    bg-blue-50
                                    px-3.5
                                    py-2
                                    text-xs
                                    font-black
                                    text-blue-600
                                    transition
                                    hover:bg-blue-100
                                    disabled:opacity-60
                                  "
                                >
                                  <span>✨</span>

                                  {generatingBio
                                    ? "Creating..."
                                    : "Create My Bio with AI"}
                                </motion.button>
                              )}
                            </div>

                            <textarea
                              value={profileBio}
                              onChange={(event) =>
                                setProfileBio(event.target.value)
                              }
                              placeholder="Tell the community a little about yourself..."
                              rows={7}
                              maxLength={1000}
                              className="
                                mt-2
                                w-full
                                resize-none
                                rounded-2xl
                                border
                                border-slate-200
                                bg-white
                                px-4
                                py-3.5
                                text-sm
                                font-medium
                                leading-7
                                text-[#071A4A]
                                shadow-sm
                                outline-none
                                transition-all
                                placeholder:text-slate-400
                                focus:border-blue-300
                                focus:ring-4
                                focus:ring-blue-100/70
                              "
                            />

                            <p
                              className="
                                mt-2
                                text-right
                                text-[10px]
                                font-semibold
                                text-slate-400
                              "
                            >
                              {profileBio.length}
                              /1000
                            </p>
                          </div>
                        </SectionCard>

                        {/* PROFESSIONAL */}

                        <SectionCard
                          index={2}
                          icon={<GlobeIcon />}
                          eyebrow="Professional"
                          title="Your expertise & presence"
                          description="Show what you know and where people can learn more about you."
                        >
                          <label className="block">
                            <FieldLabel>Website</FieldLabel>

                            <input
                              type="url"
                              value={website}
                              onChange={(event) =>
                                setWebsite(event.target.value)
                              }
                              placeholder="https://example.com"
                              className="
                                mt-2
                                w-full
                                rounded-2xl
                                border
                                border-slate-200
                                bg-white
                                px-4
                                py-3.5
                                text-sm
                                font-medium
                                text-[#071A4A]
                                shadow-sm
                                outline-none
                                placeholder:text-slate-400
                                focus:border-blue-300
                                focus:ring-4
                                focus:ring-blue-100/70
                              "
                            />
                          </label>

                          <label className="mt-5 block">
                            <FieldLabel>Expertise / Ask Me About</FieldLabel>

                            <textarea
                              value={expertise}
                              onChange={(event) =>
                                setExpertise(event.target.value)
                              }
                              placeholder="Examples: automation, marketing, construction, leadership, local events..."
                              rows={4}
                              className="
                                mt-2
                                w-full
                                resize-none
                                rounded-2xl
                                border
                                border-slate-200
                                bg-white
                                px-4
                                py-3.5
                                text-sm
                                font-medium
                                leading-6
                                text-[#071A4A]
                                shadow-sm
                                outline-none
                                placeholder:text-slate-400
                                focus:border-blue-300
                                focus:ring-4
                                focus:ring-blue-100/70
                              "
                            />
                          </label>

                          <div
                            className="
                              mt-5
                              grid
                              gap-4
                              md:grid-cols-2
                            "
                          >
                            <label className="block">
                              <FieldLabel>Social Links</FieldLabel>

                              <textarea
                                value={socialLinks}
                                onChange={(event) =>
                                  setSocialLinks(event.target.value)
                                }
                                placeholder={
                                  "LinkedIn: https://...\nFacebook: https://...\nInstagram: https://..."
                                }
                                rows={5}
                                className="
                                  mt-2
                                  w-full
                                  resize-none
                                  rounded-2xl
                                  border
                                  border-slate-200
                                  bg-white
                                  px-4
                                  py-3.5
                                  text-sm
                                  font-medium
                                  leading-6
                                  text-[#071A4A]
                                  shadow-sm
                                  outline-none
                                  placeholder:text-slate-400
                                  focus:border-blue-300
                                  focus:ring-4
                                  focus:ring-blue-100/70
                                "
                              />
                            </label>

                            <label className="block">
                              <FieldLabel>Additional Affiliations</FieldLabel>

                              <textarea
                                value={additionalAffiliations}
                                onChange={(event) =>
                                  setAdditionalAffiliations(event.target.value)
                                }
                                placeholder="Organizations, boards, associations or community groups..."
                                rows={5}
                                className="
                                  mt-2
                                  w-full
                                  resize-none
                                  rounded-2xl
                                  border
                                  border-slate-200
                                  bg-white
                                  px-4
                                  py-3.5
                                  text-sm
                                  font-medium
                                  leading-6
                                  text-[#071A4A]
                                  shadow-sm
                                  outline-none
                                  placeholder:text-slate-400
                                  focus:border-blue-300
                                  focus:ring-4
                                  focus:ring-blue-100/70
                                "
                              />
                            </label>
                          </div>
                        </SectionCard>

                        {/* PROMOTION */}

                        <SectionCard
                          index={3}
                          icon={<SparkleIcon />}
                          eyebrow="Promotion"
                          title="What should Bridge help surface?"
                          description="These preferences guide promotion. They do not affect reputation, ranking or vetting."
                        >
                          <div className="space-y-3">
                            <ToggleRow
                              title="Promote me personally"
                              description="Surface my expertise, knowledge, contributions and participation."
                              checked={promoteMePersonally}
                              onChange={setPromoteMePersonally}
                            />

                            <ToggleRow
                              title="Promote my business / organization"
                              description="Surface the organization connected to my Profile."
                              checked={promoteMyBusinessOrganization}
                              onChange={setPromoteMyBusinessOrganization}
                            />
                          </div>

                          <div className="mt-6">
                            <FieldLabel>
                              What I Want Bridge to Promote
                            </FieldLabel>

                            <p
                              className="
                                mt-1
                                text-xs
                                font-medium
                                leading-5
                                text-slate-400
                              "
                            >
                              Select everything that applies.
                            </p>

                            <div className="mt-3">
                              <OptionGrid
                                options={PROMOTION_OPTIONS}
                                selected={whatIWantBridgeToPromote}
                                onToggle={(option) =>
                                  setWhatIWantBridgeToPromote((current) =>
                                    toggleArrayValue(current, option),
                                  )
                                }
                              />
                            </div>
                          </div>
                        </SectionCard>
                      </div>

                      {/* RIGHT FORM COLUMN */}

                      <div className="space-y-5">
                        {/* OPPORTUNITIES */}

                        <SectionCard
                          index={4}
                          icon={<OpportunityIcon />}
                          eyebrow="Opportunities"
                          title="What are you open to?"
                          description="Tell Bridge what kinds of connections and opportunities may be useful."
                        >
                          <ToggleRow
                            title="Open to opportunities"
                            description="Allow Bridge to consider me for relevant introductions and opportunities."
                            checked={openToOpportunities}
                            onChange={setOpenToOpportunities}
                          />

                          <div className="mt-6">
                            <FieldLabel>Opportunity Types</FieldLabel>

                            <p
                              className="
                                mt-1
                                text-xs
                                font-medium
                                leading-5
                                text-slate-400
                              "
                            >
                              Choose the opportunities that interest you.
                            </p>

                            <div className="mt-3">
                              <OptionGrid
                                options={OPPORTUNITY_OPTIONS}
                                selected={opportunityTypes}
                                disabled={!openToOpportunities}
                                onToggle={(option) =>
                                  setOpportunityTypes((current) =>
                                    toggleArrayValue(current, option),
                                  )
                                }
                              />
                            </div>
                          </div>
                        </SectionCard>

                        {/* PRIVACY */}

                        <SectionCard
                          index={5}
                          icon={<PrivacyIcon />}
                          eyebrow="Privacy"
                          title="Control what appears publicly"
                          description="You decide which contact and social information people can see in the Bridge Directory."
                        >
                          <div
                            className="
                              mb-4
                              flex
                              items-start
                              gap-3
                              rounded-2xl
                              border
                              border-blue-100
                              bg-blue-50/60
                              px-4
                              py-3
                            "
                          >
                            <div
                              className="
                                mt-0.5
                                flex
                                h-8
                                w-8
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                bg-blue-100
                                text-blue-600
                              "
                            >
                              <PrivacyIcon />
                            </div>

                            <div>
                              <p
                                className="
                                  text-xs
                                  font-black
                                  text-blue-800
                                "
                              >
                                Your privacy, your choice
                              </p>

                              <p
                                className="
                                  mt-1
                                  text-[11px]
                                  leading-5
                                  text-blue-600/80
                                "
                              >
                                Turning an option off hides that information
                                from the public Directory.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <ToggleRow
                              title="Show my email"
                              description={email || "No email available"}
                              checked={showEmail}
                              onChange={setShowEmail}
                            />

                            <ToggleRow
                              title="Show my phone"
                              description={phone || "No phone available"}
                              checked={showPhone}
                              onChange={setShowPhone}
                            />

                            <ToggleRow
                              title="Show my social links"
                              description={
                                socialLinks?.trim()
                                  ? "LinkedIn, Facebook, Instagram and other saved social links"
                                  : "No social links added yet"
                              }
                              checked={showSocialLinks}
                              onChange={setShowSocialLinks}
                            />
                          </div>
                        </SectionCard>

                        {/* PREVIEW */}

                        <motion.div
                          custom={6}
                          variants={panelVariants}
                          initial="hidden"
                          animate="visible"
                          whileHover={{
                            y: -3,
                          }}
                          className="
                            relative
                            overflow-hidden
                            rounded-[30px]
                            p-6
                            text-white
                            shadow-[0_28px_85px_rgba(7,26,74,0.22)]
                          "
                          style={{
                            background: `linear-gradient(
                              140deg,
                              ${primary},
                              ${secondary}
                            )`,
                          }}
                        >
                          <motion.div
                            animate={{
                              x: ["-150%", "220%"],
                            }}
                            transition={{
                              repeat: Infinity,

                              duration: 6,

                              ease: "linear",
                            }}
                            className="
                              pointer-events-none
                              absolute
                              inset-y-0
                              w-32
                              rotate-12
                              bg-white/12
                              blur-2xl
                            "
                          />

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
                              pointer-events-none
                              absolute
                              -bottom-24
                              -right-20
                              h-56
                              w-56
                              rounded-full
                              border
                              border-dashed
                              border-white/15
                            "
                          />

                          <div className="relative z-10">
                            <p
                              className="
                                text-[10px]
                                font-black
                                uppercase
                                tracking-[0.2em]
                                text-white/55
                              "
                            >
                              Live Preview
                            </p>

                            <h3
                              className="
                                mt-2
                                text-2xl
                                font-black
                                tracking-[-0.03em]
                              "
                            >
                              See your Profile come together.
                            </h3>

                            <p
                              className="
                                mt-3
                                max-w-xl
                                text-sm
                                font-medium
                                leading-6
                                text-white/75
                              "
                            >
                              Save your changes, then preview how your Bridge
                              identity, expertise and preferences appear.
                            </p>

                            <motion.button
                              type="button"
                              onClick={openFullProfile}
                              whileHover={{
                                y: -2,
                                x: 2,
                              }}
                              whileTap={{
                                scale: 0.98,
                              }}
                              className="
                                mt-5
                                inline-flex
                                items-center
                                gap-2
                                rounded-full
                                border
                                border-white/20
                                bg-white/12
                                px-5
                                py-3
                                text-sm
                                font-black
                                backdrop-blur-xl
                                transition
                                hover:bg-white/20
                              "
                            >
                              Preview Profile
                              <span>↗</span>
                            </motion.button>
                          </div>
                        </motion.div>

                        {/* MESSAGE */}

                        {message && (
                          <motion.div
                            aria-live="polite"
                            initial={{
                              opacity: 0,
                              y: 8,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                            }}
                            className={`
                              rounded-2xl
                              border
                              px-4
                              py-3
                              text-sm
                              font-bold
                              ${noticeClass}
                            `}
                          >
                            {message}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* =========================================
                    SAVE BAR
                ========================================= */}

                <div
                  className="
                    relative
                    z-30
                    shrink-0
                    border-t
                    border-white
                    bg-white/90
                    px-5
                    py-4
                    backdrop-blur-3xl
                    md:px-7
                  "
                >
                  <div
                    className="
                      flex
                      flex-col
                      gap-3
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                    "
                  >
                    <div className="hidden sm:block">
                      <p
                        className="
                          text-xs
                          font-black
                          text-[#071A4A]
                        "
                      >
                        Ready when you are
                      </p>

                      <p
                        className="
                          mt-0.5
                          text-[11px]
                          font-medium
                          text-slate-400
                        "
                      >
                        Save to update your Bridge Profile.
                      </p>
                    </div>

                    <div
                      className="
                        flex
                        w-full
                        gap-3
                        sm:w-auto
                        sm:min-w-[360px]
                      "
                    >
                      <motion.button
                        type="button"
                        onClick={closeEditProfile}
                        disabled={saving}
                        whileHover={{
                          y: -1,
                        }}
                        whileTap={{
                          scale: 0.98,
                        }}
                        className="
                          flex-1
                          rounded-full
                          border
                          border-slate-200
                          bg-white
                          px-5
                          py-3.5
                          text-sm
                          font-black
                          text-slate-600
                          shadow-sm
                          transition
                          hover:bg-slate-50
                          disabled:opacity-50
                        "
                      >
                        Cancel
                      </motion.button>

                      <motion.button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || generatingBio}
                        whileHover={{
                          y: -2,
                          scale: 1.01,
                        }}
                        whileTap={{
                          scale: 0.98,
                        }}
                        className="
                          relative
                          flex-1
                          overflow-hidden
                          rounded-full
                          px-5
                          py-3.5
                          text-sm
                          font-black
                          text-white
                          shadow-[0_16px_38px_rgba(59,130,246,0.30)]
                          transition
                          hover:shadow-[0_22px_50px_rgba(59,130,246,0.40)]
                          disabled:cursor-not-allowed
                          disabled:opacity-60
                        "
                        style={{
                          background: `linear-gradient(
                            135deg,
                            ${primary},
                            ${secondary}
                          )`,
                        }}
                      >
                        {!saving && (
                          <motion.span
                            animate={{
                              x: ["-160%", "220%"],
                            }}
                            transition={{
                              repeat: Infinity,

                              duration: 4.5,

                              ease: "linear",
                            }}
                            className="
                              pointer-events-none
                              absolute
                              inset-y-0
                              w-16
                              rotate-12
                              bg-white/20
                              blur-lg
                            "
                          />
                        )}

                        <span
                          className="
                            relative
                            z-10
                            flex
                            items-center
                            justify-center
                            gap-2
                          "
                        >
                          {saving && (
                            <motion.span
                              animate={{
                                rotate: 360,
                              }}
                              transition={{
                                repeat: Infinity,

                                duration: 0.8,

                                ease: "linear",
                              }}
                              className="
                                h-4
                                w-4
                                rounded-full
                                border-2
                                border-white/30
                                border-t-white
                              "
                            />
                          )}

                          {saving ? "Saving Profile..." : "Save Profile"}
                        </span>
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
