import { v4 as uuidv4 } from "uuid";

const organizations = [
  {
    id: uuidv4(),
    organization_code: "ORG-RBI",
    organization_name: "Reserve Bank of India",
    description: "Reserve Bank of India",
    ministry_id: null,
    ministry_name: null,
    is_active: true,
    created_by: "SYSTEM"
  },
  {
    id: uuidv4(),
    organization_code: "ORG-OTHER",
    organization_name: "Others",
    description: "Other Organizations",
    ministry_id: null,
    ministry_name: null,
    is_active: true,
    created_by: "SYSTEM"
  }
];

export default organizations;
