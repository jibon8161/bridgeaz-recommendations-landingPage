import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const DIRECTORY_API = import.meta.env.DEV
  ? "/bridgeaz-api/wp-json/wp/v2/rtcl_listing?per_page=100&_embed"
  : "/api/directory.php";

const fallbackTheme = {
  primary: "#2F66D0",
  secondary: "#F4C900",
};

function decodeHtml(value = "") {
  if (typeof document === "undefined") {
    return value;
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;

  return textarea.value;
}

function stripHtml(value = "") {
  if (typeof document === "undefined") {
    return value.replace(/<[^>]*>/g, " ");
  }

  const element = document.createElement("div");
  element.innerHTML = value;

  return element.textContent || element.innerText || "";
}

function createExcerpt(value = "", maximumLength = 125) {
  const cleaned = stripHtml(value).replace(/\s+/g, " ").trim();

  if (cleaned.length <= maximumLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maximumLength).trim()}…`;
}

function formatSlug(slug = "") {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getListingImage(item) {
  const media = item?._embedded?.["wp:featuredmedia"]?.[0];

  return (
    media?.media_details?.sizes?.["rtcl-thumbnail"]?.source_url ||
    media?.media_details?.sizes?.medium?.source_url ||
    media?.source_url ||
    ""
  );
}

function getListingCategory(item) {
  const classes = Array.isArray(item?.class_list) ? item.class_list : [];

  const categoryClass = classes.find((className) =>
    className.startsWith("rtcl_category-"),
  );

  if (!categoryClass) {
    return "Local Business";
  }

  return formatSlug(categoryClass.replace("rtcl_category-", ""));
}

function getListingLocation(item) {
  const classes = Array.isArray(item?.class_list) ? item.class_list : [];

  const locations = classes
    .filter((className) => className.startsWith("rtcl_location-"))
    .map((className) => formatSlug(className.replace("rtcl_location-", "")))
    .filter((location) => location.toLowerCase() !== "arizona");

  if (locations.length === 0) {
    return "Arizona";
  }

  return `${locations[locations.length - 1]}, Arizona`;
}

function normalizePhoneForLink(phone = "") {
  return phone.replace(/[^\d+]/g, "");
}

function normalizeWebsite(website = "") {
  if (!website) return "";

  if (/^https?:\/\//i.test(website)) {
    return website;
  }

  return `https://${website}`;
}

function LoadingCards() {
  return (
    <div className="flex gap-5 overflow-hidden md:gap-7">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="w-[86vw] min-w-[86vw] rounded-[30px] border border-white/70 bg-white/75 p-2 shadow-[0_18px_50px_rgba(7,26,74,0.10)] backdrop-blur-xl sm:w-[390px] sm:min-w-[390px]"
        >
          <div className="h-52 animate-pulse rounded-[23px] bg-slate-200" />

          <div className="space-y-4 px-4 py-5">
            <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
            <div className="h-7 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-12 w-full animate-pulse rounded-2xl bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactRow({ icon, label, value, href }) {
  if (!value) return null;

  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm">
        {icon}
      </span>

      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          {label}
        </span>

        <span className="block truncate text-sm font-bold text-[#071A4A]">
          {value}
        </span>
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      {content}
    </div>
  );
}

function DirectoryCard({ item, theme, index }) {
  const title = decodeHtml(item?.title?.rendered || "Local Business");
  const image = getListingImage(item);
  const category = getListingCategory(item);
  const fallbackLocation = getListingLocation(item);
  const description = createExcerpt(item?.content?.rendered || "");
  const listingLink = item?.link || "https://bridgeaz.co/directory/";

  const contact = item?.bridge_contact || {};

  const phone = contact?.phone || "";
  const email = contact?.email || "";
  const website = normalizeWebsite(contact?.website || "");
  const address = contact?.address || "";
  const zipcode = contact?.zipcode || "";
  const views = Number(contact?.views) || 0;

  const displayedLocation = address || fallbackLocation;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.55,
        delay: Math.min(index * 0.05, 0.25),
      }}
      className="group flex h-full min-h-[700px] flex-col overflow-hidden rounded-[30px] border border-white/70 bg-white/90 p-2 shadow-[0_18px_50px_rgba(7,26,74,0.12)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_80px_rgba(7,26,74,0.20)]"
    >
      <div className="relative h-56 overflow-hidden rounded-[23px] bg-white shadow-[0_12px_30px_rgba(7,26,74,0.10)]">
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            className="h-full w-full object-contain p-6 transition-transform duration-700 group-hover:scale-105"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
            }}
          >
            <span className="text-6xl font-black text-white">
              {title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#071A4A]/20 via-transparent to-transparent" />

        <div className="absolute left-4 top-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/95 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.17em] text-[#071A4A] shadow-lg backdrop-blur-xl">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: theme.secondary }}
            />

            {category}
          </span>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 max-w-[75%] items-center gap-2 rounded-full border border-white/60 bg-white/95 px-3 py-2 text-xs font-bold text-[#071A4A] shadow-lg backdrop-blur-xl">
            <span>📍</span>
            <span className="truncate">{fallbackLocation}</span>
          </span>

          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/60 bg-white/95 px-3 py-2 text-xs font-bold text-[#071A4A] shadow-lg backdrop-blur-xl">
            <span>👁</span>
            <span>{views}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-5">
        <h3 className="line-clamp-2 text-[23px] font-black leading-[1.08] tracking-[-0.035em] text-[#071A4A]">
          {title}
        </h3>

        <div
          className="mt-3 h-1 w-12 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
          }}
        />

        {description && (
          <p className="mt-4 line-clamp-3 text-sm font-medium leading-6 text-slate-600">
            {description}
          </p>
        )}

        <div className="mt-5 space-y-2.5">
          <ContactRow
            icon="📞"
            label="Phone"
            value={phone}
            href={phone ? `tel:${normalizePhoneForLink(phone)}` : ""}
          />

          <ContactRow
            icon="✉️"
            label="Email"
            value={email}
            href={email ? `mailto:${email}` : ""}
          />

          <ContactRow
            icon="🌐"
            label="Website"
            value={website.replace(/^https?:\/\//i, "").replace(/\/$/, "")}
            href={website}
          />

          <ContactRow icon="📍" label="Address" value={displayedLocation} />

          {zipcode && <ContactRow icon="🏷️" label="ZIP Code" value={zipcode} />}
        </div>

        <div className="mt-auto pt-6">
          <a
            href={listingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-black text-white shadow-[0_14px_34px_rgba(7,26,74,0.18)] transition hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
            }}
          >
            <span>View Full Listing</span>

            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              →
            </span>
          </a>
        </div>
      </div>
    </motion.article>
  );
}

export default function LocalDirectory({ theme: suppliedTheme }) {
  const theme = {
    ...fallbackTheme,
    ...(suppliedTheme || {}),
  };

  const scrollRef = useRef(null);

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadListings() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(DIRECTORY_API, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Directory request failed with status ${response.status}`,
          );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("The directory response was not valid.");
        }

        setListings(data);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          console.error("Directory error:", requestError);
          setError("Unable to load the local directory.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadListings();

    return () => {
      controller.abort();
    };
  }, []);

  function getCardMetrics() {
    const container = scrollRef.current;

    if (!container) {
      return null;
    }

    const card = container.querySelector("[data-directory-card]");

    if (!card) {
      return null;
    }

    const styles = window.getComputedStyle(container);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0");

    return {
      container,
      cardWidth: card.getBoundingClientRect().width,
      gap,
    };
  }

  function scrollCarousel(direction) {
    const metrics = getCardMetrics();

    if (!metrics) {
      return;
    }

    const movement = metrics.cardWidth + metrics.gap;

    metrics.container.scrollBy({
      left: direction === "next" ? movement : -movement,
      behavior: "smooth",
    });
  }

  function handleScroll() {
    const metrics = getCardMetrics();

    if (!metrics) {
      return;
    }

    const index = Math.round(
      metrics.container.scrollLeft / (metrics.cardWidth + metrics.gap),
    );

    setActiveIndex(Math.max(0, Math.min(index, listings.length - 1)));
  }

  function scrollToItem(index) {
    const metrics = getCardMetrics();

    if (!metrics) {
      return;
    }

    metrics.container.scrollTo({
      left: index * (metrics.cardWidth + metrics.gap),
      behavior: "smooth",
    });
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 35 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.75 }}
      className="relative mt-14 border-t border-white/60 pt-14"
    >
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2"
        style={{
          background: `linear-gradient(90deg, transparent, ${theme.primary}, ${theme.secondary}, transparent)`,
        }}
      />

      <div className="mb-8">
        <div
          className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.2em]"
          style={{
            color: theme.primary,
            backgroundColor: `${theme.secondary}22`,
          }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: theme.secondary }}
          />
          BridgeAZ Local Directory
        </div>

        <h2 className="text-3xl font-black tracking-tight text-[#071A4A] md:text-5xl">
          Discover Local Businesses
        </h2>

        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Explore trusted businesses, organizations, services, and local
          connections throughout the BridgeAZ community.
        </p>

        {!loading && !error && (
          <p className="mt-3 text-sm font-bold text-[#071A4A]">
            Showing {listings.length} local businesses
          </p>
        )}
      </div>

      {loading && <LoadingCards />}

      {!loading && error && (
        <div className="rounded-3xl border border-red-200 bg-red-50/90 px-6 py-12 text-center">
          <h3 className="text-xl font-black text-red-800">
            Directory unavailable
          </h3>

          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && listings.length === 0 && (
        <div className="rounded-3xl border border-white/70 bg-white/75 px-6 py-14 text-center shadow-lg backdrop-blur-xl">
          <h3 className="text-2xl font-black text-[#071A4A]">
            No directory listings found
          </h3>
        </div>
      )}

      {!loading && !error && listings.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => scrollCarousel("prev")}
            className="absolute -left-5 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-3xl font-bold text-[#071A4A] shadow-[0_12px_32px_rgba(7,26,74,0.18)] transition hover:-translate-x-1 md:flex"
            aria-label="Previous local businesses"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={() => scrollCarousel("next")}
            className="absolute -right-5 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-3xl font-bold text-[#071A4A] shadow-[0_12px_32px_rgba(7,26,74,0.18)] transition hover:translate-x-1 md:flex"
            aria-label="Next local businesses"
          >
            ›
          </button>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-8 [-ms-overflow-style:none] [scrollbar-width:none] md:gap-7 [&::-webkit-scrollbar]:hidden"
          >
            {listings.map((item, index) => (
              <div
                key={item.id}
                data-directory-card
                className="w-[86vw] min-w-[86vw] max-w-[86vw] shrink-0 snap-start sm:w-[390px] sm:min-w-[390px] sm:max-w-[390px] md:w-[calc((100%-28px)/2)] md:min-w-[calc((100%-28px)/2)] md:max-w-[calc((100%-28px)/2)] xl:w-[calc((100%-56px)/3)] xl:min-w-[calc((100%-56px)/3)] xl:max-w-[calc((100%-56px)/3)]"
              >
                <DirectoryCard item={item} theme={theme} index={index} />
              </div>
            ))}
          </div>

          <div className="mt-1 flex justify-center">
            <div className="flex max-w-full items-center gap-2 overflow-x-auto rounded-full bg-white/85 px-4 py-3 shadow-[0_10px_28px_rgba(7,26,74,0.12)] backdrop-blur-md">
              {listings.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToItem(index)}
                  className="h-2 shrink-0 rounded-full transition-all duration-300"
                  style={{
                    width: activeIndex === index ? "26px" : "8px",
                    background:
                      activeIndex === index
                        ? `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`
                        : "#94A3B8",
                  }}
                  aria-label={`Go to business ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="mt-7 text-center">
            <a
              href="https://bridgeaz.co/directory/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-7 py-4 text-sm font-black text-[#071A4A] shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
            >
              <span>View Full BridgeAZ Directory</span>
              <span>→</span>
            </a>
          </div>
        </div>
      )}
    </motion.section>
  );
}
