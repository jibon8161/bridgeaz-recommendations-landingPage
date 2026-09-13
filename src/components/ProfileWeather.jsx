import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const PRESCOTT = {
  latitude: 34.54,
  longitude: -112.4685,
  name: "Prescott, Arizona",
  timezone: "America/Phoenix",
};

const REFRESH_INTERVAL = 15 * 60 * 1000;

/* -------------------------------------------------------
   TEMPERATURE
------------------------------------------------------- */

function fahrenheitToCelsius(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }

  return Math.round(((Number(value) - 32) * 5) / 9);
}

function displayTemperature(value, unit) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return unit === "C" ? fahrenheitToCelsius(value) : Math.round(Number(value));
}

/* -------------------------------------------------------
   DATE / TIME
------------------------------------------------------- */

function formatClock(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PRESCOTT.timezone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PRESCOTT.timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatHour(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: PRESCOTT.timezone,
    hour: "numeric",
    hour12: true,
  }).format(new Date(value));
}

function formatShortDay(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: PRESCOTT.timezone,
    weekday: "short",
  }).format(new Date(value));
}

function formatUpdated(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: PRESCOTT.timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

/* -------------------------------------------------------
   NWS UNIT HELPERS
------------------------------------------------------- */

function celsiusToFahrenheit(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }

  return Math.round((Number(value) * 9) / 5 + 32);
}

function kmhToMph(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }

  return Math.round(Number(value) * 0.621371);
}

/* -------------------------------------------------------
   WEATHER ICON
------------------------------------------------------- */

function weatherEmoji(text = "", isDaytime = true) {
  const value = text.toLowerCase();

  if (value.includes("thunder") || value.includes("storm")) {
    return "⛈️";
  }

  if (value.includes("snow") || value.includes("sleet")) {
    return "🌨️";
  }

  if (value.includes("rain") || value.includes("shower")) {
    return "🌧️";
  }

  if (value.includes("drizzle")) {
    return "🌦️";
  }

  if (value.includes("fog") || value.includes("mist")) {
    return "🌫️";
  }

  if (
    value.includes("mostly cloudy") ||
    value.includes("cloudy") ||
    value.includes("overcast")
  ) {
    return "☁️";
  }

  if (value.includes("partly") || value.includes("mostly sunny")) {
    return isDaytime ? "🌤️" : "☁️";
  }

  if (value.includes("sunny") || value.includes("clear")) {
    return isDaytime ? "☀️" : "🌙";
  }

  return isDaytime ? "🌤️" : "🌙";
}

/* -------------------------------------------------------
   NWS FETCH
------------------------------------------------------- */

async function fetchNws(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/geo+json",
    },
  });

  if (!response.ok) {
    throw new Error(`NWS request failed (${response.status})`);
  }

  return response.json();
}

/* -------------------------------------------------------
   UNIT TOGGLE
------------------------------------------------------- */

function UnitToggle({ unit, setUnit }) {
  return (
    <div className="inline-flex rounded-full border border-white/20 bg-black/10 p-1 shadow-lg backdrop-blur-xl">
      {["F", "C"].map((value) => {
        const active = unit === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => setUnit(value)}
            className="relative min-w-[42px] rounded-full px-3 py-1.5 text-xs font-black transition"
          >
            {active && (
              <motion.span
                layoutId="weather-unit-active"
                className="absolute inset-0 rounded-full bg-white shadow-md"
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 35,
                }}
              />
            )}

            <span
              className={`relative z-10 ${
                active ? "text-[#173B73]" : "text-white/55"
              }`}
            >
              °{value}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------
   TEMPERATURE GRAPH
------------------------------------------------------- */

function TemperatureGraph({ items, primary, secondary, unit }) {
  if (!items?.length) return null;

  const width = 900;
  const height = 145;

  const convertedItems = items.map((item) => ({
    ...item,
    displayTemperature: displayTemperature(item.temperature, unit),
  }));

  const temperatures = convertedItems.map((item) => item.displayTemperature);

  const minimum = Math.min(...temperatures);
  const maximum = Math.max(...temperatures);
  const range = Math.max(maximum - minimum, 5);

  const leftPadding = 35;
  const rightPadding = 35;
  const topPadding = 32;
  const bottomPadding = 30;

  const availableWidth = width - leftPadding - rightPadding;

  const availableHeight = height - topPadding - bottomPadding;

  const points = convertedItems.map((item, index) => {
    const x =
      leftPadding +
      (index / Math.max(convertedItems.length - 1, 1)) * availableWidth;

    const normalized = (item.displayTemperature - minimum) / range;

    const y = topPadding + availableHeight - normalized * availableHeight;

    return {
      ...item,
      x,
      y,
    };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `
    ${linePath}
    L ${points[points.length - 1].x} ${height - bottomPadding}
    L ${points[0].x} ${height - bottomPadding}
    Z
  `;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-[130px] w-full overflow-visible"
      >
        <defs>
          <linearGradient id="nwsWeatherArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={secondary} stopOpacity="0.35" />

            <stop offset="100%" stopColor={secondary} stopOpacity="0" />
          </linearGradient>

          <linearGradient id="nwsWeatherLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" />

            <stop offset="50%" stopColor="#8CB9FF" />

            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        <motion.path
          d={areaPath}
          fill="url(#nwsWeatherArea)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        <motion.path
          key={unit}
          d={linePath}
          fill="none"
          stroke="url(#nwsWeatherLine)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{
            pathLength: 0,
            opacity: 0.6,
          }}
          animate={{
            pathLength: 1,
            opacity: 1,
          }}
          transition={{
            duration: 0.8,
          }}
        />

        {points.map((point, index) => (
          <motion.g
            key={`${point.startTime}-${unit}`}
            initial={{
              opacity: 0,
              scale: 0.6,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              delay: index * 0.035,
            }}
          >
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="white"
              stroke={primary}
              strokeWidth="2"
            />

            <text
              x={point.x}
              y={point.y - 13}
              textAnchor="middle"
              fill="white"
              fontSize="14"
              fontWeight="900"
            >
              {point.displayTemperature}°
            </text>
          </motion.g>
        ))}
      </svg>

      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))`,
        }}
      >
        {items.map((item) => (
          <div key={item.startTime} className="text-center">
            <p className="text-[10px] font-black uppercase text-white/55 md:text-xs">
              {formatHour(item.startTime)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   MAIN
------------------------------------------------------- */

export default function ProfileWeather({
  primary = "#071A4A",
  secondary = "#3B82F6",
}) {
  const [weather, setWeather] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [clock, setClock] = useState(new Date());

  const [unit, setUnit] = useState("F");

  /* LIVE CLOCK */
  useEffect(() => {
    const interval = setInterval(() => {
      setClock(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /* LIVE WEATHER */
  useEffect(() => {
    let active = true;

    async function loadWeather() {
      try {
        const pointData = await fetchNws(
          `https://api.weather.gov/points/${PRESCOTT.latitude},${PRESCOTT.longitude}`,
        );

        if (!active) return;

        const point = pointData?.properties;

        if (!point) {
          throw new Error("Forecast location unavailable.");
        }

        const [forecastData, hourlyData, stationsData, alertsData] =
          await Promise.all([
            fetchNws(point.forecast),

            fetchNws(point.forecastHourly),

            fetchNws(point.observationStations),

            fetchNws(
              `https://api.weather.gov/alerts/active?point=${PRESCOTT.latitude},${PRESCOTT.longitude}`,
            ),
          ]);

        const station =
          stationsData?.features?.[0]?.properties?.stationIdentifier;

        let observation = null;

        if (station) {
          try {
            const observationData = await fetchNws(
              `https://api.weather.gov/stations/${station}/observations/latest`,
            );

            observation = observationData?.properties || null;
          } catch (observationError) {
            console.warn("Observation unavailable:", observationError);
          }
        }

        const hourlyPeriods = hourlyData?.properties?.periods || [];

        const forecastPeriods = forecastData?.properties?.periods || [];

        const firstHourly = hourlyPeriods[0] || {};

        let currentTemperature = celsiusToFahrenheit(
          observation?.temperature?.value,
        );

        if (currentTemperature === null) {
          currentTemperature = firstHourly.temperature ?? null;
        }

        const current = {
          temperature: currentTemperature,

          description:
            observation?.textDescription ||
            firstHourly.shortForecast ||
            "Current conditions",

          humidity:
            observation?.relativeHumidity?.value !== null &&
            observation?.relativeHumidity?.value !== undefined
              ? Math.round(observation.relativeHumidity.value)
              : (firstHourly?.relativeHumidity?.value ?? null),

          windSpeed: kmhToMph(observation?.windSpeed?.value),

          windText: firstHourly.windSpeed || null,

          isDaytime: firstHourly.isDaytime ?? true,

          precipitation: firstHourly?.probabilityOfPrecipitation?.value ?? 0,

          timestamp:
            observation?.timestamp ||
            firstHourly.startTime ||
            new Date().toISOString(),
        };

        const hourly = hourlyPeriods
          .slice(0, 24)
          .filter((_, index) => index % 3 === 0)
          .slice(0, 8)
          .map((period) => ({
            startTime: period.startTime,

            temperature: period.temperature,

            shortForecast: period.shortForecast,

            precipitation: period?.probabilityOfPrecipitation?.value ?? 0,

            humidity: period?.relativeHumidity?.value ?? null,

            isDaytime: period.isDaytime,
          }));

        const daily = forecastPeriods
          .filter((period) => period.isDaytime)
          .slice(0, 7)
          .map((period) => {
            const periodIndex = forecastPeriods.findIndex(
              (item) => item.number === period.number,
            );

            const nightPeriod = forecastPeriods[periodIndex + 1];

            return {
              name: period.name,

              startTime: period.startTime,

              high: period.temperature,

              low:
                nightPeriod && !nightPeriod.isDaytime
                  ? nightPeriod.temperature
                  : null,

              shortForecast: period.shortForecast,

              detailedForecast: period.detailedForecast,

              precipitation: period?.probabilityOfPrecipitation?.value ?? 0,
            };
          });

        const alerts =
          alertsData?.features
            ?.map((feature) => ({
              id: feature.id || feature.properties?.id,

              event: feature.properties?.event,

              headline: feature.properties?.headline,

              severity: feature.properties?.severity,

              description: feature.properties?.description,
            }))
            .filter((alert) => alert.event) || [];

        if (!active) return;

        setWeather({
          current,
          hourly,
          daily,
          alerts,
          station,
          updatedAt: new Date().toISOString(),
        });

        setError("");
        setLoading(false);
      } catch (weatherError) {
        console.error("NWS WEATHER ERROR:", weatherError);

        if (!active) return;

        setError("Live weather is temporarily unavailable.");

        setLoading(false);
      }
    }

    loadWeather();

    const refreshInterval = setInterval(loadWeather, REFRESH_INTERVAL);

    return () => {
      active = false;

      clearInterval(refreshInterval);
    };
  }, []);

  const hourly = useMemo(() => weather?.hourly || [], [weather]);

  const daily = useMemo(() => weather?.daily || [], [weather]);

  if (loading && !weather) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-white">
        <motion.div
          animate={{
            scale: [1, 1.12, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.8,
          }}
          className="text-center"
        >
          <div className="text-5xl">☀️</div>

          <p className="mt-4 text-xs font-black uppercase tracking-[0.3em] text-white/70">
            Loading Prescott Weather
          </p>
        </motion.div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-center text-white">
        <div>
          <div className="text-5xl">🌤️</div>

          <p className="mt-3 font-black">Prescott Weather</p>

          <p className="mt-2 text-sm text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  const current = weather.current;

  const conditionIcon = weatherEmoji(current?.description, current?.isDaytime);

  const activeAlert = weather.alerts?.[0];

  return (
    <div className="relative min-h-[320px] overflow-hidden px-6 py-5 text-white md:px-8">
      {/* BACKGROUND LIGHT */}
      <motion.div
        animate={{
          x: ["-20%", "20%", "-20%"],
          y: [0, -20, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 16,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
      />

      {/* ALERT */}
      {activeAlert && (
        <div className="relative z-10 mb-4 rounded-2xl border border-amber-300/30 bg-amber-400/15 px-4 py-3 backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">
            ⚠ Weather Alert
          </p>

          <p className="mt-1 font-black">{activeAlert.event}</p>
        </div>
      )}

      <div className="relative z-10">
        {/* TOP AREA */}
        <div className="flex items-start justify-between gap-6">
          {/* CURRENT WEATHER */}
          <div className="flex items-center gap-5">
            <motion.div
              animate={{
                y: [0, -5, 0],
                rotate: [-2, 2, -2],
              }}
              transition={{
                repeat: Infinity,
                duration: 4,
              }}
              className="text-6xl drop-shadow-xl"
            >
              {conditionIcon}
            </motion.div>

            <div>
              <div className="flex items-end gap-2">
                <motion.p
                  key={`${current.temperature}-${unit}`}
                  initial={{
                    opacity: 0,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className="text-5xl font-black leading-none tracking-[-0.06em] md:text-6xl"
                >
                  {displayTemperature(current.temperature, unit)}°
                </motion.p>

                <span className="mb-1 text-sm font-black text-white/50">
                  {unit}
                </span>
              </div>

              <p className="mt-2 text-sm font-black">{current.description}</p>

              <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-white/55">
                {current.humidity !== null && (
                  <span>💧 {current.humidity}%</span>
                )}

                {(current.windSpeed || current.windText) && (
                  <span>
                    💨{" "}
                    {current.windSpeed
                      ? `${current.windSpeed} mph`
                      : current.windText}
                  </span>
                )}

                <span>☔ {current.precipitation || 0}%</span>
              </div>
            </div>
          </div>

          {/* LOCATION / CLOCK / UNIT */}
          <div className="flex flex-col items-end text-right">
            <p className="text-sm font-black">{PRESCOTT.name}</p>

            <p className="mt-1 text-xs font-bold text-white/50">
              {formatDate(clock)}
            </p>

            <p className="mt-1 text-xl font-black md:text-2xl">
              {formatClock(clock)}
            </p>

            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
              Arizona Time
            </p>

            {/* F / C SWITCH */}
            <div className="mt-3">
              <UnitToggle unit={unit} setUnit={setUnit} />
            </div>
          </div>
        </div>

        {/* HOURLY GRAPH */}
        {hourly.length > 0 && (
          <div className="mt-3">
            <TemperatureGraph
              items={hourly}
              primary={primary}
              secondary={secondary}
              unit={unit}
            />
          </div>
        )}

        {/* 7 DAY */}
        <div className="mt-5 border-t border-white/15 pt-4">
          <div className="grid grid-cols-7 gap-2 md:gap-3">
            {daily.map((day, index) => {
              const icon = weatherEmoji(day.shortForecast, true);

              return (
                <motion.div
                  key={day.startTime}
                  whileHover={{
                    y: -5,
                    scale: 1.03,
                  }}
                  className={`rounded-2xl px-1 py-3 text-center transition ${
                    index === 0
                      ? "bg-white/15 shadow-lg ring-1 ring-white/20"
                      : "hover:bg-white/10"
                  }`}
                  title={day.detailedForecast}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/65 md:text-xs">
                    {index === 0 ? "Today" : formatShortDay(day.startTime)}
                  </p>

                  <div className="my-2 text-3xl">{icon}</div>

                  <div className="flex justify-center gap-1 text-xs font-black">
                    <span>{displayTemperature(day.high, unit)}°</span>

                    {day.low !== null && (
                      <span className="text-white/40">
                        {displayTemperature(day.low, unit)}°
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-[9px] font-bold text-sky-200">
                    💧 {day.precipitation || 0}%
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* FOOT */}
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[10px] font-semibold text-white/35">
          <span>U.S. National Weather Service</span>

          <span>Updated {formatUpdated(weather.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}
