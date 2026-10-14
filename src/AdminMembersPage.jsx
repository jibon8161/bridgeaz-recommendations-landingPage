import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

const API_URL = "https://bridgeaz-recommendations-server.vercel.app";

const MEMBERS_PER_PAGE = 25;

function normalizeAccess(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function memberIsBlocked(member) {
  return normalizeAccess(member?.webpageAccess) === "blocked";
}

export default function AdminMembersPage() {
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [updatingAccessId, setUpdatingAccessId] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      try {
        setLoading(true);
        setError("");

        const idToken = await firebaseUser.getIdToken();

const response = await fetch(`${API_URL}/api/admin/members`, {
  method: "GET",

  headers: {
    Authorization: `Bearer ${idToken}`,
    "Cache-Control": "no-cache",
  },

  cache: "no-store",
});

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Could not load members");
        }

        const loadedMembers = Array.isArray(data.members)
          ? data.members.map((member) => ({
              ...member,

              webpageAccess: member.webpageAccess || "Active",
            }))
          : [];

        loadedMembers.sort((a, b) => {
          const aHasToken = Boolean(a.myBridgeToken);

          const bHasToken = Boolean(b.myBridgeToken);

          if (aHasToken !== bHasToken) {
            return Number(bHasToken) - Number(aHasToken);
          }

          return String(a.fullName || "").localeCompare(
            String(b.fullName || ""),
          );
        });

        setMembers(loadedMembers);
      } catch (err) {
        console.error("Admin members error:", err);

        setError(err.message || "Could not load members");
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [navigate]);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const handleAccessToggle = async (member) => {
    const isBlocked = memberIsBlocked(member);

    const nextAccess = isBlocked ? "Active" : "Blocked";

    const memberName = member.fullName || "this member";

    const confirmed = window.confirm(
      isBlocked ? `Unblock ${memberName}?` : `Block ${memberName} from Bridge?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingAccessId(member.memberRecordId);

      const firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      const idToken = await firebaseUser.getIdToken();

      const response = await fetch(
        `${API_URL}/api/admin/members/${encodeURIComponent(
          member.memberRecordId,
        )}/access`,
        {
          method: "PATCH",

          headers: {
            Authorization: `Bearer ${idToken}`,

            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            access: nextAccess,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Could not update member access");
      }

      setMembers((currentMembers) =>
        currentMembers.map((item) =>
          item.memberRecordId === member.memberRecordId
            ? {
                ...item,

                webpageAccess: data.webpageAccess || nextAccess,
              }
            : item,
        ),
      );
    } catch (err) {
      console.error("Member access update error:", err);

      alert(err.message || "Could not update member access");
    } finally {
      setUpdatingAccessId("");
    }
  };

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return members;
    }

    return members.filter((member) => {
      return [
        member.fullName,
        member.status,
        member.conversationStatus,
        member.webpageAccess,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [members, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE),
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * MEMBERS_PER_PAGE;

    return filteredMembers.slice(startIndex, startIndex + MEMBERS_PER_PAGE);
  }, [filteredMembers, currentPage]);

  const totalMembers = members.length;

  const membersWithBridge = members.filter((member) =>
    Boolean(member.myBridgeToken),
  ).length;

  const membersWithoutBridge = totalMembers - membersWithBridge;

  const blockedMembers = members.filter((member) =>
    memberIsBlocked(member),
  ).length;

  const firstResult =
    filteredMembers.length === 0 ? 0 : (currentPage - 1) * MEMBERS_PER_PAGE + 1;

  const lastResult = Math.min(
    currentPage * MEMBERS_PER_PAGE,
    filteredMembers.length,
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-6">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />

          <p className="mt-5 font-bold text-[#071A4A]">
            Loading Bridge members...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-6">
        <div className="w-full max-w-lg rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl font-black text-red-600">
            !
          </div>

          <h1 className="mt-5 text-2xl font-black text-[#071A4A]">
            Admin Access
          </h1>

          <p className="mt-3 text-sm font-medium text-red-600">{error}</p>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-7 cursor-pointer rounded-2xl bg-[#071A4A] px-6 py-3 font-black text-white transition hover:bg-[#2563EB]"
          >
            Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F7FB]">
      {/* HEADER */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="mb-4 flex cursor-pointer items-center gap-2 text-sm font-black text-[#2563EB] transition hover:gap-3"
              >
                ← Back to Bridge
              </button>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-black tracking-tight text-[#071A4A] sm:text-4xl">
                    Bridge Members
                  </h1>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-[#2563EB]">
                    Admin
                  </span>
                </div>

                <p className="mt-2 text-sm font-medium text-slate-500">
                  View My Bridge pages and manage member access.
                </p>
              </div>
            </div>

            <div className="w-full lg:max-w-sm">
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search members..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-semibold text-[#071A4A] outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {/* STATS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Members" value={totalMembers} />

          <StatCard label="My Bridge Ready" value={membersWithBridge} />

          <StatCard label="Missing Token" value={membersWithoutBridge} />

          <StatCard label="Blocked" value={blockedMembers} />
        </div>

        {/* DIRECTORY HEADER */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-[#071A4A]">
              Member Directory
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Members with a My Bridge token appear first.
            </p>
          </div>

          <div className="text-sm font-bold text-slate-500">
            {filteredMembers.length > 0 ? (
              <>
                Showing{" "}
                <span className="text-[#071A4A]">
                  {firstResult}-{lastResult}
                </span>{" "}
                of{" "}
                <span className="text-[#071A4A]">{filteredMembers.length}</span>
              </>
            ) : (
              <>0 members</>
            )}
          </div>
        </div>

        {/* MEMBER LIST */}
        <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          {filteredMembers.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-400">
                ⌕
              </div>

              <h3 className="mt-4 font-black text-[#071A4A]">
                No members found
              </h3>

              <p className="mt-2 text-sm text-slate-500">Try another search.</p>
            </div>
          ) : (
            paginatedMembers.map((member, index) => {
              const hasToken = Boolean(member.myBridgeToken);

              const isBlocked = memberIsBlocked(member);

              const isUpdating = updatingAccessId === member.memberRecordId;

              return (
                <div
                  key={member.memberRecordId}
                  className={`flex flex-col gap-5 px-5 py-5 transition hover:bg-[#F8FAFF] sm:px-7 lg:flex-row lg:items-center lg:justify-between ${
                    index !== paginatedMembers.length - 1
                      ? "border-b border-slate-100"
                      : ""
                  }`}
                >
                  {/* MEMBER INFO */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-[#071A4A]">
                        {member.fullName || "Unnamed Member"}
                      </h3>

                      {hasToken && (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                          Bridge Ready
                        </span>
                      )}

                      {isBlocked ? (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-700">
                          Blocked
                        </span>
                      ) : (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
                          Web Access Active
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-sm text-slate-500">
                      {member.status || "No Status"}

                      {" • "}

                      {member.conversationStatus || "No Conversation Status"}
                    </div>

                    <p className="mt-2 break-all text-xs font-medium text-slate-400">
                      {hasToken
                        ? `Token: ${member.myBridgeToken}`
                        : "No My Bridge token assigned"}
                    </p>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleAccessToggle(member)}
                      className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                        isBlocked
                          ? "cursor-pointer bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "cursor-pointer bg-red-50 text-red-700 hover:bg-red-100"
                      } ${isUpdating ? "cursor-wait opacity-50" : ""}`}
                    >
                      {isUpdating
                        ? "Updating..."
                        : isBlocked
                          ? "Unblock"
                          : "Block"}
                    </button>

                    {hasToken ? (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/recommendations/${member.myBridgeToken}`)
                        }
                        className="cursor-pointer rounded-2xl bg-[#071A4A] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#2563EB] hover:shadow-lg"
                      >
                        View My Bridge →
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-400"
                      >
                        No Bridge Token
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* PAGINATION */}
        {filteredMembers.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row">
            <div className="text-sm font-bold text-slate-500">
              Page <span className="text-[#071A4A]">{currentPage}</span> of{" "}
              <span className="text-[#071A4A]">{totalPages}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
                  currentPage === 1
                    ? "cursor-not-allowed bg-slate-100 text-slate-400"
                    : "cursor-pointer border border-slate-200 bg-white text-[#071A4A] hover:bg-slate-50"
                }`}
              >
                ← Previous
              </button>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
                  currentPage === totalPages
                    ? "cursor-not-allowed bg-slate-100 text-slate-400"
                    : "cursor-pointer bg-[#071A4A] text-white hover:bg-[#2563EB]"
                }`}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black text-[#071A4A]">{value}</p>
    </div>
  );
}
