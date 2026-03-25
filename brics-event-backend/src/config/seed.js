import Role from "../models/Role.js";
import roles from "../data/roles.js";

import Hotel from "../models/Hotel.js";
import hotels from "../data/hotelMaster.js";

import Ministry from "../models/Ministry.js";
import ministries from "../data/ministries.js";

import Organization from "../models/Organization.js";
import organizations from "../data/organizations.js";


const seedCollection = async (Model, data, name) => {
  const count = await Model.countDocuments();
  if (count === 0) {
    await Model.insertMany(data);
    console.log(`${name} seeded successfully`);
  } else {
    console.log(`${name} already exists`);
  }
};


const seedDatabase = async () => {
  try {
    await seedCollection(Role, roles, "Role Master");
    await seedCollection(Hotel, hotels, "Hotel Master");
    await seedCollection(Ministry, ministries, "Ministry Master");
    await seedCollection(Organization, organizations, "Organization Master");
  } catch (error) {
    console.error("Seeding error:", error);
  }
};


export default seedDatabase;