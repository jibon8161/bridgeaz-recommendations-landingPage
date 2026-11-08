import { useCallback, useEffect, useState } from "react";
import { enableBridgeNotifications } from "./notifications";
import { motion } from "framer-motion";
import { onMessage } from "firebase/messaging";
import { messaging } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import homeImage from "./assets/homeImage.png";
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
  LoaderCircle,
  Bell,
} from "lucide-react";

const BRIDGE_LOGO =
  "https://mcusercontent.com/2ead8cf9844eae73676cdedb6/images/5c553236-b34b-a985-35dd-24d9bba8f0a1.png";

const HERO_IMAGE = homeImage;

const HOW_TO_VIDEOS = [
  {
    title: "Welcome to Bridge",
    url: "https://drive.google.com/file/d/18w5TZOZFaJn0iZO2ocIVnWzZWNbYeg59/view?usp=sharing",
  },
  {
    title: "Share with Bridge",
    url: "https://drive.google.com/file/d/1TGRtU3DXrb7An5-ZtRXNpamGKwNqEV2v/view?usp=sharing",
  },
  {
    title: "Your Local Interests",
    url: "https://drive.google.com/file/d/12boIR9PWlH-gBif3eV6yFJxSut9U5CBK/view?usp=sharing",
  },
  {
    title: "Connect On Bridge",
    url: "https://drive.google.com/file/d/1BGhhZBsyePzzoGztNb2kaP3eks7QRXoS/view?usp=sharing",
  },
];

const getDrivePreviewUrl = (url) => {
  if (!url) return "";

  return url
    .replace("/view?usp=sharing", "/preview")
    .replace("/view", "/preview");
};

export default function MyBridgeHome() {
  const [user, setUser] = useState(null);

  // Actual Bridge member returned from Airtable through backend
  const [bridgeMember, setBridgeMember] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const [notificationOpen, setNotificationOpen] = useState(false);

  const [inAppNotifications, setInAppNotifications] = useState([]);

  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const [inAppNotificationsLoading, setInAppNotificationsLoading] =
    useState(false);

  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    Notification.permission === "granted",
  );
  const [selectedVideo, setSelectedVideo] = useState(null);
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
    const syncInstallPrompt = () => {
      if (window.__bridgeInstallPrompt) {
        setInstallPrompt(window.__bridgeInstallPrompt);
      }
    };

    const handleInstalled = () => {
      setIsAppInstalled(true);
      setInstallPrompt(null);
    };

    syncInstallPrompt();

    window.addEventListener("bridge-install-ready", syncInstallPrompt);

    window.addEventListener("bridge-app-installed", handleInstalled);

    return () => {
      window.removeEventListener("bridge-install-ready", syncInstallPrompt);

      window.removeEventListener("bridge-app-installed", handleInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();

    const choiceResult = await installPrompt.userChoice;

    if (choiceResult.outcome === "accepted") {
      setIsAppInstalled(true);
    }

    setInstallPrompt(null);
  };

  const handleEnableNotifications = async () => {
    try {
      setNotificationLoading(true);

      const result = await enableBridgeNotifications();

      if (result.success) {
        setNotificationsEnabled(true);
        return;
      }

      if (result.permission === "denied") {
        alert(
          "Notifications are blocked in your browser. Please allow notifications for My Bridge in your browser settings.",
        );
        return;
      }

      console.error("Could not enable notifications:", result);
    } catch (error) {
      console.error("Enable notifications failed:", error);
    } finally {
      setNotificationLoading(false);
    }
  };

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

  
const loadInAppNotifications = useCallback(async () => {
  if (!user) return;

  try {
    const idToken = await user.getIdToken();

    setInAppNotificationsLoading(true);

    const response = await fetch(
      "https://bridgeaz-recommendations-server.vercel.app/api/notifications",
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      },
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error("Could not load notifications:", data);
      return;
    }

    setInAppNotifications(
      Array.isArray(data.notifications) ? data.notifications : [],
    );

    setUnreadNotificationCount(Number(data.unreadCount) || 0);
  } catch (error) {
    console.error("Load notifications failed:", error);
  } finally {
    setInAppNotificationsLoading(false);
  }
}, [user]);
  


  const handleDeleteNotification = async (notificationId) => {
    if (!user || !notificationId) return;

    try {
      const idToken = await user.getIdToken();

      const response = await fetch(
        `https://bridgeaz-recommendations-server.vercel.app/api/notifications/${notificationId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Could not delete notification:", data);
        return;
      }

      setInAppNotifications((current) =>
        current.filter((item) => item.id !== notificationId),
      );

      const deletedNotification = inAppNotifications.find(
        (item) => item.id === notificationId,
      );

      if (deletedNotification && !deletedNotification.read) {
        setUnreadNotificationCount((current) => Math.max(0, current - 1));
      }
    } catch (error) {
      console.error("Delete notification failed:", error);
    }
  };

  const handleClearAllNotifications = async () => {
    if (!user) return;

    try {
      const idToken = await user.getIdToken();

      const response = await fetch(
        "https://bridgeaz-recommendations-server.vercel.app/api/notifications",
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Could not clear notifications:", data);
        return;
      }

      setInAppNotifications([]);
      setUnreadNotificationCount(0);
    } catch (error) {
      console.error("Clear notifications failed:", error);
    }
  };

useEffect(() => {
  const unsubscribe = onMessage(messaging, async (payload) => {
    console.log("FOREGROUND PUSH:", payload);

    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification(
      payload.notification?.title || payload.data?.title || "My Bridge",
      {
        body:
          payload.notification?.body ||
          payload.data?.body ||
          "You have a new Bridge update.",

        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",

        data: {
          url: payload.data?.url || "/",
        },
      },
    );

    await loadInAppNotifications();
  });

  return unsubscribe;
}, [loadInAppNotifications]);

useEffect(() => {
  if (!user) return;

  const loadNotifications = async () => {
    await loadInAppNotifications();
  };

  loadNotifications();
}, [user, loadInAppNotifications]);
  
  const refreshBridgeMember = useCallback(async () => {
    if (!user) {
      return null;
    }

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

      if (response.ok && data.success && data.memberFound && data.member) {
        return data.member;
      }

      return null;
    } catch (error) {
      console.error("Backend auth test failed:", error);

      return null;
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    refreshBridgeMember().then((member) => {
      if (!cancelled) {
        setBridgeMember(member);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, refreshBridgeMember]);

  /*
    -------------------------------------------------------
    MEMBERSHIP / MY BRIDGE ACCESS

    A Members record means the user is a member.
    Registration is complete only when the member is
    Active + Completed.

    My Bridge stays locked until Make has created
    the member's My Bridge Token.
    -------------------------------------------------------
  */

  const isMember = Boolean(bridgeMember);

  const membershipComplete =
    bridgeMember?.status === "Active" &&
    bridgeMember?.conversationStatus === "Completed";

  const canAccessMyBridge =
    membershipComplete && Boolean(bridgeMember?.myBridgeToken);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!membershipComplete) {
      return;
    }

    if (bridgeMember?.myBridgeToken) {
      return;
    }

    let cancelled = false;

    const checkForToken = async () => {
      const member = await refreshBridgeMember();

      if (!cancelled && member) {
        setBridgeMember(member);
      }
    };

    const intervalId = window.setInterval(() => {
      checkForToken();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    user,
    membershipComplete,
    bridgeMember?.myBridgeToken,
    refreshBridgeMember,
  ]);

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

      {(accountOpen || notificationOpen) && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => {
            setAccountOpen(false);
            setNotificationOpen(false);
          }}
          className="fixed inset-0 z-40 cursor-default bg-transparent"
        />
      )}

      <header className="relative z-50 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <div className="flex h-18 items-center">
              <img
                src={BRIDGE_LOGO}
                alt="BridgeAZ"
                className="h-12 w-auto object-contain"
              />
            </div>

            <nav className="hidden h-full  items-center gap-8 lg:flex">
              <NavItem
                icon={Home}
                label="Home"
                active
                onClick={() => {
                  window.location.href = "/";
                }}
              />
            </nav>
          </div>

          {/* =====================================================
              ACTUAL AIRTABLE MEMBER
          ===================================================== */}

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationOpen((prev) => !prev);
                  setAccountOpen(false);
                }}
                className="relative flex h-11 w-11 items-center justify-center rounded-full text-[#071A4A] transition hover:bg-slate-100"
                aria-label="Notifications"
              >
                <Bell size={21} strokeWidth={2.3} />

                {unreadNotificationCount > 0 && (
                  <span className="absolute right-0 top-0 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                    {unreadNotificationCount > 99
                      ? "99+"
                      : unreadNotificationCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="fixed left-3 right-3 top-[90px] z-[110] max-h-[75dvh] overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(7,26,74,0.18)] sm:absolute sm:left-auto sm:right-0 sm:top-[52px] sm:w-[360px] sm:max-h-none">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-black text-[#071A4A]">
                          Notifications
                        </p>

                        {unreadNotificationCount > 0 && (
                          <p className="mt-0.5 text-[10px] font-bold text-[#2563EB]">
                            {unreadNotificationCount} new
                          </p>
                        )}
                      </div>

                      {inAppNotifications.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllNotifications}
                          className="rounded-lg px-2.5 py-1.5 text-[11px] font-black text-red-500 transition hover:bg-red-50"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto">
                    {inAppNotificationsLoading ? (
                      <div className="px-5 py-8 text-center text-sm font-semibold text-slate-400">
                        Loading notifications...
                      </div>
                    ) : inAppNotifications.length === 0 ? (
                      <div className="px-5 py-8 text-center text-sm font-semibold text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      inAppNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`flex w-full gap-3 border-b border-slate-100 px-5 py-4 ${
                            !notification.read ? "bg-blue-50/50" : "bg-white"
                          }`}
                        >
                          <div
                            className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                              !notification.read
                                ? "bg-[#2563EB]"
                                : "bg-slate-200"
                            }`}
                          />

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-[#071A4A]">
                              {notification.title || "My Bridge"}
                            </p>

                            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                              {notification.body}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteNotification(notification.id)
                            }
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg font-bold text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                            aria-label="Delete notification"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Account Menu */}
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
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br from-[#071A4A] to-[#2563EB] text-sm font-black uppercase text-white">
                    {displayName.charAt(0)}
                  </div>
                )}

                <div className="hidden text-left sm:block">
                  <p className="text-[11px] font-medium text-slate-400">
                    Welcome
                  </p>

                  <div className="flex items-center gap-1">
                    <p className="max-w-37.5 truncate text-sm font-black text-[#071A4A]">
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
              numberColor={
                membershipComplete ? "text-emerald-600" : "text-[#0A4BA8]"
              }
              background={
                membershipComplete
                  ? "from-[#F2FCF7] via-white to-[#ECFDF5]"
                  : "from-[#F5FAFF] via-white to-[#EDF6FF]"
              }
              illustration={<MemberIllustration />}
              title={
                membershipComplete
                  ? "You're a Bridge Member"
                  : "Become a Member"
              }
              description={
                membershipComplete
                  ? "Your Bridge membership is active and your registration is complete."
                  : isMember
                    ? "Your Bridge membership has started. Finish registration to complete your setup."
                    : "Tell Bridge who you are and what matters to you. Complete your membership to unlock My Bridge."
              }
              bullets={
                membershipComplete
                  ? [
                      "Bridge membership active",
                      "Registration complete",
                      "Your interests are saved",
                      "Personalization is enabled",
                    ]
                  : [
                      "Complete your Bridge setup",
                      "Tell us your interests",
                      "Help Bridge personalize your experience",
                      "Unlock your full My Bridge",
                    ]
              }
              buttonText={
                membershipComplete
                  ? "Membership Complete"
                  : isMember
                    ? "Continue Registration"
                    : "Become a Member"
              }
              buttonClass={
                membershipComplete
                  ? "bg-emerald-600 text-white"
                  : "bg-gradient-to-r from-[#061B55] to-[#073A91] text-white"
              }
              completed={membershipComplete}
              disabled={membershipComplete}
              howToVideos={[HOW_TO_VIDEOS[0]]}
              onVideoClick={setSelectedVideo}
              onClick={() => {
                if (!membershipComplete) {
                  window.location.href = "/member-registration";
                }
              }}
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
                <div className="mt-5 space-y-4 pb-6">
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
              howToVideos={[HOW_TO_VIDEOS[1]]}
              onVideoClick={setSelectedVideo}
              onClick={() => {
                window.location.href = "/share-with-bridge";
              }}
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
                ) : membershipComplete ? (
                  <PreparingBridgeIllustration />
                ) : (
                  <LockedIllustration />
                )
              }
              title="My Bridge"
              description={
                canAccessMyBridge
                  ? "Open your personalized Bridge experience."
                  : membershipComplete
                    ? "Bridge is working in the background to build your personalized My Bridge. This can take a couple of minutes, and this page will unlock automatically when it is ready."
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
              lockedLabel={membershipComplete ? "Preparing" : "Members Only"}
              buttonText={
                canAccessMyBridge
                  ? "Open My Bridge"
                  : membershipComplete
                    ? "Preparing My Bridge..."
                    : "Become a Member to Unlock"
              }
              buttonClass="bg-gradient-to-r from-[#071A4A] to-[#2563EB] text-white"
              howToVideos={[HOW_TO_VIDEOS[2], HOW_TO_VIDEOS[3]]}
              onVideoClick={setSelectedVideo}
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

      {selectedVideo && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-[#071A4A]/75 p-2 backdrop-blur-sm sm:p-4 md:p-6"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="relative my-auto w-full max-w-[1100px] px-1 pb-6 sm:px-3 sm:pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Screen glow */}
            <div className="absolute inset-x-[8%] top-[12%] h-[75%] rounded-full bg-blue-500/20 blur-[80px]" />

            {/* Animated remote */}
            <motion.div
              initial={{
                opacity: 0,
                x: 45,
                y: 20,
                rotate: 12,
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                x: [70, 0, 0, 50],
                y: [30, 0, 0, 25],
                rotate: [18, -12, -12, 12],
              }}
              transition={{
                duration: 1.35,
                times: [0, 0.28, 0.68, 1],
                ease: "easeInOut",
              }}
              className="absolute -bottom-16 right-8 z-30 hidden sm:block"
            >
              <div className="relative h-[138px] w-[52px] rounded-[18px] border border-white/10 bg-gradient-to-br from-[#303743] via-[#151A22] to-[#05070A] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.55)]">
                {/* Remote shine */}
                <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-gradient-to-br from-white/10 via-transparent to-transparent" />

                {/* Power button */}
                <motion.div
                  initial={{ scale: 1 }}
                  animate={{
                    scale: [1, 0.72, 1],
                  }}
                  transition={{
                    delay: 0.45,
                    duration: 0.3,
                    ease: "easeInOut",
                  }}
                  className="relative mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-red-400/30 bg-red-500/15 text-red-400 shadow-[0_0_12px_rgba(248,113,113,0.16)]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 2v10"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.3 5.7a8 8 0 1 0 11.4 0"
                    />
                  </svg>
                </motion.div>

                {/* Remote buttons */}
                <div className="mt-4 grid grid-cols-2 gap-2 px-1">
                  <div className="h-3 rounded-full bg-white/10" />
                  <div className="h-3 rounded-full bg-white/10" />
                  <div className="h-3 rounded-full bg-white/10" />
                  <div className="h-3 rounded-full bg-white/10" />
                </div>

                <div className="mx-auto mt-4 h-8 w-8 rounded-full border border-white/10 bg-white/[0.06]">
                  <div className="mx-auto mt-[11px] h-2 w-2 rounded-full bg-white/20" />
                </div>
              </div>
            </motion.div>

            {/* TV body — power-on animation */}
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.94,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                delay: 0.62,
                duration: 0.55,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative origin-center rounded-[18px] bg-gradient-to-br from-slate-700 via-[#151A23] to-black p-[4px] shadow-[0_25px_70px_rgba(0,0,0,0.55)] sm:rounded-[24px] sm:p-[6px] md:rounded-[30px] md:p-[7px] md:shadow-[0_45px_120px_rgba(0,0,0,0.65)]"
            >
              {/* Metallic edge */}
              <div className="overflow-hidden rounded-[14px] border border-white/10 bg-[#080B10] p-[4px] sm:rounded-[20px] sm:p-[6px] md:rounded-[24px] md:p-[8px]">
                {/* Top TV bar */}
                <div className="flex items-center justify-between px-3 pb-3 pt-1">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">
                      Bridge How-To
                    </p>

                    <h3 className="mt-0.5 text-sm font-bold text-white">
                      {selectedVideo.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedVideo(null)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
                    aria-label="Close video"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 6l12 12M18 6 6 18"
                      />
                    </svg>
                  </button>
                </div>

                {/* TV screen */}
                <div className="relative overflow-hidden rounded-[16px] bg-black shadow-inner">
                  <div className="aspect-video w-full">
                    <iframe
                      src={getDrivePreviewUrl(selectedVideo.url)}
                      title={selectedVideo.title}
                      className="h-full w-full"
                      allow="autoplay"
                      allowFullScreen
                    />
                  </div>

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent" />
                </div>

                {/* TV bottom bezel */}
                <div className="relative flex h-12 items-center justify-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.05, duration: 0.25 }}
                    className="flex items-center justify-center rounded-full px-4 py-1.5  shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
                  >
                    <img
                      src={BRIDGE_LOGO}
                      alt="BridgeAZ"
                      className="h-6 w-auto object-contain"
                    />
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* TV stand */}
            <div className="absolute bottom-[13px] left-1/2 h-5 w-28 -translate-x-1/2 rounded-b-xl bg-gradient-to-b from-slate-700 to-slate-950" />

            <div className="absolute bottom-2 left-1/2 h-2.5 w-48 -translate-x-1/2 rounded-full bg-gradient-to-b from-slate-700 to-slate-950 shadow-[0_8px_18px_rgba(0,0,0,0.45)]" />
          </div>
        </div>
      )}

      {installPrompt && !isAppInstalled && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="
  fixed
  bottom-4
  left-4
  right-4
  z-[150]
  mx-auto
  max-w-[520px]
  rounded-[22px]
  border
  border-[#2563EB]/30
  bg-gradient-to-r
  from-[#0A4BA8]
  to-[#2563EB]
  p-4
  shadow-[0_20px_60px_rgba(37,99,235,0.35)]
  backdrop-blur-xl
  sm:left-auto
  sm:right-6
  sm:mx-0
  sm:w-[430px]
"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#071A4A]">
              <img
                src="/pwa-192x192.png"
                alt="My Bridge"
                className="h-9 w-9 rounded-[10px] object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-black text-white">
                Install My Bridge
              </p>

              <p className="mt-0.5 text-[12px] font-medium leading-5 text-white/85">
                Add Bridge to your phone or desktop for quick access.
              </p>
            </div>

            <button
              type="button"
              onClick={handleInstallApp}
              className="
  shrink-0
  rounded-xl
  bg-white
  px-4
  py-2.5
  text-[12px]
  font-black
  text-[#0A4BA8]
  shadow-md
  transition
  hover:bg-slate-100
"
            >
              Install
            </button>
          </div>
        </motion.div>
      )}

      {user &&
        !installPrompt &&
        !notificationsEnabled &&
        Notification.permission !== "denied" && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="
        fixed
        bottom-4
        left-4
        right-4
        z-[150]
        mx-auto
        max-w-[520px]
        rounded-[22px]
        border
        border-[#2563EB]/30
        bg-gradient-to-r
        from-[#071A4A]
        to-[#0A4BA8]
        p-4
        shadow-[0_20px_60px_rgba(7,26,74,0.30)]
        sm:left-auto
        sm:right-6
        sm:mx-0
        sm:w-[450px]
      "
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-white/15 text-2xl">
                🔔
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-black text-white">
                  Stay connected with My Bridge
                </p>

                <p className="mt-0.5 text-[12px] font-medium leading-5 text-white/80">
                  Get alerts for recommendations, connections, and important
                  Bridge updates.
                </p>
              </div>

              <button
                type="button"
                onClick={handleEnableNotifications}
                disabled={notificationLoading}
                className="
            shrink-0
            rounded-xl
            bg-white
            px-4
            py-2.5
            text-[12px]
            font-black
            text-[#0A4BA8]
            shadow-md
            transition
            hover:bg-slate-100
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
              >
                {notificationLoading ? "Enabling..." : "Turn On"}
              </button>
            </div>
          </motion.div>
        )}
    </main>
  );
}

/* =====================================================
   NAV
===================================================== */

function NavItem({
  icon: Icon,
  label,
  active = false,
  locked = false,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      className={`relative flex h-[78px] items-center gap-2 text-sm font-bold transition ${
        locked
          ? "cursor-not-allowed text-slate-300"
          : active
            ? "cursor-pointer text-[#071A4A]"
            : "cursor-pointer text-slate-500 hover:text-[#071A4A]"
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
  disabled = false,
  lockedLabel = "Members Only",
  customContent = null,
  howToVideos = [],
  onVideoClick,
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
            {lockedLabel}
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
        disabled={locked || disabled}
        className={`mt-auto flex w-full items-center justify-between rounded-2xl px-5 py-4 text-sm font-black shadow-sm transition ${
          locked || disabled
            ? completed
              ? "cursor-not-allowed bg-emerald-600 text-white opacity-90"
              : "cursor-not-allowed bg-slate-200/80 text-slate-500"
            : `${buttonClass} cursor-pointer hover:-translate-y-0.5 hover:shadow-xl`
        }`}
      >
        <span className="flex items-center gap-2">
          {locked && <LockKeyhole size={15} />}
          {completed && disabled && <Check size={15} strokeWidth={3} />}

          {buttonText}
        </span>

        {!locked && !disabled && <ArrowRight size={18} />}
      </button>

      {howToVideos.length > 0 && (
        <div className="mt-4 hidden border-t border-slate-200/70 pt-4 sm:block">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Learn More: Watch These How-To&apos;s
          </p>

          <div className="space-y-2">
            {howToVideos.map((video) => (
              <button
                key={video.title}
                type="button"
                onClick={() => {
                  if (video.url && onVideoClick) {
                    onVideoClick(video);
                  }
                }}
                disabled={!video.url}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  video.url
                    ? "bg-white/80 hover:bg-white hover:shadow-sm"
                    : "cursor-default bg-slate-50/70"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    video.url
                      ? "bg-[#071A4A] text-white"
                      : "bg-slate-200 text-slate-400"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="ml-0.5 h-3.5 w-3.5 fill-current"
                    aria-hidden="true"
                  >
                    <path d="M8 5.5v13l10-6.5-10-6.5Z" />
                  </svg>
                </div>

                <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-[#071A4A]">
                  {video.title}
                </span>

                {video.url && (
                  <ArrowRight
                    size={14}
                    className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#2563EB]"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.article>
  );
}

/* =====================================================
   SHARE SUBMENU ITEM
===================================================== */

function SubmissionOption({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[#7C3AED]">
        <Icon size={15} strokeWidth={2.4} />
      </div>

      <div className="min-w-0">
        <p className="text-sm font-bold leading-5 text-[#071A4A]">{title}</p>

        <p className="mt-0.5 text-[11px] font-medium leading-4 text-slate-400">
          {subtitle}
        </p>
      </div>
    </div>
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

function PreparingBridgeIllustration() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="absolute h-[150px] w-[240px] rounded-full bg-blue-300/25 blur-[30px]" />

      <div className="relative flex h-[130px] w-[190px] flex-col items-center justify-center rounded-[28px] border border-blue-100 bg-white/90 shadow-[0_25px_55px_rgba(37,99,235,0.18)] backdrop-blur">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "linear",
          }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#2563EB]"
        >
          <LoaderCircle size={32} strokeWidth={2.4} />
        </motion.div>

        <p className="mt-3 text-sm font-black text-[#071A4A]">
          Building My Bridge
        </p>

        <p className="mt-1 text-[11px] font-semibold text-slate-400">
          Working in the background...
        </p>
      </div>
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
