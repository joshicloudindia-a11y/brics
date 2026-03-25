import React, { useState } from "react";
import { Upload, Download, X, CheckCircle, FileText } from "lucide-react";
import { downloadExcelTemplate, parseExcelFile, validateUserData } from "../../utils/excelUploadUtils.js";
import { toast } from "react-toastify";

const UploadDaoModal = ({ isOpen, onClose, onImport, isLoading, eventName, users = [] }) => {
  const [step, setStep] = useState("download"); // download, upload, preview
  const [parsedDaos, setParsedDaos] = useState([]);
  const [editedDaos, setEditedDaos] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize editedDaos when users prop changes
  React.useEffect(() => {
    if (isOpen && users && users.length > 0) {
      setParsedDaos(users);
      setEditedDaos(JSON.parse(JSON.stringify(users)));
      validateAll(users);
      setStep("preview");
    }
  }, [users, isOpen]);

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      await downloadExcelTemplate(eventName || "Event", "dao");
      toast.success("Template downloaded successfully");
    } catch (error) {
      toast.error("Failed to download template");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid Excel (.xlsx, .xls) or CSV file");
      return;
    }

    setIsProcessing(true);
    try {
      const data = await parseExcelFile(file, "dao");
      if (data.length === 0) {
        toast.error("No data found in the file");
        return;
      }
      setParsedDaos(data);
      setEditedDaos(JSON.parse(JSON.stringify(data)));
      validateAll(data);
      setStep("preview");
    } catch (error) {
      toast.error(error.message || "Failed to parse file");
    } finally {
      setIsProcessing(false);
    }
  };

  const validateAll = (usersToValidate = editedDaos) => {
    const errors = {};
    usersToValidate.forEach((user, index) => {
      const userErrors = validateUserData(user, "dao");
      if (userErrors.length > 0) {
        errors[index] = userErrors;
      }
    });
    setValidationErrors(errors);
  };

  const handleFieldChange = (index, field, value) => {
    const updated = [...editedDaos];
    updated[index][field] = value;
    setEditedDaos(updated);
    
    // Re-validate this user
    const userErrors = validateUserData(updated[index], "dao");
    const newErrors = { ...validationErrors };
    if (userErrors.length > 0) {
      newErrors[index] = userErrors;
    } else {
      delete newErrors[index];
    }
    setValidationErrors(newErrors);
  };

  const handleRemoveRow = (index) => {
    const updated = editedDaos.filter((_, i) => i !== index);
    setEditedDaos(updated);
    const newErrors = { ...validationErrors };
    delete newErrors[index];
    setValidationErrors(newErrors);
  };

  const handleImport = async () => {
    validateAll(editedDaos);
    if (Object.keys(validationErrors).length > 0) {
      toast.error("Please fix all validation errors before importing");
      return;
    }
    await onImport(editedDaos);
    resetModal();
  };

  const resetModal = () => {
    setStep("download");
    setParsedDaos([]);
    setEditedDaos([]);
    setValidationErrors({});
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  const readyCount = Object.keys(validationErrors).length === 0 && editedDaos.length > 0
    ? editedDaos.length
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header with Step Indicator */}
        <div className="bg-gradient-to-r from-[#1f4788] to-[#2a5ca8] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">
              {step === "download" && "Bulk Upload DAOs"}
              {step === "upload" && "Upload Excel File"}
              {step === "preview" && "Review & Confirm"}
            </h2>
          </div>
          <button 
            onClick={handleClose}
            className="text-white hover:bg-[#163766] p-2 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="bg-blue-50 px-6 py-3 flex items-center justify-between">
          <div className="flex gap-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${step === "download" ? "bg-[#1f4788] text-white" : "bg-white text-gray-600 border border-gray-200"}`}>
              <Download size={16} />
              Template
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${step === "upload" ? "bg-[#1f4788] text-white" : "bg-white text-gray-600 border border-gray-200"}`}>
              <Upload size={16} />
              Upload
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${step === "preview" ? "bg-[#1f4788] text-white" : "bg-white text-gray-600 border border-gray-200"}`}>
              <CheckCircle size={16} />
              Review
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(90vh - 180px)" }}>
          {step === "download" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="bg-[#1f4788] rounded-full p-4">
                    <Download className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Download Template</h3>
                    <p className="text-gray-600">
                      Download the pre-formatted Excel template with all required fields, example data, and instructions.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadTemplate}
                    disabled={isDownloading}
                    className="mt-4 flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#1f4788] to-[#2a5ca8] text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <Download size={18} />
                    {isDownloading ? "Downloading..." : "Download Template"}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep("upload")}
                className="w-full px-6 py-3 bg-gradient-to-r from-[#1f4788] to-[#2a5ca8] text-white rounded-lg hover:shadow-lg transition font-medium"
              >
                Next: Upload File
              </button>
            </div>
          )}

          {step === "upload" && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-12 text-center bg-gradient-to-br from-blue-50 to-indigo-50">
                <Upload className="mx-auto h-16 w-16 text-[#1f4788] mb-4" />
                <p className="text-gray-700 font-semibold mb-2 text-lg">Choose a file or drag and drop</p>
                <p className="text-gray-500 mb-6">Excel (.xlsx, .xls) or CSV files up to 10MB</p>
                <label className="inline-block px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg cursor-pointer transition font-medium">
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </span>
                  ) : (
                    "Browse File"
                  )}
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isProcessing}
                  />
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("download")}
                  className="flex-1 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-semibold text-lg">
                  <CheckCircle className="inline mr-2 w-5 h-5" />
                  <strong>{readyCount} of {editedDaos.length}</strong> DAOs ready to import
                </p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#1f4788] to-[#2a5ca8] border-b border-gray-200 sticky top-0">
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[50px]">No.</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[120px]">First Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[120px]">Middle Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[120px]">Last Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[150px]">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[100px]">Title</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[130px]">Mobile</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[120px]">Country</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[100px]">State</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[100px]">City</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[140px]">Organisation</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[120px]">Position</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[120px]">DOB</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[100px]">Gender</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[120px]">Nationality</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[120px]">Citizenship</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[120px]">Blood Group</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[130px]">Medical</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[130px]">Dietary</th>
                      <th className="px-4 py-3 text-left font-semibold text-white whitespace-nowrap min-w-[80px]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editedDaos.map((dao, index) => (
                      <tr key={index} className={`border-b border-gray-200 hover:bg-gray-50 ${validationErrors[index] ? "bg-red-50" : ""}`}>
                        <td className="px-4 py-3 text-gray-600 font-medium min-w-[50px]">{index + 1}</td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <input
                            type="text"
                            value={dao.firstName || ""}
                            onChange={(e) => handleFieldChange(index, "firstName", e.target.value)}
                            className={`w-full px-2 py-2 border rounded text-sm ${
                              validationErrors[index]?.some((e) => e.includes("First Name"))
                                ? "border-red-500 bg-red-50"
                                : "border-gray-300 focus:border-[#1f4788] focus:ring-1 focus:ring-[#1f4788]"
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <input
                            type="text"
                            value={dao.middleName || ""}
                            onChange={(e) => handleFieldChange(index, "middleName", e.target.value)}
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:border-[#1f4788] focus:ring-1 focus:ring-[#1f4788]"
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <input
                            type="text"
                            value={dao.lastName || ""}
                            onChange={(e) => handleFieldChange(index, "lastName", e.target.value)}
                            className={`w-full px-2 py-2 border rounded text-sm ${
                              validationErrors[index]?.some((e) => e.includes("Last Name"))
                                ? "border-red-500 bg-red-50"
                                : "border-gray-300 focus:border-[#1f4788] focus:ring-1 focus:ring-[#1f4788]"
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[150px]">
                          <input
                            type="email"
                            value={dao.email || ""}
                            onChange={(e) => handleFieldChange(index, "email", e.target.value)}
                            className={`w-full px-2 py-2 border rounded text-sm ${
                              validationErrors[index]?.some((e) => e.includes("Email"))
                                ? "border-red-500 bg-red-50"
                                : "border-gray-300 focus:border-[#1f4788] focus:ring-1 focus:ring-[#1f4788]"
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[100px]">
                          <input
                            type="text"
                            value={dao.title || ""}
                            onChange={(e) => handleFieldChange(index, "title", e.target.value)}
                            placeholder="Dr., Mr."
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:border-[#1f4788] focus:ring-1 focus:ring-[#1f4788]"
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[130px]">
                          <input
                            type="tel"
                            value={dao.mobile || ""}
                            onChange={(e) => handleFieldChange(index, "mobile", e.target.value)}
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:border-[#1f4788] focus:ring-1 focus:ring-[#1f4788]"
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <input
                            type="text"
                            value={dao.country || ""}
                            onChange={(e) => handleFieldChange(index, "country", e.target.value)}
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:border-[#1f4788] focus:ring-1 focus:ring-[#1f4788]"
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[100px]">
                          <input
                            type="text"
                            value={dao.state || ""}
                            onChange={(e) => handleFieldChange(index, "state", e.target.value)}
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:border-[#1f4788] focus:ring-1 focus:ring-[#1f4788]"
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[100px]">
                          <input
                            type="text"
                            value={dao.city || ""}
                            onChange={(e) => handleFieldChange(index, "city", e.target.value)}
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:border-[#1f4788] focus:ring-1 focus:ring-[#1f4788]"
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[140px]">
                          <input
                            type="text"
                            value={dao.organisation || ""}
                            onChange={(e) => handleFieldChange(index, "organisation", e.target.value)}
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:border-[#1f4788] focus:ring-1 focus:ring-[#1f4788]"
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <input
                            type="text"
                            value={dao.position || ""}
                            onChange={(e) => handleFieldChange(index, "position", e.target.value)}
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:border-[#1f4788] focus:ring-1 focus:ring-[#1f4788]"
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <input
                            type="date"
                            value={dao.dateOfBirth || ""}
                            onChange={(e) => handleFieldChange(index, "dateOfBirth", e.target.value)}
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:border-[#1f4788] focus:ring-1 focus:ring-[#1f4788]"
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[100px]">
                          <input
                            type="text"
                            value={dao.gender || ""}
                            onChange={(e) => handleFieldChange(index, "gender", e.target.value)}
                            placeholder="M/F"
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:border-[#1f4788] focus:ring-1 focus:ring-[#1f4788]"
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <input
                            type="text"
                            value={dao.nationality || ""}
                            onChange={(e) => handleFieldChange(index, "nationality", e.target.value)}
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:border-[#1f4788] focus:ring-1 focus:ring-[#1f4788]"
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <input
                            type="text"
                            value={dao.citizenship || ""}
                            onChange={(e) => handleFieldChange(index, "citizenship", e.target.value)}
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:border-[#1f4788] focus:ring-1 focus:ring-[#1f4788]"
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <input
                            type="text"
                            value={dao.bloodGroup || ""}
                            onChange={(e) => handleFieldChange(index, "bloodGroup", e.target.value)}
                            placeholder="O+, A-"
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:border-[#1f4788] focus:ring-1 focus:ring-[#1f4788]"
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[130px]">
                          <input
                            type="text"
                            value={dao.medicalConditions || ""}
                            onChange={(e) => handleFieldChange(index, "medicalConditions", e.target.value)}
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:border-[#1f4788] focus:ring-1 focus:ring-[#1f4788]"
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[130px]">
                          <input
                            type="text"
                            value={dao.dietaryPreferences || ""}
                            onChange={(e) => handleFieldChange(index, "dietaryPreferences", e.target.value)}
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:border-[#1f4788] focus:ring-1 focus:ring-[#1f4788]"
                          />
                        </td>
                        <td className="px-4 py-3 min-w-[80px] sticky right-0 bg-white">
                          <button
                            onClick={() => handleRemoveRow(index)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-2 rounded font-medium text-sm transition whitespace-nowrap"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Errors */}
              {Object.keys(validationErrors).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                    <X className="w-4 h-4" />
                    Validation Errors:
                  </p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {Object.entries(validationErrors).map(([rowIdx, errors]) => (
                      <li key={rowIdx}>
                        <strong>Row {parseInt(rowIdx) + 1}:</strong> {errors.join(", ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
          {step === "preview" && (
            <>
              <button
                onClick={() => setStep("upload")}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={isLoading || readyCount === 0}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
              >
                {isLoading ? "Importing..." : `Import ${readyCount} DAOs`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadDaoModal;
