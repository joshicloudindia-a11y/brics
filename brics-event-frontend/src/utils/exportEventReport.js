/**
 * FINAL EVENT REPORT EXPORT WITH TRAVEL + HOTEL + IMAGE
 * XLSX using ExcelJS (Production Ready)
 */

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { formatDateWithOrdinal } from "./formatDateWithOrdinal";

/* ================= IMAGE FETCH ================= */

const fetchImageBuffer = async (url) => {
  if (!url) return null;
  try {
    const res = await fetch(url);
    return await res.arrayBuffer();
  } catch {
    return null;
  }
};

/* ================= HELPERS ================= */

const cap = (t) => (t ? String(t).toUpperCase() : "");

const normalizeEmail = (email) => (email || "").toString().trim().toLowerCase();

const getUserName = (item) => {
  const u = item?.user || item;
  return cap(
    u?.full_name ||
      u?.name ||
      `${u?.first_name || ""} ${u?.last_name || ""}`.trim(),
  );
};

const getUserEmail = (item) => normalizeEmail(item?.user?.email || item?.email);

const getUserMobile = (item) => item?.user?.mobile || item?.mobile || "";

const getSalutation = (item) => {
  const title = item?.user?.title || item?.title || "";
  if (!title) return "";
  return title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
};

/* ================= TRAVEL DETAILS ================= */

const getTravelDetails = (email, list) => {
  const def = {
    country_from: "",
    arrival_flight: "",
    arrival_airport: "",
    arrival_date: "",
    departure_flight: "",
    departure_airport: "",
    departure_date: "",
  };

  if (!email || !Array.isArray(list)) return def;

  const t = list.find(
    (x) => normalizeEmail(x?.user?.email || x?.email) === email,
  );

  if (!t?.travel_details) return def;

  const a = t.travel_details.arrival || {};
  const d = t.travel_details.departure || {};

  return {
    country_from: cap(a.country_from),
    arrival_flight: cap(a.flight_number),
    arrival_airport: cap(a.port_of_entry),
    arrival_date: formatDateWithOrdinal(a.arrival_date),
    departure_flight: cap(d.flight_number),
    departure_airport: cap(d.port_of_exit),
    departure_date: formatDateWithOrdinal(d.departure_date),
  };
};

/* ================= HOTEL DETAILS ================= */

const getHotelDetails = (email, list = []) => {
  const h = list.find((x) => normalizeEmail(x?.email) === email);

  if (!h?.hotel_details) return {};

  return {
    hotel_name: cap(h.hotel_details.hotel_name),
    hotel_city: cap(h.hotel_details.city),
    hotel_state: cap(h.hotel_details.state),
    check_in: formatDateWithOrdinal(h.hotel_details.stay_start_date),
    check_out: formatDateWithOrdinal(h.hotel_details.stay_end_date),
  };
};

/* ================= MAIN EXPORT ================= */

export const downloadEventReport = async (eventData, eventName = "event") => {
  if (!eventData) return;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Event Report");

  /* ================= COLUMNS ================= */

  sheet.columns = [
    { header: "Salutation", key: "salutation", width: 12 },
    { header: "Name", key: "name", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Mobile", key: "mobile", width: 18 },
    { header: "Role", key: "role", width: 18 },

    { header: "Country", key: "country", width: 18 },

    /* Travel */
    { header: "Country From", key: "country_from", width: 18 },
    { header: "Arrival Flight", key: "arrival_flight", width: 16 },
    { header: "Arrival Airport", key: "arrival_airport", width: 18 },
    { header: "Arrival Date", key: "arrival_date", width: 16 },
    { header: "Departure Flight", key: "departure_flight", width: 16 },
    { header: "Departure Airport", key: "departure_airport", width: 18 },
    { header: "Departure Date", key: "departure_date", width: 16 },

    /* Hotel */
    { header: "Hotel Name", key: "hotel_name", width: 25 },
    { header: "Hotel City", key: "hotel_city", width: 18 },
    { header: "Hotel State", key: "hotel_state", width: 18 },
    { header: "Check In Date", key: "check_in", width: 18 },
    { header: "Check Out Date", key: "check_out", width: 18 },

    { header: "Profile Status", key: "profile_status", width: 14 },
    { header: "Photo", key: "photo", width: 15 },
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF000000" },
  };

  let rowIndex = 2;

  /* ================= PUSH ROW ================= */

  const pushRow = async (item) => {
    const user = item?.user || item;
    const email = getUserEmail(item);

    const travel = getTravelDetails(email, eventData.travelDetails);
    const hotel = getHotelDetails(email, eventData.hotelDetails || []);

    const row = sheet.addRow({
      salutation: getSalutation(item),
      name: getUserName(item),
      email,
      mobile: getUserMobile(item),
      role: cap(item?.role_name || item?.role),
      country: cap(user?.country),

      ...getTravelDetails(email, eventData.travelDetails),
      ...getHotelDetails(email, eventData.hotelDetails),

      profile_status: item?.profile_completion?.percentage
        ? `${item.profile_completion.percentage}%`
        : "",

      photo: "",
    });

    row.height = 60;

    /* Embed Image */
    const buffer = await fetchImageBuffer(user?.documents?.photo_url);

    if (buffer) {
      const imageId = workbook.addImage({
        buffer,
        extension: "png",
      });

      sheet.addImage(imageId, {
        tl: { col: sheet.columns.length - 1, row: rowIndex - 1 },
        ext: { width: 60, height: 60 },
      });
    }

    rowIndex++;
  };

  /* ===== Managers ===== */
  for (const m of eventData.eventManagers || []) {
    const mUser = m?.user || m;
    if ((mUser.account_status || '').toString().trim().toLowerCase() === 'active') {
      await pushRow(m);
    }
    for (const d of m.delegates || []) {
      const dUser = d?.user || d;
      if ((dUser.account_status || '').toString().trim().toLowerCase() === 'active') {
        await pushRow(d);
      }
    }
  }

  /* ===== DAOs ===== */
  for (const dao of eventData.daos || []) {
    const daoUser = dao?.user || dao;
    if ((daoUser.account_status || '').toString().trim().toLowerCase() === 'active') {
      await pushRow(dao);
    }
    for (const d of dao.delegates || []) {
      const dUser = d?.user || d;
      if ((dUser.account_status || '').toString().trim().toLowerCase() === 'active') {
        await pushRow(d);
      }
    }
  }

  /* ===== Export ===== */

  const buffer = await workbook.xlsx.writeBuffer();

  saveAs(
    new Blob([buffer]),
    `${eventName.replace(/\s+/g, "-").toLowerCase()}-report.xlsx`,
  );
};
