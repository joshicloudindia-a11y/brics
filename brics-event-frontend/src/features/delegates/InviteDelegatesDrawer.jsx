import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import DelegateForm from "./DelegateForm";
import api from "../../services/axios";
import { attendEvent, getUserEventStatus } from "../../services/events";
import RoleSelectionModal from "../../components/common/RoleSelectionModal";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { updateUserRole } from "../../services/auth";

const emptyDelegate = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  inviteAs: "",
  status: "draft", // "draft" | "invited"
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Extract status irrespective of the response shape returned by the API.
const resolveUserEventStatus = (payload) => {
  if (!payload || typeof payload !== "object") return undefined;

  if (typeof payload.status === "string") return payload.status;

  const nestedData = payload.data;
  if (nestedData && typeof nestedData === "object") {
    if (typeof nestedData.status === "string") return nestedData.status;

    const deeperData = nestedData.data;
    if (deeperData && typeof deeperData === "object") {
      if (typeof deeperData.status === "string") return deeperData.status;
    }
  }

  return undefined;
};

/**
 * Update User Role
 * Backend: PUT /api/auth/user/update-role
 * @param {string} userId - The UUID of the user
 * @param {string} role - The name of the role to assign
 * @returns {Promise} Response with updated user information
 */
const updateUserRoleDirectly = async (userId, role) => {
  return updateUserRole(userId, role);
};

const InviteDelegatesDrawer = ({
  open,
  onClose,
  delegates,
  setDelegates,
  maxDelegates,
  eventId,
  delegateCount,
  onSuccess,
  daoId = null, // Optional: DAO ID to associate delegates with
  editMode = false,
}) => {
  const { data: currentUser } = useCurrentUser();
  const [errors, setErrors] = useState([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [attending, setAttending] = useState(false);
  const [userEventStatus, setUserEventStatus] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  /* ================= ANIMATION HANDLING ================= */
  useEffect(() => {
    if (open) {
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [open]);

  const currentTotal = (delegateCount || 0) + delegates.length;
  const isLimitReached = currentTotal >= maxDelegates;

  const currentRoleName = currentUser?.role?.name;
  const normalizedRole =
    typeof currentRoleName === "string"
      ? currentRoleName.trim().toUpperCase()
      : "";
  const isEventManager = normalizedRole === "EVENT MANAGER";
  const isSuperAdmin = normalizedRole === "SUPER ADMIN";

  const selfAccreditationDisabled =
    (typeof userEventStatus === "string" &&
      userEventStatus.toLowerCase() === "confirmed") ||
    isEventManager ||
    isSuperAdmin;


  const invitedCount = useMemo(
    () => delegates.filter((d) => d.status === "invited").length,
    [delegates],
  );

  const isFormValid = useMemo(
    () => errors.every((e) => Object.keys(e).length === 0),
    [errors],
  );

  /* ================= ENSURE ONE FORM ON OPEN ================= */
  useEffect(() => {
    if (open && delegates.length === 0) {
      setDelegates([{ ...emptyDelegate }]);
    }

    // Reset submitted state when opening
    if (open) {
      setHasSubmitted(false);
    }
  }, [open, delegates.length, setDelegates]);

  /* ================= VALIDATION ================= */
  useEffect(() => {
    setErrors(
      delegates.map((d) => {
        if (d.status === "invited") return {};
        const e = {};
        if (!d.firstName.trim()) e.firstName = "First name is required";
        if (!d.email.trim()) e.email = "Email is required";
        else if (!isValidEmail(d.email))
          e.email = "Enter a valid email address";
        if (!d.inviteAs) e.inviteAs = "Please select invitation type";
        return e;
      }),
    );
  }, [delegates]);

  useEffect(() => {
    if (!open) {
      setUserEventStatus(null);
      return;
    }

    if (!eventId) return;

    let ignore = false;

    const fetchUserEventStatus = async () => {
      try {
        const res = await getUserEventStatus(eventId);
        if (ignore) return;

        // Try to resolve explicit status first
        let status = resolveUserEventStatus(res);

        // If resolver couldn't find a status but API returned a matching object,
        // infer registration from presence of event-user identifier fields.
        if (!status && res && typeof res === "object") {
          const hasEventUserId = Boolean(
            res.user_event_id ||
              res.user_eventId ||
              res.event_user_id ||
              res.id ||
              res._id,
          );

          if (hasEventUserId) {
            status = "confirmed";
          }
        }

        setUserEventStatus(status || null);
      } catch (error) {
        if (ignore) return;
        setUserEventStatus(null);
      }
    };

    fetchUserEventStatus();

    return () => {
      ignore = true;
    };
  }, [open, eventId]);

  /* ================= HANDLERS (add/update/remove delegate) ================= */
  const addDelegate = () => {
    if (isLimitReached) {
      toast.error("Delegate limit reached");
      return;
    }

    if (delegates.length < maxDelegates) {
      setDelegates([...delegates, { ...emptyDelegate }]);
      setHasSubmitted(false);
    }
  };

  const updateDelegate = (index, field, value) => {
    const updated = [...delegates];
    updated[index] = { ...updated[index], [field]: value };
    setDelegates(updated);
  };

  const removeDelegate = (index) => {
    if (delegates[index].status === "invited") return;
    const updated = delegates.filter((_, i) => i !== index);
    setDelegates(updated.length ? updated : [{ ...emptyDelegate }]);
    setHasSubmitted(false);
  };

  /* ================= ATTEND EVENT ================= */
  const handleAttendConfirm = async (role) => {
    try {
      setAttending(true);

      const res = await attendEvent({
        event_id: eventId,
        role: role,
      });

      const status = resolveUserEventStatus(res);
      if (status) {
        setUserEventStatus(status);
      }

      toast.success(
        res?.data?.message ||
          res?.message ||
          `Successfully registered as ${role}`,
      );
      setRoleModalOpen(false);
    } catch (err) {
      const status = resolveUserEventStatus(err?.response?.data);
      if (status) {
        setUserEventStatus(status);
      }
      toast.error(
        err?.response?.data?.message || "Failed to register for event",
      );
    } finally {
      setAttending(false);
    }
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async () => {
    setHasSubmitted(true);
    if (!isFormValid) return;

    const draftDelegates = delegates.filter((d) => d.status === "draft");

    if (draftDelegates.length === 0) {
      toast.info("No new delegates to invite");
      return;
    }

    try {
      setLoading(true);

      if (editMode) {
        // In edit mode, update the role for each delegate using the updateUserRole API
        try {
          const updates = [];
          
          for (const delegate of delegates) {
            const userId = delegate.userId || delegate.user?.id || delegate.user_id || delegate.id;
            if (!userId) {
              console.warn("Skipping delegate update: missing userId", delegate);
              continue;
            }

            const roleName = delegate.inviteAs;

            if (!roleName) {
              toast.error("Invalid role: role name is required");
              setLoading(false);
              return;
            }

            // console.log(`Updating ${delegate.email}: userId=${userId}, role=${roleName}`);

            updates.push(
              updateUserRoleDirectly(userId, roleName).then(() => ({
                success: true,
                email: delegate.email,
                userId,
                role: roleName,
              })).catch((err) => {
                console.error(`Failed to update role for ${delegate.email}:`, err?.response?.data || err.message);
                return {
                  success: false,
                  email: delegate.email,
                  userId,
                  role: roleName,
                  error: err?.response?.data?.message || err.message,
                };
              })
            );
          }

          const results = await Promise.all(updates);
          const failed = results.filter((r) => !r.success);

          if (failed.length === 0) {
            toast.success("Delegate role(s) updated successfully!");
            onClose();
            if (onSuccess) onSuccess();
          } else {
            const failedEmails = failed.map((f) => f.email).join(", ");
            console.error("Failed delegate updates:", failed);
            const errorDetails = failed.map(f => `${f.email}: ${f.error}`).join("; ");
            toast.error(`Failed to update: ${errorDetails}`);
          }
        } catch (err) {
          console.error("Failed to update delegate roles", err);
          toast.error("Failed to update delegate roles");
        } finally {
          setLoading(false);
        }

        return;
      }

      // Not edit mode: proceed with normal invite flow for draft delegates
      const payload = {
        event_id: eventId,
        delegates: draftDelegates.map((d) => ({
          firstName: d.firstName,
          middleName: d.middleName,
          lastName: d.lastName,
          email: d.email,
          inviteAs: d.inviteAs,
        })),
      };

      // Include daoId if provided (for Super Admin/Manager adding delegate under specific DAO)
      if (daoId) {
        payload.daoId = daoId;
      }

      const res = await api.post(
        `/api/auth/events/${eventId}/delegates/invite`,
        payload,
      );

      const invitedEmails =
        res?.data?.results
          ?.filter((r) => r.status === "invited")
          .map((r) => r.email.toLowerCase()) || [];

      const updated = delegates.map((d) =>
        invitedEmails.includes(d.email.toLowerCase()) ? { ...d, status: "invited" } : d,
      );

      setDelegates(updated);
      toast.success("Invitations sent successfully!");
      onClose();

      // Refresh event data without page reload
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to send delegate invitations",
      );
    } finally {
      setLoading(false);
    }
  };
  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed top-0 left-0 right-0 bottom-0 bg-black z-[200] transition-opacity duration-300 ${
          isAnimating ? "opacity-40" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
        style={{ margin: 0, padding: 0 }}
      />

      {/* Drawer */}
      <aside
        className={`fixed z-[201] bg-white shadow-2xl flex flex-col transition-all duration-300 ease-out
          left-0 right-0 bottom-0 rounded-t-2xl
          sm:inset-auto sm:bottom-6 sm:top-6 sm:right-6 sm:left-auto sm:w-[90%] sm:max-h-none sm:rounded-2xl
          md:w-[600px] lg:w-[820px]
          ${
            isAnimating
              ? "translate-y-0 sm:translate-y-0 sm:translate-x-0 opacity-100"
              : "translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0"
          }`}
        style={{
          top: "64px",
          maxHeight: "calc(100vh - 64px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4  flex-shrink-0">
          <h2 className="text-sm sm:text-base lg:text-lg font-semibold">
            {editMode ? "Edit Delegate" : "Invite Delegates"}
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md -mr-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-6">
          {delegates.map((delegate, index) => (
            <DelegateForm
              key={index}
              index={index}
              data={delegate}
              errors={hasSubmitted ? errors[index] || {} : {}}
              onChange={updateDelegate}
              onRemove={removeDelegate}
              canRemove={delegates.length > 1}
              editMode={editMode}
            />
          ))}


          {!editMode &&

          <div className="space-y-3">
            {delegates.length < maxDelegates && (
              <button
                onClick={addDelegate}
                disabled={isLimitReached}
                className={`text-sm ${
                  isLimitReached
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-[var(--color-primary-blue)] hover:underline"
                }`}
              >
                + Add More Delegates
              </button>
            )}

            {/* ATTEND EVENT BUTTON */}
            {!isEventManager && (
              <div>
                <button
                  onClick={() => {
                    if (selfAccreditationDisabled) return;
                    setRoleModalOpen(true);
                  }}
                  disabled={selfAccreditationDisabled}
                  className={`text-sm ${
                    selfAccreditationDisabled
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-[var(--color-primary-blue)] hover:underline"
                  }`}
                >
                  + DAO Self Accreditation
                </button>
              </div>
            )}
          </div>
          }

          {invitedCount === maxDelegates && (
            <p className="text-xs text-gray-500">
              Maximum {maxDelegates} delegates invited
            </p>
          )}
        </div>

        {/* Footer */}
        <div className=" px-4 sm:px-6 py-3 sm:py-4 flex justify-end gap-3">
          <button
            onClick={handleSubmit}
            disabled={!isFormValid || loading}
            className={`w-full sm:w-auto px-5 sm:px-6 py-2.5 rounded-lg text-sm sm:text-base font-medium min-h-[44px] transition-colors ${
              isFormValid && !loading
                ? "bg-[var(--color-primary-blue)] text-white hover:opacity-90 active:opacity-80"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? (editMode ? "Updating..." : "Sending...") : editMode ? "Update" : "Send Invite"}
          </button>
        </div>
      </aside>

      {/* ROLE SELECTION MODAL */}
      <RoleSelectionModal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        onConfirm={handleAttendConfirm}
        loading={attending}
      />
    </>
  );
};

export default InviteDelegatesDrawer;