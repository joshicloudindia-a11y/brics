import React, { useState } from "react";
import { X, AlertCircle, CheckCircle } from "lucide-react";
import { toggleUserStatus } from "../../services/auth";
import { toast } from "react-toastify";

const UserStatusToggleModal = ({ open, onClose, user, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("confirm"); // 'confirm' or 'result'
  const [result, setResult] = useState(null);

  if (!open || !user) return null;

  const action = user.status === "blocked" ? "activate" : "deactivate";
  const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
  const isDeactivating = action === "deactivate";

  const handleToggle = async () => {
    try {
      setLoading(true);
      const response = await toggleUserStatus(user.user_id || user.id, action);
      setResult(response);
      setStep("result");
      toast.success(`User ${action}d successfully`);
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${action} user`);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("confirm");
    setResult(null);
    if (onSuccess && step === "result") {
      onSuccess();
    }
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {step === "confirm" ? `${actionLabel} User` : "Confirmation"}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {step === "confirm" ? (
              <div className="space-y-4">
                {/* Warning Icon */}
                <div className="flex justify-center">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      isDeactivating ? "bg-red-100" : "bg-green-100"
                    }`}
                  >
                    <AlertCircle
                      size={24}
                      className={
                        isDeactivating ? "text-red-600" : "text-green-600"
                      }
                    />
                  </div>
                </div>

                {/* Message */}
                <div className="text-center">
                  <p className="font-semibold text-gray-800">
                    {isDeactivating
                      ? "Deactivate User?"
                      : "Activate User?"}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">{user.name || user.email}</span>
                    {isDeactivating && (
                      <>
                        <br />
                        <span className="mt-2 block text-xs text-red-600">
                          ⚠️ If this is a DAO, all their invited delegates will also be deactivated.
                        </span>
                      </>
                    )}
                    {!isDeactivating && (
                      <>
                        <br />
                        <span className="mt-2 block text-xs text-green-600">
                          ✓ User and their associates will be reactivated.
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {/* User Info */}
                <div className="space-y-2 rounded-lg bg-gray-50 p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium text-gray-800 capitalize">
                      {user.name || user.email}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-gray-800">{user.email}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Role:</span>
                    <span className="font-medium text-gray-800 uppercase">
                      {user.role}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current Status:</span>
                    <span
                      className={`font-medium uppercase ${
                        user.status === "blocked"
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {user.status === "blocked"
                        ? "Inactive"
                        : "Active"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Success Icon */}
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle size={24} className="text-green-600" />
                  </div>
                </div>

                {/* Result Message */}
                <div className="text-center">
                  <p className="font-semibold text-gray-800">
                    {actionLabel} Successfully!
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    Total users affected: <span className="font-semibold">{result?.total_affected || 1}</span>
                  </p>
                </div>

                {/* Affected Users */}
                {result?.affected_users && result.affected_users.length > 0 && (
                  <div className="max-h-60 overflow-y-auto rounded-lg bg-gray-50 p-3">
                    <p className="mb-3 text-xs font-semibold text-gray-600">
                      AFFECTED USERS
                    </p>
                    <div className="space-y-2">
                      {result.affected_users.map((affectedUser) => (
                        <div
                          key={affectedUser.user_id}
                          className="flex items-start justify-between gap-2 border-b border-gray-200 pb-2 last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate capitalize">
                              {affectedUser.name}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {affectedUser.email}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium uppercase">
                                {affectedUser.role}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded font-medium uppercase ${
                                  affectedUser.action_type === "direct"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-orange-100 text-orange-700"
                                }`}
                              >
                                {affectedUser.action_type}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t px-6 py-4">
            {step === "confirm" ? (
              <>
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleToggle}
                  disabled={loading}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white ${
                    isDeactivating
                      ? "bg-red-600 hover:bg-red-700 disabled:bg-red-400"
                      : "bg-green-600 hover:bg-green-700 disabled:bg-green-400"
                  } disabled:opacity-50 transition`}
                >
                  {loading ? "Processing..." : actionLabel}
                </button>
              </>
            ) : (
              <button
                onClick={handleClose}
                className="w-full rounded-lg bg-[#1f4788] px-4 py-2 text-sm font-medium text-white hover:bg-[#163766] transition"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UserStatusToggleModal;
