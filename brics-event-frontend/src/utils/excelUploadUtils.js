import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/**
 * DAO-specific fields
 */
const DAO_FIELDS = [
  { header: "First Name*", key: "firstName", width: 15 },
  { header: "Middle Name", key: "middleName", width: 15 },
  { header: "Last Name*", key: "lastName", width: 15 },
  { header: "Email*", key: "email", width: 25 },
  { header: "Title", key: "title", width: 12 },
  { header: "Mobile", key: "mobile", width: 15 },
  { header: "Country", key: "country", width: 18 },
  { header: "State", key: "state", width: 15 },
  { header: "City", key: "city", width: 15 },
  { header: "Organisation", key: "organisation", width: 20 },
  { header: "Position", key: "position", width: 18 },
  { header: "Date of Birth", key: "dateOfBirth", width: 15 },
  { header: "Gender", key: "gender", width: 12 },
  { header: "Nationality", key: "nationality", width: 15 },
  { header: "Citizenship", key: "citizenship", width: 15 },
  { header: "Blood Group", key: "bloodGroup", width: 12 },
  { header: "Medical Conditions", key: "medicalConditions", width: 20 },
  { header: "Dietary Preferences", key: "dietaryPreferences", width: 20 },
];

/**
 * Delegate-specific fields
 */
const DELEGATE_FIELDS = [
  { header: "First Name*", key: "firstName", width: 15 },
  { header: "Last Name*", key: "lastName", width: 15 },
  { header: "Email*", key: "email", width: 25 },
  { header: "Phone", key: "phone", width: 15 },
  { header: "Country", key: "country", width: 20 },
  { header: "Organization", key: "organization", width: 25 },
  { header: "Designation", key: "designation", width: 20 },
];

/**
 * Manager-specific fields
 */
const MANAGER_FIELDS = [
  { header: "First Name*", key: "firstName", width: 15 },
  { header: "Last Name*", key: "lastName", width: 15 },
  { header: "Email*", key: "email", width: 25 },
  { header: "Phone", key: "phone", width: 15 },
];

/**
 * Download Excel template for a specific user type
 */
export const downloadExcelTemplate = async (eventName, userType) => {
  const workbook = new ExcelJS.Workbook();
  
  let fields = [];
  let sheetTitle = "";
  let fileName = "";

  if (userType === "dao") {
    fields = DAO_FIELDS;
    sheetTitle = "DAOs";
    fileName = `${eventName}_DAO_template.xlsx`;
  } else if (userType === "delegate") {
    fields = DELEGATE_FIELDS;
    sheetTitle = "Delegates";
    fileName = `${eventName}_Delegate_template.xlsx`;
  } else if (userType === "manager") {
    fields = MANAGER_FIELDS;
    sheetTitle = "Managers";
    fileName = `${eventName}_Manager_template.xlsx`;
  }

  // Create Users sheet
  const worksheet = workbook.addWorksheet(sheetTitle);
  
  // Add headers
  worksheet.columns = fields;
  
  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4788" },
  };
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.height = 20;

  // Add sample row
  const sampleData = {};
  if (userType === "dao") {
    sampleData.firstName = "John";
    sampleData.middleName = "Kumar";
    sampleData.lastName = "Doe";
    sampleData.email = "dao@example.com";
    sampleData.title = "Dr.";
    sampleData.mobile = "+91-98765-43210";
    sampleData.country = "India";
    sampleData.state = "Delhi";
    sampleData.city = "New Delhi";
    sampleData.organisation = "Ministry of External Affairs";
    sampleData.position = "Ambassador";
    sampleData.dateOfBirth = "1980-05-15";
    sampleData.gender = "Male";
    sampleData.nationality = "Indian";
    sampleData.citizenship = "Indian";
    sampleData.bloodGroup = "O+";
    sampleData.medicalConditions = "None";
    sampleData.dietaryPreferences = "Vegetarian";
  } else if (userType === "delegate") {
    sampleData.firstName = "John";
    sampleData.lastName = "Doe";
    sampleData.email = "delegate@example.com";
    sampleData.phone = "+1234567890";
    sampleData.country = "India";
    sampleData.organization = "BRICS";
    sampleData.designation = "Ambassador";
  } else if (userType === "manager") {
    sampleData.firstName = "Jane";
    sampleData.lastName = "Smith";
    sampleData.email = "manager@example.com";
    sampleData.phone = "+1234567890";
  }

  worksheet.addRow(sampleData);

  // Add Instructions sheet
  const instructionsSheet = workbook.addWorksheet("Instructions");
  instructionsSheet.columns = [
    { header: "Field", key: "field", width: 25 },
    { header: "Description", key: "description", width: 50 },
  ];

  const instructionHeaderRow = instructionsSheet.getRow(1);
  instructionHeaderRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4788" },
  };
  instructionHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

  let instructions = [];
  if (userType === "dao") {
    instructions = [
      { field: "First Name", description: "First name of the DAO (Required)" },
      { field: "Middle Name", description: "Middle name (Optional)" },
      { field: "Last Name", description: "Last name of the DAO (Required)" },
      { field: "Email", description: "Valid email address (Required)" },
      { field: "Title", description: "Title e.g., Dr., Mr., Ms., Prof. (Optional)" },
      { field: "Mobile", description: "Mobile number with country code (Optional)" },
      { field: "Country", description: "Country of residence (Optional)" },
      { field: "State", description: "State/Province (Optional)" },
      { field: "City", description: "City (Optional)" },
      { field: "Organisation", description: "Organization/Ministry name (Optional)" },
      { field: "Position", description: "Job title/position (Optional)" },
      { field: "Date of Birth", description: "Format: YYYY-MM-DD (Optional)" },
      { field: "Gender", description: "Gender - Male/Female/Other (Optional)" },
      { field: "Nationality", description: "Nationality (Optional)" },
      { field: "Citizenship", description: "Citizenship (Optional)" },
      { field: "Blood Group", description: "Blood group e.g., O+, A-, B+ (Optional)" },
      { field: "Medical Conditions", description: "Any medical conditions (Optional)" },
      { field: "Dietary Preferences", description: "Dietary restrictions e.g., Vegetarian, Vegan (Optional)" },
    ];
  } else if (userType === "delegate") {
    instructions = [
      { field: "First Name", description: "Delegate's first name (Required)" },
      { field: "Last Name", description: "Delegate's last name (Required)" },
      { field: "Email", description: "Valid email address (Required)" },
      { field: "Phone", description: "Phone number with country code" },
      { field: "Country", description: "Country of origin" },
      { field: "Organization", description: "Organization name" },
      { field: "Designation", description: "Job title or designation" },
    ];
  } else if (userType === "manager") {
    instructions = [
      { field: "First Name", description: "Manager's first name (Required)" },
      { field: "Last Name", description: "Manager's last name (Required)" },
      { field: "Email", description: "Valid email address (Required)" },
      { field: "Phone", description: "Phone number with country code" },
    ];
  }

  instructions.forEach((inst) => {
    instructionsSheet.addRow(inst);
  });

  // Download file
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
};

/**
 * Map Excel headers to field keys
 */
const mapExcelHeadersToKeys = (row, userType) => {
  const headerMap = {
    // DAO fields
    "First Name*": "firstName",
    "First Name": "firstName",
    "Middle Name": "middleName",
    "Last Name*": "lastName",
    "Last Name": "lastName",
    "Email*": "email",
    "Email": "email",
    "Title": "title",
    "Mobile": "mobile",
    "Country": "country",
    "State": "state",
    "City": "city",
    "Organisation": "organisation",
    "Organization": "organisation",
    "Position": "position",
    "Date of Birth": "dateOfBirth",
    "Gender": "gender",
    "Nationality": "nationality",
    "Citizenship": "citizenship",
    "Blood Group": "bloodGroup",
    "Medical Conditions": "medicalConditions",
    "Dietary Preferences": "dietaryPreferences",
    // Delegate fields
    "Phone": "phone",
    "Organization": "organization",
    "Designation": "designation",
  };

  const mappedRow = {};
  Object.entries(row).forEach(([key, value]) => {
    const mappedKey = headerMap[key] || key;
    // Convert key to camelCase if it contains spaces
    const finalKey = mappedKey.replace(/\s+(.)/g, (_, char) => char.toUpperCase()).replace(/\s/g, "");
    mappedRow[finalKey] = value;
  });

  return mappedRow;
};

/**
 * Parse Excel file and extract data
 */
export const parseExcelFile = async (file, userType) => {
  try {
    const fileData = await file.arrayBuffer();
    const workbook = XLSX.read(fileData, { type: "array" });
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(sheet);
    
    // Clean up: remove completely empty rows and map headers
    const cleaned = data
      .filter((row) => {
        return Object.values(row).some((val) => val && val !== "");
      })
      .map((row, index) => {
        const mappedRow = mapExcelHeadersToKeys(row, userType);
        return {
          ...mappedRow,
          rowIndex: index + 2, // +2 because row 1 is header, +1 for 1-based indexing
        };
      });

    return cleaned;
  } catch (error) {
    console.error("Error parsing Excel:", error);
    throw new Error("Failed to parse Excel file. Please ensure it's a valid Excel or CSV file.");
  }
};

/**
 * Validate user data based on type
 */
export const validateUserData = (user, userType) => {
  const errors = [];

  if (userType === "dao") {
    if (!user.firstName || user.firstName.toString().trim() === "") {
      errors.push("First Name is required");
    }
    if (!user.lastName || user.lastName.toString().trim() === "") {
      errors.push("Last Name is required");
    }
    if (!user.email || user.email.toString().trim() === "") {
      errors.push("Email is required");
    } else if (!isValidEmail(user.email)) {
      errors.push("Invalid email format");
    }
  } else if (userType === "delegate") {
    if (!user.firstName || user.firstName.toString().trim() === "") {
      errors.push("First Name is required");
    }
    if (!user.lastName || user.lastName.toString().trim() === "") {
      errors.push("Last Name is required");
    }
    if (!user.email || user.email.toString().trim() === "") {
      errors.push("Email is required");
    } else if (!isValidEmail(user.email)) {
      errors.push("Invalid email format");
    }
  } else if (userType === "manager") {
    if (!user.firstName || user.firstName.toString().trim() === "") {
      errors.push("First Name is required");
    }
    if (!user.lastName || user.lastName.toString().trim() === "") {
      errors.push("Last Name is required");
    }
    if (!user.email || user.email.toString().trim() === "") {
      errors.push("Email is required");
    } else if (!isValidEmail(user.email)) {
      errors.push("Invalid email format");
    }
  }

  return errors;
};

/**
 * Get fields for a specific user type
 */
export const getFieldsForType = (userType) => {
  if (userType === "dao") return DAO_FIELDS;
  if (userType === "delegate") return DELEGATE_FIELDS;
  if (userType === "manager") return MANAGER_FIELDS;
  return [];
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Format field name for display
 */
export const formatFieldName = (field) => {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};
