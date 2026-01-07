import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useToast } from "../hooks/useToast";
import { useLocale } from "../hooks/useLocale";
import {
  deleteGuestCode,
  fetchInvitationQr,
  getInvitationManage,
  getInvitationRsvpManage,
  generateGuestCodes,
  rotateOwnerLink,
  updateInvitationOwner,
  checkInGuest,
} from "../api/client";
import type {
  GeneratedGuestCode,
  Invitation,
  InvitationManageResponse,
  InvitationRsvpMode,
  InvitationStatus,
  LoveStoryItem,
} from "../types";

const statusOptions: Array<{ value: InvitationStatus; label: string; description: string }> = [
  {
    value: "draft",
    label: "Draft",
    description: "Hidden while you continue designing.",
  },
  {
    value: "published",
    label: "Published",
    description: "Visible to guests and ready to share.",
  },
  {
    value: "closed",
    label: "Closed",
    description: "Public page shows a closing message.",
  },
];

const rsvpModeOptions: Array<{
  value: InvitationRsvpMode;
  title: string;
  description: string;
}> = [
  {
    value: "open",
    title: "Open",
    description: "Anyone with the invitation link can submit an RSVP.",
  },
  {
    value: "passcode",
    title: "Passcode",
    description: "Share a secret phrase that guests must enter to respond.",
  },
  {
    value: "guest_codes",
    title: "Guest codes",
    description: "Generate unique codes so only invited guests can reply.",
  },
];

interface DesignState {
  headline: string;
  brideName: string;
  groomName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  eventAddress: string;
  eventMap: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundImageUrl: string;
}

const defaultDesignState = (): DesignState => ({
  headline: "",
  brideName: "",
  groomName: "",
  eventTitle: "",
  eventDate: new Date().toISOString().split("T")[0],
  eventTime: "",
  eventVenue: "",
  eventAddress: "",
  eventMap: "",
  primaryColor: "#a855f7",
  secondaryColor: "#f472b6",
  backgroundImageUrl: "",
});

type DashboardTab = "design" | "rsvp" | "live" | "analytics" | "export";

const OwnerDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useLocale();

  const initialToken = searchParams.get("k") ?? "";
  const [ownerToken, setOwnerToken] = useState(initialToken);
  const [activeTab, setActiveTab] = useState<DashboardTab>("design");
  const [designState, setDesignState] = useState<DesignState>(defaultDesignState);
  const [designFeedback, setDesignFeedback] = useState<{
    text: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingDesign, setSavingDesign] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [rotatingLink, setRotatingLink] = useState(false);
  const [qrDownloading, setQrDownloading] = useState(false);
  const [rsvpMode, setRsvpMode] = useState<InvitationRsvpMode>("open");
  const [capacityInput, setCapacityInput] = useState("");
  const [passcodeInput, setPasscodeInput] = useState("");
  const [savingRsvp, setSavingRsvp] = useState(false);
  const [recentCodes, setRecentCodes] = useState<GeneratedGuestCode[]>([]);
  const [codeQuantity, setCodeQuantity] = useState<number>(6);
  const [codePrefix, setCodePrefix] = useState("");
  const [codeIssuedTo, setCodeIssuedTo] = useState("");
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [deletingCodeId, setDeletingCodeId] = useState<string | null>(null);

  // Live Tab State
  const [checkInToken, setCheckInToken] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInFeedback, setCheckInFeedback] = useState<{
    text: string;
    tone: "success" | "error";
  } | null>(null);
  const [isUpdatingLiveEvent, setIsUpdatingLiveEvent] = useState(false);

  useEffect(() => {
    if (!initialToken) return;
    setOwnerToken((previous) => (previous === initialToken ? previous : initialToken));
  }, [initialToken]);

  const invitationQuery = useQuery({
    queryKey: ["owner-invitation", id, ownerToken],
    queryFn: async () => {
      if (!id) {
        throw new Error("Invitation id is missing.");
      }
      if (!ownerToken) {
        throw new Error("Owner key is missing.");
      }
      return getInvitationManage(id, ownerToken);
    },
    enabled: Boolean(id && ownerToken),
    retry: false,
  });

  const invitation = invitationQuery.data?.invitation;

  const rsvpQueryKey = useMemo(
    () => ["owner-invitation-rsvp", id, ownerToken] as const,
    [id, ownerToken],
  );

  const rsvpManageQuery = useQuery({
    queryKey: rsvpQueryKey,
    queryFn: async () => {
      if (!id) {
        throw new Error("Invitation id is missing.");
      }
      if (!ownerToken) {
        throw new Error("Owner key is missing.");
      }
      return getInvitationRsvpManage(id, ownerToken);
    },
    enabled: Boolean(id && ownerToken && activeTab === "rsvp"),
    retry: false,
  });

  useEffect(() => {
    if (!invitation) return;
    setDesignState({
      headline: invitation.headline,
      brideName: invitation.couple.brideName,
      groomName: invitation.couple.groomName,
      eventTitle: invitation.event.title,
      eventDate: invitation.event.date,
      eventTime: invitation.event.time ?? "",
      eventVenue: invitation.event.venue,
      eventAddress: invitation.event.address ?? "",
      eventMap: invitation.event.mapLink ?? "",
      primaryColor: invitation.theme?.primaryColor ?? "#a855f7",
      secondaryColor: invitation.theme?.secondaryColor ?? "#f472b6",
      backgroundImageUrl: invitation.theme?.backgroundImageUrl ?? "",
    });
  }, [invitation]);

  useEffect(() => {
    if (!invitation) return;
    setRsvpMode(invitation.rsvpMode ?? "open");
    setCapacityInput(invitation.capacity != null ? String(invitation.capacity) : "");
    setPasscodeInput("");
  }, [invitation]);

  useEffect(() => {
    if (invitationQuery.error instanceof Error) {
      setErrorMessage(invitationQuery.error.message);
    } else {
      setErrorMessage(null);
    }
  }, [invitationQuery.error]);

  const currentStatus: InvitationStatus | undefined = useMemo(() => {
    if (!invitation) return undefined;
    return invitation.status ?? (invitation.isPublished ? "published" : "draft");
  }, [invitation]);

  const shareUrl = useMemo(() => {
    if (!invitation) return "";
    const base = window.location.origin;
    return `${base}/#/i/${invitation.slug}`;
  }, [invitation]);

  const ownerLink = useMemo(() => {
    if (!invitation || !ownerToken) return "";
    const base = window.location.origin;
    return `${base}/#/edit/${invitation.id}?k=${ownerToken}`;
  }, [invitation, ownerToken]);

  const shareLinks = useMemo(() => {
    if (!invitation || !shareUrl) return [];
    const encodedUrl = encodeURIComponent(shareUrl);
    const headline = encodeURIComponent(invitation.headline);
    return [
      {
        label: "WhatsApp",
        href: `https://wa.me/?text=${headline}%20${encodedUrl}`,
      },
      {
        label: "Telegram",
        href: `https://t.me/share/url?url=${encodedUrl}&text=${headline}`,
      },
      {
        label: "Email",
        href: `mailto:?subject=${headline}&body=${encodedUrl}`,
      },
    ];
  }, [invitation, shareUrl]);

  const handlePreviewPublic = useCallback(() => {
    if (!invitation) {
      return;
    }
    const statusLabel = currentStatus ?? "draft";
    if (statusLabel !== "published") {
      setDesignFeedback({
        text: "Publish the invitation before previewing the public page.",
        tone: "error",
      });
      return;
    }
    if (!shareUrl) {
      setDesignFeedback({ text: "Public link is unavailable right now.", tone: "error" });
      return;
    }
    setDesignFeedback(null);
    if (typeof window !== "undefined") {
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    }
  }, [currentStatus, invitation, shareUrl]);

  const applyOwnerToken = (token: string, latestInvitation: Invitation) => {
    setOwnerToken(token);
    setSearchParams({ k: token }, { replace: true });
    const guestbook = invitationQuery.data?.guestbook ?? [];
    queryClient.setQueryData<InvitationManageResponse | undefined>(
      ["owner-invitation", id, token],
      () => ({
        invitation: latestInvitation,
        guestbook,
      }),
    );
  };

  const updateInvitationCache = useCallback(
    (updated: Invitation) => {
      queryClient.setQueryData<InvitationManageResponse | undefined>(
        ["owner-invitation", id, ownerToken],
        (previous) => (previous ? { ...previous, invitation: updated } : previous),
      );
    },
    [id, ownerToken, queryClient],
  );

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("linkCopied"));
      setFeedback(`${label} copied to clipboard.`);
    } catch (copyError) {
      const message = copyError instanceof Error ? copyError.message : "Copy failed.";
      toast.error(message);
      setFeedback(message);
    }
  };

  const handleDesignSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !ownerToken) return;
    setSavingDesign(true);
    setDesignFeedback(null);
    try {
      const payload = {
        headline: designState.headline.trim(),
        couple: {
          brideName: designState.brideName.trim(),
          groomName: designState.groomName.trim(),
        },
        event: {
          title: designState.eventTitle.trim(),
          date: designState.eventDate,
          time: designState.eventTime.trim() || undefined,
          venue: designState.eventVenue.trim(),
          address: designState.eventAddress.trim() || undefined,
          mapLink: designState.eventMap.trim() || undefined,
        },
        theme: {
          primaryColor: designState.primaryColor.trim() || undefined,
          secondaryColor: designState.secondaryColor.trim() || undefined,
          backgroundImageUrl:
            designState.backgroundImageUrl.trim()
              ? designState.backgroundImageUrl.trim()
              : null,
        },
      };
      const updated = await updateInvitationOwner(id, payload, ownerToken);
      updateInvitationCache(updated);
      setDesignFeedback({ text: "Design settings saved.", tone: "success" });
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "Failed to save changes.";
      setDesignFeedback({ text: message, tone: "error" });
    } finally {
      setSavingDesign(false);
    }
  };

  const handleStatusChange = async (nextStatus: InvitationStatus) => {
    if (!id || !ownerToken || nextStatus === currentStatus) return;
    setSavingStatus(true);
    setFeedback(null);
    try {
      const updated = await updateInvitationOwner(id, { status: nextStatus }, ownerToken);
      updateInvitationCache(updated);
      setFeedback(`Status updated to ${nextStatus}.`);
    } catch (statusError) {
      const message = statusError instanceof Error ? statusError.message : "Failed to update status.";
      setFeedback(message);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleRotateLink = async () => {
    if (!id || !ownerToken) return;
    setRotatingLink(true);
    setFeedback(null);
    try {
      const response = await rotateOwnerLink(id, ownerToken);
      applyOwnerToken(response.ownerToken, response.invitation);
      setFeedback("New owner link generated.");
    } catch (rotateError) {
      const message = rotateError instanceof Error ? rotateError.message : "Unable to rotate link.";
      setFeedback(message);
    } finally {
      setRotatingLink(false);
    }
  };

  const handleDownloadQr = async () => {
    if (!id || !ownerToken || !invitation) return;
    setQrDownloading(true);
    setFeedback(null);
    try {
      const blob = await fetchInvitationQr(id, ownerToken);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${invitation.slug}-qr.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setFeedback("QR code downloaded.");
    } catch (qrError) {
      const message = qrError instanceof Error ? qrError.message : "Unable to download QR code.";
      setFeedback(message);
    } finally {
      setQrDownloading(false);
    }
  };

  useEffect(() => {
    if (rsvpManageQuery.data?.invitation) {
      updateInvitationCache(rsvpManageQuery.data.invitation);
    }
  }, [rsvpManageQuery.data?.invitation, updateInvitationCache]);

  const refreshRsvpData = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: rsvpQueryKey });
  }, [queryClient, rsvpQueryKey]);

  const handleRsvpSettingsSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !ownerToken) return;

    const trimmedCapacity = capacityInput.trim();
    let capacityValue: number | null = null;
    if (trimmedCapacity) {
      const parsed = Number.parseInt(trimmedCapacity, 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        setFeedback("Capacity must be a number greater than zero.");
        return;
      }
      capacityValue = parsed;
    }

    setSavingRsvp(true);
    setFeedback(null);
    try {
      const payload: {
        rsvpMode: InvitationRsvpMode;
        capacity: number | null;
        rsvpPasscode?: string | null;
      } = {
        rsvpMode,
        capacity: capacityValue,
      };

      if (rsvpMode === "passcode") {
        const trimmedPasscode = passcodeInput.trim();
        if (trimmedPasscode) {
          payload.rsvpPasscode = trimmedPasscode;
        }
      } else {
        payload.rsvpPasscode = "";
      }

      const updated = await updateInvitationOwner(id, payload, ownerToken);
      updateInvitationCache(updated);
      setFeedback("RSVP settings saved.");
      if (rsvpMode === "passcode" && passcodeInput.trim()) {
        setPasscodeInput("");
      }
  await refreshRsvpData();
    } catch (settingsError) {
      const message =
        settingsError instanceof Error ? settingsError.message : "Unable to update RSVP settings.";
      setFeedback(message);
    } finally {
      setSavingRsvp(false);
    }
  };

  const handleClearPasscode = async () => {
    if (!id || !ownerToken) return;
    setSavingRsvp(true);
    setFeedback(null);
    try {
      const updated = await updateInvitationOwner(id, { rsvpPasscode: "" }, ownerToken);
      updateInvitationCache(updated);
      setFeedback("Passcode removed.");
      setPasscodeInput("");
  await refreshRsvpData();
    } catch (clearError) {
      const message =
        clearError instanceof Error ? clearError.message : "Unable to remove passcode.";
      setFeedback(message);
    } finally {
      setSavingRsvp(false);
    }
  };

  const handleGenerateCodes = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !ownerToken) return;

    setGeneratingCodes(true);
    setFeedback(null);
    try {
      const result = await generateGuestCodes(id, ownerToken, {
        quantity: codeQuantity,
        prefix: codePrefix.trim() || undefined,
        issuedTo: codeIssuedTo.trim() || undefined,
      });
      setRecentCodes(result.codes);
      setCodeIssuedTo("");
      setFeedback(`Generated ${result.codes.length} guest code${result.codes.length === 1 ? "" : "s"}.`);
  await refreshRsvpData();
    } catch (codeError) {
      const message = codeError instanceof Error ? codeError.message : "Unable to generate codes.";
      setFeedback(message);
    } finally {
      setGeneratingCodes(false);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!id || !ownerToken) return;
    setDeletingCodeId(codeId);
    setFeedback(null);
    try {
      await deleteGuestCode(id, codeId, ownerToken);
      setFeedback("Guest code deleted.");
      setRecentCodes((prev) => prev.filter((code) => code.id !== codeId));
  await refreshRsvpData();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Unable to delete code.";
      setFeedback(message);
    } finally {
      setDeletingCodeId(null);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !ownerToken || !checkInToken.trim()) return;

    setIsCheckingIn(true);
    setCheckInFeedback(null);

    try {
      const result = await checkInGuest(id, checkInToken.trim(), ownerToken);
      setCheckInFeedback({
        text: `Success! Checked in ${result.rsvp.name}.`,
        tone: "success",
      });
      setCheckInToken("");
      await refreshRsvpData();
    } catch (err) {
      setCheckInFeedback({
        text: err instanceof Error ? err.message : "Check-in failed.",
        tone: "error",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleSetLiveEvent = async (eventId: string | null) => {
    if (!id || !ownerToken) return;

    setIsUpdatingLiveEvent(true);
    try {
      await updateInvitationOwner(id, { currentEventId: eventId }, ownerToken);
      await invitationQuery.refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update live event.");
    } finally {
      setIsUpdatingLiveEvent(false);
    }
  };

  const renderTabContent = () => {
    if (activeTab === "design") {
      return (
        <form className="owner-form" onSubmit={handleDesignSubmit}>
          <div className="owner-form__grid">
            <label>
              Headline
              <input
                value={designState.headline}
                onChange={(event) =>
                  setDesignState((prev) => ({ ...prev, headline: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Couple – first name
              <input
                value={designState.brideName}
                onChange={(event) =>
                  setDesignState((prev) => ({ ...prev, brideName: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Couple – second name
              <input
                value={designState.groomName}
                onChange={(event) =>
                  setDesignState((prev) => ({ ...prev, groomName: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Event title
              <input
                value={designState.eventTitle}
                onChange={(event) =>
                  setDesignState((prev) => ({ ...prev, eventTitle: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Event venue
              <input
                value={designState.eventVenue}
                onChange={(event) =>
                  setDesignState((prev) => ({ ...prev, eventVenue: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Event date
              <input
                type="date"
                value={designState.eventDate}
                onChange={(event) =>
                  setDesignState((prev) => ({ ...prev, eventDate: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Event time
              <input
                type="time"
                value={designState.eventTime}
                onChange={(event) =>
                  setDesignState((prev) => ({ ...prev, eventTime: event.target.value }))
                }
              />
            </label>
            <label>
              Address (optional)
              <input
                value={designState.eventAddress}
                onChange={(event) =>
                  setDesignState((prev) => ({ ...prev, eventAddress: event.target.value }))
                }
              />
            </label>
            <label>
              Map link (optional)
              <input
                value={designState.eventMap}
                onChange={(event) =>
                  setDesignState((prev) => ({ ...prev, eventMap: event.target.value }))
                }
                placeholder="https://maps.google.com/..."
              />
            </label>
          </div>

          <div className="owner-form__grid">
            <label>
              Primary colour
              <input
                type="color"
                value={designState.primaryColor}
                onChange={(event) =>
                  setDesignState((prev) => ({ ...prev, primaryColor: event.target.value }))
                }
              />
            </label>
            <label>
              Secondary colour
              <input
                type="color"
                value={designState.secondaryColor}
                onChange={(event) =>
                  setDesignState((prev) => ({ ...prev, secondaryColor: event.target.value }))
                }
              />
            </label>
          </div>

          <label>
            Background image URL (optional)
            <input
              type="url"
              value={designState.backgroundImageUrl}
              onChange={(event) =>
                setDesignState((prev) => ({ ...prev, backgroundImageUrl: event.target.value }))
              }
              placeholder="https://images.example.com/invite-background.jpg"
            />
            <span className="hint">
              Provide a high-resolution landscape image. The hero section applies a soft overlay for legibility.
            </span>
          </label>

          <div className="owner-form__actions">
            <button type="submit" className="ui-button primary" disabled={savingDesign}>
              {savingDesign ? "Saving…" : "Save changes"}
            </button>
            <button type="button" className="ui-button subtle" onClick={handlePreviewPublic}>
              Preview public page
            </button>
          </div>
          {designFeedback && (
            <p
              className={`form-message${
                designFeedback.tone === "error"
                  ? " error"
                  : designFeedback.tone === "success"
                    ? " success"
                    : ""
              }`}
              role="status"
            >
              {designFeedback.text}
            </p>
          )}
        </form>
      );
    }

    if (activeTab === "rsvp") {
      if (rsvpManageQuery.isLoading) {
        return (
          <div className="owner-state">
            <p>Loading RSVP insights…</p>
          </div>
        );
      }

      if (rsvpManageQuery.isError) {
        const message =
          rsvpManageQuery.error instanceof Error
            ? rsvpManageQuery.error.message
            : "Unable to load RSVP data.";
        return (
          <div className="owner-state error">
            <p>{message}</p>
          </div>
        );
      }

        const rsvpData = rsvpManageQuery.data;
        if (!rsvpData) {
          return (
            <div className="owner-state">
              <p>RSVP data is unavailable right now.</p>
            </div>
          );
        }

        const stats = rsvpData.stats ?? { yesCount: 0, maybeCount: 0, noCount: 0, totalGuests: 0 };
        const guestCodes = rsvpData.guestCodes ?? [];
        const rsvps = rsvpData.rsvps ?? [];
        const invitationHasPasscode = invitation?.hasRsvpPasscode ?? false;
        const capacityLimit = invitation?.capacity ?? null;
        const remainingCapacity =
          capacityLimit != null ? Math.max(capacityLimit - stats.totalGuests, 0) : null;

        return (
          <div className="owner-rsvp">
            <section className="owner-rsvp__section">
              <header>
                <h3>At a glance</h3>
                <p className="hint">Track confirmations and balance your guest capacity.</p>
              </header>
              <div className="rsvp-stats-grid">
                <article className="rsvp-stat yes">
                  <span className="rsvp-stat__label">Yes</span>
                  <span className="rsvp-stat__value">{stats.yesCount}</span>
                </article>
                <article className="rsvp-stat maybe">
                  <span className="rsvp-stat__label">Maybe</span>
                  <span className="rsvp-stat__value">{stats.maybeCount}</span>
                </article>
                <article className="rsvp-stat no">
                  <span className="rsvp-stat__label">No</span>
                  <span className="rsvp-stat__value">{stats.noCount}</span>
                </article>
                <article className="rsvp-stat total">
                  <span className="rsvp-stat__label">Confirmed guests</span>
                  <span className="rsvp-stat__value">{stats.totalGuests}</span>
                  {capacityLimit != null && (
                    <span className="rsvp-stat__meta">
                      {remainingCapacity} seat{remainingCapacity === 1 ? "" : "s"} remaining
                    </span>
                  )}
                </article>
              </div>
            </section>

            <section className="owner-rsvp__section">
              <header>
                <h3>RSVP configuration</h3>
                <p className="hint">Choose how guests can confirm their attendance.</p>
              </header>
              <form className="owner-form rsvp-settings" onSubmit={handleRsvpSettingsSubmit}>
                <fieldset className="rsvp-mode-group">
                  <legend>Mode</legend>
                  <div className="rsvp-mode-options">
                    {rsvpModeOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`rsvp-mode-card ${rsvpMode === option.value ? "active" : ""}`}
                      >
                        <input
                          type="radio"
                          name="rsvpMode"
                          value={option.value}
                          checked={rsvpMode === option.value}
                          onChange={(event) =>
                            setRsvpMode(event.target.value as InvitationRsvpMode)
                          }
                        />
                        <span className="rsvp-mode-card__title">{option.title}</span>
                        <span className="rsvp-mode-card__description">{option.description}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {rsvpMode === "passcode" && (
                  <label>
                    Passcode
                    <input
                      value={passcodeInput}
                      onChange={(event) => setPasscodeInput(event.target.value)}
                      placeholder="Enter a new passcode"
                    />
                    <span className="hint">
                      Share this passcode with guests. Leave blank to keep the current passcode.
                    </span>
                  </label>
                )}

                {invitationHasPasscode && (
                  <div className="rsvp-passcode-actions">
                    <p className="hint">
                      A passcode is currently active. Remove it or switch modes to open RSVP access.
                    </p>
                    <button
                      type="button"
                      className="link-btn danger"
                      onClick={handleClearPasscode}
                      disabled={savingRsvp}
                    >
                      {savingRsvp ? "Updating…" : "Remove passcode"}
                    </button>
                  </div>
                )}

                <label>
                  Guest capacity (optional)
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={capacityInput}
                    onChange={(event) => setCapacityInput(event.target.value)}
                    placeholder="e.g. 300"
                  />
                  <span className="hint">
                    Limit the number of “Yes” responses allowed for this invitation.
                  </span>
                </label>

                <div className="owner-form__actions">
                  <button type="submit" className="ui-button primary" disabled={savingRsvp}>
                    {savingRsvp ? "Saving…" : "Save RSVP settings"}
                  </button>
                </div>
              </form>
            </section>

            {rsvpMode === "guest_codes" && (
              <section className="owner-rsvp__section">
                <header>
                  <h3>Guest codes</h3>
                  <p className="hint">
                    Generate unique codes for invitees. Copy the codes immediately—they are hidden later
                    for security.
                  </p>
                </header>

                <form className="guest-codes-form" onSubmit={handleGenerateCodes}>
                  <div className="guest-codes-grid">
                    <label>
                      Quantity
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={codeQuantity}
                        onChange={(event) =>
                          setCodeQuantity(
                            Math.min(200, Math.max(1, Number.parseInt(event.target.value, 10) || 1)),
                          )
                        }
                      />
                    </label>
                    <label>
                      Prefix (optional)
                      <input
                        value={codePrefix}
                        onChange={(event) => setCodePrefix(event.target.value.toUpperCase())}
                        placeholder="e.g. VIP"
                        maxLength={6}
                      />
                    </label>
                    <label>
                      Issued to (optional)
                      <input
                        value={codeIssuedTo}
                        onChange={(event) => setCodeIssuedTo(event.target.value)}
                        placeholder="Guest group or note"
                      />
                    </label>
                  </div>
                  <div className="owner-form__actions">
                    <button type="submit" className="ui-button primary" disabled={generatingCodes}>
                      {generatingCodes ? "Generating…" : "Generate codes"}
                    </button>
                  </div>
                </form>

                {recentCodes.length > 0 && (
                  <div className="guest-codes-generated">
                    <p className="hint">
                      Copy these newly generated codes—they will not be shown again.
                    </p>
                    <ul>
                      {recentCodes.map((code) => (
                        <li key={code.id}>
                          <code>{code.code}</code>
                          {code.issuedTo && <span>{code.issuedTo}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="guest-code-list">
                  {guestCodes.length ? (
                    <ul>
                      {guestCodes.map((code) => {
                        const isUsed = Boolean(code.usedAt);
                        return (
                          <li key={code.id} className={isUsed ? "used" : "unused"}>
                            <div className="guest-code-list__meta">
                              <span className="guest-code-list__id">{code.id.slice(0, 8)}</span>
                              {code.issuedTo && (
                                <span className="guest-code-list__issued">{code.issuedTo}</span>
                              )}
                              <span className="guest-code-list__status">
                                {isUsed ? "Used" : "Unused"}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="link-btn danger"
                              onClick={() => handleDeleteCode(code.id)}
                              disabled={isUsed || deletingCodeId === code.id}
                            >
                              {deletingCodeId === code.id ? "Removing…" : "Delete"}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="hint">No guest codes yet.</p>
                  )}
                </div>
              </section>
            )}

            <section className="owner-rsvp__section">
              <header>
                <h3>Responses</h3>
                <p className="hint">Latest submissions arrive in real time as guests respond.</p>
              </header>
              {rsvps.length ? (
                <ul className="rsvp-list">
                  {rsvps.map((record) => (
                    <li key={record.id} className={`rsvp-list__item status-${record.status}`}>
                      <div className="rsvp-list__header">
                        <span className="rsvp-list__name">{record.name}</span>
                        <span className="rsvp-list__badge">{record.status.toUpperCase()}</span>
                      </div>
                      <dl className="rsvp-list__meta">
                        <div>
                          <dt>Party size</dt>
                          <dd>{record.partySize}</dd>
                        </div>
                        {record.phone && (
                          <div>
                            <dt>Phone</dt>
                            <dd>{record.phone}</dd>
                          </div>
                        )}
                        <div>
                          <dt>Submitted</dt>
                          <dd>{new Date(record.createdAt).toLocaleString()}</dd>
                        </div>
                      </dl>
                      {record.message && <p className="rsvp-list__message">{record.message}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="hint">No responses yet. Share your link to start collecting RSVPs.</p>
              )}
            </section>
          </div>
        );
      }

    if (activeTab === "live") {
      const timelineSection = invitation?.sections.find((s) => s.type === "loveStory");
      const timelineItems = (timelineSection?.content as LoveStoryItem[]) || [];

      return (
        <div className="owner-live">
          <div className="owner-live__grid">
            <section className="owner-card">
              <h3>Live Event Tracking</h3>
              <p className="hint">
                Select which part of your event is currently happening. This will show a "Live Now"
                badge on the guest's invitation page.
              </p>
              <div className="live-event-list">
                <button
                  type="button"
                  className={`live-event-item ${!invitation?.currentEventId ? "active" : ""}`}
                  onClick={() => handleSetLiveEvent(null)}
                  disabled={isUpdatingLiveEvent}
                >
                  None (Event not started or ended)
                </button>
                {timelineItems.map((item, idx) => {
                  const itemId = item.id || `event-${idx}`;
                  return (
                    <button
                      key={itemId}
                      type="button"
                      className={`live-event-item ${
                        invitation?.currentEventId === itemId ? "active" : ""
                      }`}
                      onClick={() => handleSetLiveEvent(itemId)}
                      disabled={isUpdatingLiveEvent}
                    >
                      <span className="live-event-item__title">{item.title || "Untitled Event"}</span>
                      {item.date && <span className="live-event-item__date">{item.date}</span>}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="owner-card">
              <h3>Guest Check-in</h3>
              <p className="hint">
                Enter the 12-character check-in token from the guest's Digital Pass to mark them as
                arrived.
              </p>
              <form onSubmit={handleCheckIn} className="check-in-form">
                <input
                  type="text"
                  placeholder="Enter token (e.g. ABC123XYZ789)"
                  value={checkInToken}
                  onChange={(e) => setCheckInToken(e.target.value.toUpperCase())}
                  maxLength={12}
                  className="check-in-input"
                />
                <button type="submit" className="button primary" disabled={isCheckingIn}>
                  {isCheckingIn ? "Checking in..." : "Check In Guest"}
                </button>
              </form>
              {checkInFeedback && (
                <div className={`feedback-box ${checkInFeedback.tone}`}>
                  {checkInFeedback.text}
                </div>
              )}
            </section>
          </div>
        </div>
      );
    }

    return (
      <div className="owner-placeholder">
        <p>
          This section is coming soon. We are preparing richer controls for {activeTab} so you can manage
          RSVP flows, track engagement, and export assets effortlessly.
        </p>
      </div>
    );
  };

  const renderContent = () => {
    if (!ownerToken) {
      return (
        <div className="owner-state">
          <p>Missing owner key. Please use the private link shared when the invitation was created.</p>
        </div>
      );
    }

    if (invitationQuery.isLoading) {
      return (
        <div className="owner-state">
          <p>Loading your invitation…</p>
        </div>
      );
    }

    if (errorMessage) {
      return (
        <div className="owner-state error">
          <p>{errorMessage}</p>
        </div>
      );
    }

    if (!invitation) {
      return (
        <div className="owner-state">
          <p>Invitation not found.</p>
        </div>
      );
    }

    return (
      <>
        <header className="owner-dashboard__header">
          <div>
            <p className="eyebrow">Owner dashboard</p>
            <h1>{invitation.headline}</h1>
            <div className="owner-dashboard__meta">
              <span className="slug">/#/i/{invitation.slug}</span>
              {currentStatus && <span className={`status-badge status-${currentStatus}`}>{currentStatus}</span>}
            </div>
          </div>
        </header>

        {feedback && <p className="owner-feedback">{feedback}</p>}

        <section className="owner-layout">
          <aside className="owner-sidebar">
            <article className="owner-panel">
              <header>
                <h2>Share</h2>
              </header>
              <p className="hint">Use these shortcuts to spread the word instantly.</p>
              <div className="share-list">
                <button type="button" className="link-btn" onClick={() => handleCopy(shareUrl, "Public link")}>
                  Copy public link
                </button>
                {shareLinks.map((item) => (
                  <a key={item.label} href={item.href} target="_blank" rel="noopener" className="link-btn">
                    {item.label}
                  </a>
                ))}
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="link-btn"
                  disabled={qrDownloading}
                >
                  {qrDownloading ? "Preparing QR…" : "Download QR"}
                </button>
              </div>
              <div className="owner-panel__section">
                <h3>Owner link</h3>
                <code className="owner-link" title={ownerLink}>
                  {ownerLink}
                </code>
                <div className="owner-panel__actions">
                  <button type="button" className="link-btn" onClick={() => handleCopy(ownerLink, "Owner link")}>
                    Copy owner link
                  </button>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={handleRotateLink}
                    disabled={rotatingLink}
                  >
                    {rotatingLink ? "Rotating…" : "Regenerate link"}
                  </button>
                </div>
              </div>
            </article>

            <article className="owner-panel">
              <header>
                <h2>Status</h2>
              </header>
              <p className="hint">Control guest access with a single switch.</p>
              <ul className="status-list">
                {statusOptions.map((option) => (
                  <li key={option.value}>
                    <button
                      type="button"
                      className={`status-item ${currentStatus === option.value ? "active" : ""}`}
                      onClick={() => handleStatusChange(option.value)}
                      disabled={savingStatus}
                    >
                      <span className="status-item__label">{option.label}</span>
                      <span className="status-item__description">{option.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          </aside>

          <div className="owner-main">
            <nav className="owner-tabs" aria-label="Owner workspace sections">
              {[
                { value: "design", label: "Design" },
                { value: "rsvp", label: "RSVP" },
                { value: "live", label: "Live" },
                { value: "analytics", label: "Analytics" },
                { value: "export", label: "Export" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={activeTab === tab.value ? "active" : ""}
                  onClick={() => setActiveTab(tab.value as DashboardTab)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <section className="owner-tab-content">{renderTabContent()}</section>
          </div>
        </section>
      </>
    );
  };

  return (
    <div className="page">
      <Header />
      <main className="section section--muted">
        <div className="container owner-dashboard">{renderContent()}</div>
      </main>
      <Footer />
    </div>
  );
};

export default OwnerDashboard;
