import SearchableSelect from "../../components/common/SearchableSelect";

const DelegateForm = ({
  index,
  data,
  errors,
  onChange,
  onRemove,
  canRemove,
  editMode = false,
}) => {
  const isLocked = data.status === "invited"; // lock once invited

  return (
    <div className="space-y-4 bg-[#f9fafd] p-4 rounded-lg pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          DELEGATE – {index + 1}{" "}
          {isLocked && (
            <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-700">
              Invited
            </span>
          )}
        </p>
        {canRemove && !isLocked && (
          <button
            onClick={() => onRemove(index)}
            className="text-xs text-red-600 hover:underline"
          >
            Remove
          </button>
        )}
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* First Name */}
        <div>
          <label className="text-sm font-medium">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.firstName}
            onChange={(e) => onChange(index, "firstName", e.target.value)}
                 disabled={isLocked || editMode}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
              errors.email ? "border-red-500" : ""
            } ${isLocked || editMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
            placeholder="Enter your First Name"
          />
          {errors.firstName && (
            <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>
          )}
        </div>

        {/* Middle Name */}
        <div>
          <label className="text-sm font-medium">Middle Name (Optional)</label>
          <input
            type="text"
            value={data.middleName}
            onChange={(e) => onChange(index, "middleName", e.target.value)}
                 disabled={isLocked || editMode}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
              errors.email ? "border-red-500" : ""
            } ${isLocked || editMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
            placeholder="Enter your Middle Name"
          />
        </div>

        {/* Last Name */}
        <div>
          <label className="text-sm font-medium">Last Name (Optional)</label>
          <input
            type="text"
            value={data.lastName}
            onChange={(e) => onChange(index, "lastName", e.target.value)}
                disabled={isLocked || editMode}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
              errors.email ? "border-red-500" : ""
            } ${isLocked || editMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
            placeholder="Enter your Last Name"
          />
        </div>

        {/* Email */}
        <div>
          <label className="text-sm font-medium">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChange(index, "email", e.target.value)}
            disabled={isLocked || editMode}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
              errors.email ? "border-red-500" : ""
            } ${isLocked || editMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
            placeholder="Enter your Email ID"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email}</p>
          )}
        </div>

        {/* Invite As */}
        <div>
          <label className="text-sm font-medium">
            Invite as <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={[
              { value: "DELEGATE", label: "Delegate" },
              { value: "DELEGATION CONTACT OFFICER", label: "Delegation Contact Officer" },
              { value: "DEPUTY", label: "Deputy" },
              { value: "HEAD OF DELEGATE", label: "Head of Delegation" },
              { value: "INTERPRETER", label: "Interpreter" },
              { value: "MEDIA", label: "Media" },
              { value: "SECURITY OFFICER", label: "Security Officer" },
              { value: "SPEAKER", label: "Speaker for Side Event" },
            ]}
            value={data.inviteAs || ""}
            onChange={(val) => onChange(index, "inviteAs", val)}
            placeholder="Select"
            searchable
            sort
            maxVisible={5}
            disabled={isLocked}
            className={`mt-1`}
          />
          {errors.inviteAs && (
            <p className="mt-1 text-xs text-red-500">{errors.inviteAs}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DelegateForm;
