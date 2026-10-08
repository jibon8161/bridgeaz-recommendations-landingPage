import { useRef, useState } from "react";
import { motion } from "framer-motion";

import LocalDirectory from "./LocalDirectory";

/* =======================================================
   RECOMMENDATION CAROUSEL
======================================================= */

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

  if (!items.length) {
    return (
      <div
        className="
          rounded-[28px]
          border
          border-dashed
          border-slate-200
          bg-white/70
          px-6
          py-12
          text-center
          shadow-sm
          backdrop-blur-xl
        "
      >
        <p
          className="
            text-lg
            font-black
            text-[#071A4A]
          "
        >
          No recommendations found for this view.
        </p>

        <p
          className="
            mt-2
            text-sm
            font-medium
            text-slate-500
          "
        >
          Try another time range or category.
        </p>
      </div>
    );
  }

  return (
    <div
      className="
        relative
        left-1/2
        w-screen
        -translate-x-1/2
        px-0
        md:left-auto
        md:w-full
        md:translate-x-0
      "
    >
      {/* DESKTOP PREVIOUS */}

      <button
        type="button"
        onClick={() => scrollCarousel("prev")}
        className="
          absolute
          -left-12.5
          top-1/2
          z-30
          hidden
          h-11
          w-11
          -translate-y-1/2
          items-center
          justify-center
          rounded-full
          bg-white
          text-2xl
          font-bold
          text-[#071A4A]
          shadow-[0_12px_30px_rgba(7,26,74,0.16)]
          ring-1
          ring-slate-200
          transition
          hover:-translate-x-1
          hover:shadow-[0_18px_42px_rgba(7,26,74,0.22)]
          md:flex
        "
        aria-label="Previous recommendations"
      >
        ‹
      </button>

      {/* DESKTOP NEXT */}

      <button
        type="button"
        onClick={() => scrollCarousel("next")}
        className="
          absolute
          -right-12.5
          top-1/2
          z-30
          hidden
          h-11
          w-11
          -translate-y-1/2
          items-center
          justify-center
          rounded-full
          bg-white
          text-2xl
          font-bold
          text-[#071A4A]
          shadow-[0_12px_30px_rgba(7,26,74,0.16)]
          ring-1
          ring-slate-200
          transition
          hover:translate-x-1
          hover:shadow-[0_18px_42px_rgba(7,26,74,0.22)]
          md:flex
        "
        aria-label="Next recommendations"
      >
        ›
      </button>

      <div
        className="
          mx-auto
          w-[calc(100vw-86px)]
          overflow-hidden
          md:w-full
          md:overflow-visible
        "
      >
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="
            flex
            snap-x
            snap-mandatory
            gap-4
            overflow-x-auto
            scroll-smooth
            pb-4
            md:gap-7
            md:pb-8
            [-ms-overflow-style:none]
            scrollbar-none
            [&::-webkit-scrollbar]:hidden
          "
        >
          {items.map((item, index) => (
            <div
              key={`${item?.link || item?.title || "item"}-${index}`}
              data-carousel-card
              className="
                w-full
                min-w-full
                max-w-full
                shrink-0
                snap-start
                md:w-[calc((100%-28px)/2)]
                md:min-w-[calc((100%-28px)/2)]
                md:max-w-[calc((100%-28px)/2)]
                xl:w-[calc((100%-56px)/3)]
                xl:min-w-[calc((100%-56px)/3)]
                xl:max-w-[calc((100%-56px)/3)]
              "
            >
              <RecommendationCard item={item} theme={theme} index={index} />
            </div>
          ))}
        </div>
      </div>

      {/* DOTS */}

      <div className="relative z-20 mt-3 flex justify-center">
        <div
          className="
            flex
            items-center
            justify-center
            gap-2
            rounded-full
            bg-white/80
            px-3
            py-2
            shadow-[0_10px_28px_rgba(7,26,74,0.12)]
            backdrop-blur-md
            ring-1
            ring-white/70
          "
        >
          {items.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => scrollToItem(index)}
              className="
                h-2
                rounded-full
                transition-all
                duration-300
              "
              style={{
                width: activeIndex === index ? "26px" : "8px",

                background:
                  activeIndex === index
                    ? `linear-gradient(
                        135deg,
                        ${theme.primary},
                        ${theme.secondary}
                      )`
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

/* =======================================================
   RECOMMENDATION CARD
======================================================= */

function RecommendationCard({ item, theme, index }) {
  const hasImage = Boolean(item?.imageUrl);

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 24,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: index * 0.07,
      }}
      className="h-full"
    >
      <div
        className="
          group
          relative
          flex
          h-full
          min-h-113.75
          w-full
          cursor-pointer
          flex-col
          overflow-hidden
          rounded-[30px]
          bg-white/92
          p-2
          shadow-[0_18px_50px_rgba(7,26,74,0.12)]
          ring-1
          ring-white/80
          backdrop-blur-xl
          transition-all
          duration-500
          hover:-translate-y-2
          hover:shadow-[0_30px_80px_rgba(7,26,74,0.20)]
        "
      >
        {/* SOFT GLOW */}

        <div
          className="
            pointer-events-none
            absolute
            -right-16
            -top-16
            h-44
            w-44
            rounded-full
            opacity-20
            blur-3xl
            transition
            duration-500
            group-hover:opacity-45
          "
          style={{
            backgroundColor: theme.secondary,
          }}
        />

        <div
          className="
            pointer-events-none
            absolute
            -left-20
            bottom-10
            h-44
            w-44
            rounded-full
            opacity-10
            blur-3xl
            transition
            duration-500
            group-hover:opacity-25
          "
          style={{
            backgroundColor: theme.primary,
          }}
        />

        {/* IMAGE */}

        <div
          className="
            relative
            h-56
            overflow-hidden
            rounded-[22px]
            bg-slate-100
            shadow-[0_14px_35px_rgba(7,26,74,0.12)]
          "
        >
          {hasImage ? (
            <img
              src={item.imageUrl}
              alt={item?.title || "Recommendation image"}
              className="
                h-full
                w-full
                object-cover
                transition-transform
                duration-700
                ease-[cubic-bezier(0.25,1,0.5,1)]
                group-hover:scale-110
              "
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background: `linear-gradient(
                  135deg,
                  ${theme.primary},
                  ${theme.secondary}
                )`,
              }}
            />
          )}

          <div
            className="
              absolute
              inset-0
              bg-linear-to-t
              from-[#071A4A]/78
              via-[#071A4A]/12
              to-transparent
            "
          />

          {/* SHINE */}

          <div
            className="
              pointer-events-none
              absolute
              inset-y-0
              -left-1/2
              w-1/3
              skew-x-[-18deg]
              bg-white/30
              opacity-0
              transition-all
              duration-700
              group-hover:left-[120%]
              group-hover:opacity-100
            "
          />

          {/* TYPE */}

          <div className="absolute left-4 top-4">
            <span
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-white/40
                bg-white/95
                px-3.5
                py-1.5
                text-[10px]
                font-black
                uppercase
                tracking-[0.2em]
                text-[#071A4A]
                shadow-[0_12px_28px_rgba(7,26,74,0.16)]
                backdrop-blur-md
              "
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: theme.secondary,
                }}
              />

              {item?.type || "Local Pick"}
            </span>
          </div>

          {/* DATE */}

          {item?.date && (
            <div className="absolute bottom-4 left-4 right-4">
              <div
                className="
                  inline-flex
                  max-w-full
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-white/45
                  bg-white/95
                  px-3.5
                  py-1.5
                  text-xs
                  font-bold
                  text-[#071A4A]
                  shadow-[0_12px_28px_rgba(7,26,74,0.16)]
                  backdrop-blur-xl
                "
              >
                <span>📅</span>

                <span className="truncate">{item.date}</span>
              </div>
            </div>
          )}
        </div>

        {/* CONTENT */}

        <div
          className="
            relative
            z-10
            flex
            flex-1
            flex-col
            px-4
            pb-4
            pt-5
          "
        >
          <h3
            className="
              line-clamp-2
              text-[24px]
              font-black
              leading-[1.05]
              tracking-[-0.04em]
              text-[#071A4A]
            "
          >
            {item?.title}
          </h3>

          <div
            className="
              mt-3
              h-1
              w-12
              rounded-full
            "
            style={{
              background: `linear-gradient(
                90deg,
                ${theme.primary},
                ${theme.secondary}
              )`,

              boxShadow: `0 0 18px ${theme.secondary}66`,
            }}
          />

          {item?.details && (
            <p
              className="
                mt-4
                line-clamp-3
                text-[14px]
                font-medium
                leading-6
                text-slate-600
              "
            >
              {item.details}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {item?.location && (
              <div
                className="
                  inline-flex
                  max-w-full
                  items-center
                  gap-2
                  rounded-full
                  bg-white
                  px-3
                  py-2
                  text-xs
                  font-bold
                  text-slate-600
                  shadow-[0_8px_20px_rgba(7,26,74,0.06)]
                  ring-1
                  ring-slate-200/80
                "
              >
                <span>📍</span>

                <span className="truncate">{item.location}</span>
              </div>
            )}

            {item?.submissionType && (
              <div
                className="
                  inline-flex
                  max-w-full
                  items-center
                  gap-2
                  rounded-full
                  bg-white
                  px-3
                  py-2
                  text-xs
                  font-bold
                  text-slate-600
                  shadow-[0_8px_20px_rgba(7,26,74,0.06)]
                  ring-1
                  ring-slate-200/80
                "
              >
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
                className="
                  group/btn
                  relative
                  inline-flex
                  w-full
                  items-center
                  justify-between
                  overflow-hidden
                  rounded-2xl
                  px-4
                  py-3.5
                  text-sm
                  font-black
                  text-white
                  shadow-[0_14px_34px_rgba(7,26,74,0.18)]
                  transition-all
                  duration-300
                  hover:scale-[1.02]
                  hover:shadow-[0_18px_44px_rgba(7,26,74,0.24)]
                "
                style={{
                  background: `linear-gradient(
                    135deg,
                    ${theme.primary},
                    ${theme.secondary}
                  )`,
                }}
              >
                <span
                  className="
                    absolute
                    inset-0
                    bg-white/0
                    transition
                    duration-300
                    group-hover/btn:bg-white/12
                  "
                />

                <span className="relative z-10">View Details</span>

                <span
                  className="
                    relative
                    z-10
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-full
                    bg-white/20
                    transition
                    duration-300
                    group-hover/btn:translate-x-1
                  "
                >
                  →
                </span>
              </a>
            ) : (
              <div
                className="
                  inline-flex
                  w-full
                  items-center
                  justify-center
                  rounded-2xl
                  bg-slate-50
                  px-4
                  py-3.5
                  text-sm
                  font-black
                  text-slate-500
                  ring-1
                  ring-slate-200
                "
              >
                Details Coming Soon
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ACCENT */}

        <div
          className="
            absolute
            bottom-0
            left-10
            right-10
            h-0.75
            rounded-full
            opacity-80
          "
          style={{
            background: `linear-gradient(
              90deg,
              transparent,
              ${theme.primary},
              ${theme.secondary},
              transparent
            )`,
          }}
        />
      </div>
    </motion.div>
  );
}

/* =======================================================
   REUSABLE PROFILE RECOMMENDATIONS
======================================================= */

export default function ProfileRecommendations({
  rawData,
  profile,
  token,
  showDirectory = true,
}) {
  const [showAllFuture, setShowAllFuture] = useState(true);
  const [daysFilter, setDaysFilter] = useState(14);

  const [activeSection, setActiveSection] = useState("events");

  const [communityFilter, setCommunityFilter] = useState("all");

  const theme = profile?.theme || {
    primary: "#071A4A",
    secondary: "#3B82F6",
    background: "#F7F7F7",
  };

  /* =====================================================
     RAW RECOMMENDATION DATA
  ===================================================== */

  const next14DaysItems = rawData?.recommendations?.next14DaysItems || [];

  const allFutureItems = rawData?.recommendations?.allFutureItems || [];

  const selectedBaseItems = showAllFuture ? allFutureItems : next14DaysItems;

  /* =====================================================
     DATE FILTERING
  ===================================================== */

  const todayBase = new Date();

  const getUTCDateOnly = (dateValue) => {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toISOString().slice(0, 10);
  };

  const todayUTC = getUTCDateOnly(todayBase);

  const endDate = new Date(todayBase);

  endDate.setDate(endDate.getDate() + daysFilter);

  const endUTC = getUTCDateOnly(endDate);

  const filteredItems = selectedBaseItems.filter((item) => {
    if (showAllFuture) {
      return true;
    }

    if (!item?.rawDate) {
      return false;
    }

    const itemUTC = getUTCDateOnly(item.rawDate);

    if (!itemUTC) {
      return false;
    }

    return itemUTC >= todayUTC && itemUTC <= endUTC;
  });

  /* =====================================================
     ACTIVITIES
  ===================================================== */

  const selectedForYouItems = filteredItems.filter((item) => {
    return item?.type?.toLowerCase().trim() === "event";
  });

  /* =====================================================
     COMMUNITY HUB
  ===================================================== */

  const communityBaseItems =
    activeSection === "hub" &&
    communityFilter !== "all" &&
    communityFilter !== "An activity, event, class, or opportunity"
      ? allFutureItems
      : filteredItems;

  const allCommunityItems = communityBaseItems.filter((item) => {
    return item?.type?.toLowerCase().trim() === "submission";
  });

  const allFutureCommunityItems = allFutureItems.filter((item) => {
    return item?.type?.toLowerCase().trim() === "submission";
  });

  const communityCategories = [
    "An activity, event, class, or opportunity",
    "A resource, article, tip, or link",
    "A helpful Document, template, or guide",
  ];

  const communityHubItems = allCommunityItems.filter((item) => {
    if (communityFilter === "all") {
      return true;
    }

    return (
      item?.submissionType?.toLowerCase() === communityFilter.toLowerCase()
    );
  });

  const activeItems =
    activeSection === "events" ? selectedForYouItems : communityHubItems;

  const shouldShowDateFilter =
    activeSection === "events" ||
    (activeSection === "hub" &&
      communityFilter === "An activity, event, class, or opportunity");

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <section
      className="
        relative
        z-10
        px-4
        pb-8
        md:px-6
        md:pb-12
      "
    >
      <div
        className="
          mx-auto
          w-full
          max-w-7xl
          px-4
        "
      >
        {/* HEADER */}

        <div className="mb-6 md:mb-8">
          <h2
            className="
              mt-3
              text-4xl
              font-bold
              text-[#071A4A]
            "
          >
            Selected For You
          </h2>

          {/* MAIN TABS */}

          <div className="mt-7 flex flex-wrap gap-5">
            {/* Local Events */}
            <button
              type="button"
              onClick={() => setActiveSection("events")}
              className="group relative inline-block p-2"
            >
              <span
                className="relative z-10 block overflow-hidden rounded-lg border-2 px-7 py-3 text-lg font-black leading-tight transition-colors duration-300 ease-out group-hover:text-white"
                style={{
                  borderColor:
                    activeSection === "events" ? theme.primary : "#071A4A",
                  color: activeSection === "events" ? theme.primary : "#071A4A",
                }}
              >
                {/* White base */}
                <span className="absolute inset-0 h-full w-full rounded-lg bg-white" />

                {/* Animated theme gradient */}
                <span
                  className="absolute left-1/2 top-1/2 h-80 w-80 translate-x-[140%] -translate-y-1/2 -rotate-90 rounded-full transition-all duration-500 ease-out group-hover:-translate-x-1/2 group-hover:-rotate-180"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                  }}
                />

                <span className="relative z-10">Local Events</span>
              </span>

              {/* Offset accent only when selected */}
              {activeSection === "events" && (
                <span
                  className="absolute bottom-0 right-0 h-12 w-full -mb-1 -mr-1 rounded-lg transition-all duration-200 ease-linear group-hover:mb-0 group-hover:mr-0"
                  style={{
                    background: theme.primary,
                  }}
                />
              )}
            </button>

            {/* Community Hub */}
            <button
              type="button"
              onClick={() => setActiveSection("hub")}
              className="group relative inline-block p-2"
            >
              <span
                className="relative z-10 block overflow-hidden rounded-lg border-2 px-7 py-3 text-lg font-black leading-tight transition-colors duration-300 ease-out group-hover:text-white"
                style={{
                  borderColor:
                    activeSection === "hub" ? theme.primary : "#071A4A",
                  color: activeSection === "hub" ? theme.primary : "#071A4A",
                }}
              >
                {/* White base */}
                <span className="absolute inset-0 h-full w-full rounded-lg bg-white" />

                {/* Animated theme gradient */}
                <span
                  className="absolute left-1/2 top-1/2 h-80 w-80 translate-x-[140%] -translate-y-1/2 -rotate-90 rounded-full transition-all duration-500 ease-out group-hover:-translate-x-1/2 group-hover:-rotate-180"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                  }}
                />

                <span className="relative z-10">Community Hub</span>
              </span>

              {/* Offset accent only when selected */}
              {activeSection === "hub" && (
                <span
                  className="absolute bottom-0 right-0 h-12 w-full -mb-1 -mr-1 rounded-lg transition-all duration-200 ease-linear group-hover:mb-0 group-hover:mr-0"
                  style={{
                    background: theme.primary,
                  }}
                />
              )}
            </button>
          </div>

          {/* COMMUNITY CATEGORIES */}

          {activeSection === "hub" && (
            <div
              className="
                mt-6
                flex
                flex-wrap
                gap-3
              "
            >
              {communityCategories.map((type) => {
                const count =
                  type === "An activity, event, class, or opportunity"
                    ? allCommunityItems.filter(
                        (item) => item.submissionType === type,
                      ).length
                    : allFutureCommunityItems.filter(
                        (item) => item.submissionType === type,
                      ).length;

                const label =
                  type === "An activity, event, class, or opportunity"
                    ? `Activities (${count})`
                    : type === "A resource, article, tip, or link"
                      ? `Resources (${count})`
                      : `Documents (${count})`;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCommunityFilter(type)}
                    className="
        rounded-full
        border
        px-4
        py-2
        text-sm
        font-bold
        transition
        hover:scale-105
      "
                    style={{
                      backgroundColor:
                        communityFilter === type ? theme.primary : "#ffffff",

                      color:
                        communityFilter === type ? "#ffffff" : theme.primary,

                      borderColor:
                        communityFilter === type ? theme.primary : "#E5E7EB",

                      boxShadow:
                        communityFilter === type
                          ? `0 0 0 3px ${theme.primary}33`
                          : "none",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          <p
            className="
              mt-3
              max-w-2xl
              text-gray-600
            "
          >
            Local events, resources, and opportunities based on your interests.
          </p>

          <p
            className="
              mt-2
              text-sm
              font-bold
              text-[#071A4A]
            "
          >
            Showing {activeItems.length}{" "}
            {activeSection === "events" ? "activities" : "submissions"}
          </p>
        </div>

        {/* BODY */}

        <div
          className="
            relative
            px-0
            pb-6
            md:px-12
            md:pb-8
          "
        >
          {/* DATE FILTER */}

          {shouldShowDateFilter && (
            <div className="mb-5 md:mb-6">
              {/* MOBILE */}

              <div className="md:hidden">
                <label
                  className="
                    mb-2
                    block
                    text-sm
                    font-black
                    text-[#071A4A]
                  "
                >
                  Time Range
                </label>

                <select
                  value={showAllFuture ? "all" : daysFilter}
                  onChange={(event) => {
                    const value = event.target.value;

                    if (value === "all") {
                      setShowAllFuture(true);
                    } else {
                      setShowAllFuture(false);

                      setDaysFilter(Number(value));
                    }
                  }}
                  className="
                    w-full
                    rounded-2xl
                    border
                    bg-white
                    px-4
                    py-3
                    text-sm
                    font-bold
                    shadow-lg
                  "
                  style={{
                    color: theme.primary,

                    borderColor: `${theme.primary}33`,
                  }}
                >
                  <option value={3}>3 Days</option>

                  <option value={7}>7 Days</option>

                  <option value={14}>14 Days</option>

                  <option value="all">All Future</option>
                </select>
              </div>

              {/* DESKTOP */}

              <div className="hidden md:flex">
                <div
                  className="
                    inline-flex
                    rounded-full
                    border
                    bg-white
                    p-1
                    shadow-lg
                  "
                >
                  {[
                    {
                      value: 3,
                      label: "3 Days",
                    },
                    {
                      value: 7,
                      label: "7 Days",
                    },
                    {
                      value: 14,
                      label: "14 Days",
                    },
                    {
                      value: "all",
                      label: "All Future",
                    },
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
                        className="
                          rounded-full
                          px-5
                          py-2.5
                          text-sm
                          font-black
                          transition
                        "
                        style={{
                          backgroundColor: isActive
                            ? theme.primary
                            : "transparent",

                          color: isActive ? "#ffffff" : theme.primary,
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

          {/* CAROUSEL */}

          <div className="relative px-0 md:px-10">
            <CustomRecommendationCarousel items={activeItems} theme={theme} />
          </div>

          {/* DIRECTORY */}

          {showDirectory && activeSection === "hub" && (
            <LocalDirectory theme={theme} viewerToken={token} />
          )}
        </div>
      </div>
    </section>
  );
}
