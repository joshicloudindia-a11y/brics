import React from "react";

const RoleSelectionModal = ({ open, onClose, onConfirm, loading }) => {
  const [selectedRole, setSelectedRole] = React.useState("Delegate");

  if (!open) return null;

  const handleContinue = () => {
    onConfirm(selectedRole.toUpperCase());
  };

  const roles = [
    {
      label: "Delegate",
      description: "Attend sessions and participate in the event",
    },
    {
      label: "Head Of Delegate",
      description: "Manage delegates and oversee delegation activities",
    },
    {
      label: "Security Officer",
      description: "Ensure safety and manage event security operations",
    },
    {
      label: "Interpreter",
      description: "Provide language translation support during sessions",
    },
    {
      label: "Media",
      description: "Cover and document event activities",
    },
    {
      label: "Deputy",
      description: "Assist and support delegates in various tasks",
    },
    {
      label: "DELEGATION CONTACT OFFICER",
      description:
        "Coordinates delegation operations and handles official communication",
    },
    {
      label: "SPEAKER",
      description:
        "Deliver speeches and presentations during sessions, representing your delegation",
    },
  ];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl w-[90%] max-w-md p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        {/* Title */}
        <h3 className="text-xl font-semibold mb-2">
          Choose your role for this event
        </h3>

        {/* Subtitle */}
        <p className="text-sm text-gray-500 mb-6">
          Select how you would like to attend the event. Your role will define
          your access and responsibilities.
        </p>

        {/* Role Options */}
        <div className="space-y-3 mb-6">
          {roles.map((role) => (
            <label
              key={role.label}
              className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                selectedRole === role.label
                  ? "border-[#003366] bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={role.label}
                checked={selectedRole === role.label}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="mt-1 accent-[#003366]"
              />
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {role.label === "Head Of Delegate"
                    ? "Head of Delegation"
                    : role.label}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {role.description}
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            disabled={loading}
            className="px-6 py-2 bg-[#003366] text-white rounded-lg text-sm hover:bg-[#002244] disabled:opacity-50"
          >
            {loading ? "Processing..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectionModal;
