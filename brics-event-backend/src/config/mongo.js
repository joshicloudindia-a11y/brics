import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      tls: true,
      tlsCAFile: process.env.DOCDB_CA_FILE,
      authMechanism: "SCRAM-SHA-1",
    });

    console.log("MongoDB connected with TLS (DocumentDB)");
  } catch (err) {
    console.error("MongoDB error", err);
    process.exit(1);
  }
};

export default connectMongo;
