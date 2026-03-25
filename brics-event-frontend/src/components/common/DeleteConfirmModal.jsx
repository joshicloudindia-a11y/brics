import React from "react";
import { X, AlertTriangle } from "lucide-react";

const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Confirmation",
  message = "Are you sure you want to delete this item?",
  itemName = "",
  isLoading = false,
  confirmText = "Delete",
  loadingText = "Deleting...",
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[300]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[300] p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <p className="text-gray-600">{message}</p>
            {itemName && (
              <p className="text-sm text-gray-700 font-bold bg-gray-50 p-2 rounded">
                {itemName}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? loadingText : confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeleteConfirmModal;
