const ConfirmModal = ({ open, title, message, onConfirm, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl w-[90%] max-w-md p-6">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-[#003366] text-white rounded-lg text-sm"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
