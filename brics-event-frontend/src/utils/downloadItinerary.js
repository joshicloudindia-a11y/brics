import jsPDF from "jspdf";
import "jspdf-autotable";
import logo from "../assets/images/brics_logo2.png";
import line from "../assets/images/line_bar.png";
import title from "../assets/images/BRICS_INDIA_2026.png";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const getBase64FromImage = (url, scale = 1) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;   // ← 3x the natural width
      canvas.height = img.height * scale; // ← 3x the natural height
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);            // ← scale the drawing context
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png", 1.0));
    };
    img.src = url;
  });

// Format time in 24-hour format (HH:mm) using UTC from ISO string
const formatTime = (dateString) => {
  if (!dateString) return "TBD";
  const match = dateString.match(/T(\d{2}):(\d{2})/);
  if (!match) return "TBD";
  return `${match[1]}:${match[2]}`;
};

const capitalizeWords = (text) =>
  text ? text.replace(/\b\w/g, (c) => c.toUpperCase()) : "";

const formatEventDate = (date) => {
  if (!date) return "DATE TBD";
  return new Date(date)
    .toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
};

const formatDateRange = (start, end) => {
  if (!start || !end) return "Date TBD";
  const opts = { day: "2-digit", month: "short", year: "numeric" };
  return `${new Date(start).toLocaleDateString("en-GB", opts)} - ${new Date(
    end
  ).toLocaleDateString("en-GB", opts)}`;
};

const cleanText = (text) => (text ? text.replace(/[^\x00-\x7F]/g, "") : "");

// ─────────────────────────────────────────────
// Layout constants
// ─────────────────────────────────────────────

const PAGE_L      = 14;
const PAGE_R      = 196;
const PAGE_BOTTOM = 280;
const PAGE_START  = 45;   // y immediately after the header

const TIME_X    = 25;
const CONTENT_X = 75;
const CONTENT_W = PAGE_R - CONTENT_X;

// ─────────────────────────────────────────────
// Height estimators  (mirror the real render exactly)
// ─────────────────────────────────────────────

/** Height of the speakers block: heading + every speaker row */
const estimateSpeakersHeight = (speakers) => {
  if (!speakers?.length) return 0;
  return 2 + 8 + speakers.length * 7; // gap + "Speakers" label + rows
};

/** Height of the agenda block: heading + every agenda row */
const estimateAgendaHeight = (agendas, doc) => {
  if (!agendas?.length) return 0;
  let h = 2 + 8; // gap + "Agenda" label
  doc.setFontSize(12);
  agendas.forEach((agenda) => {
    const agendaTime = `${agenda.start_time || "TBD"} – ${agenda.end_time || "TBD"}`;
    const tw   = doc.getTextWidth(agendaTime) + 6;
    const wrap = doc.splitTextToSize(
      capitalizeWords(agenda.title || ""),
      CONTENT_W - tw - 2
    );
    h += wrap.length * 6;
  });
  return h;
};

/** Height of a full session: time+title + location + description + speakers + agenda + trailing gap */
const estimateSessionHeight = (session, doc) => {
  let h = 0;

  // Time + title
  const timeText = `${formatTime(session.start_datetime)} – ${formatTime(session.end_datetime)}`;
  doc.setFontSize(15);
  const titleWrap = doc.splitTextToSize(
    capitalizeWords(session.name || "Session"),
    CONTENT_W
  );
  h += titleWrap.length * 7 + 6;

  // Location
  doc.setFontSize(12);
  const locLines = doc.splitTextToSize(
    session.location || "Not specified",
    CONTENT_W - 8
  );
  h += locLines.length * 6 + 4;

  // Description
  if (session.description) {
    const desc = doc.splitTextToSize(session.description, CONTENT_W);
    h += desc.length * 6 + 4;
  }

  h += estimateSpeakersHeight(session.speakers);
  h += estimateAgendaHeight(session.agendas, doc);
  h += 8; // gap after session

  return h;
};

/** Height of the event header only (date + title + meta) */
const estimateEventHeaderHeight = (event, doc) => {
  let h = 10; // date line

  doc.setFontSize(20);
  const nameWrap = doc.splitTextToSize(
    capitalizeWords(event.name || "Event"),
    PAGE_R - PAGE_L
  );
  h += nameWrap.length * 8;

  doc.setFontSize(12);
  const meta = `${formatDateRange(event.start_date, event.end_date)} | ${
    event.event_type || "N/A"
  } | ${event.venue || "Venue"} | ${cleanText(event.location) || ""}`;
  const metaWrap = doc.splitTextToSize(meta, PAGE_R - PAGE_L);
  h += metaWrap.length * 6 + 10;

  return h;
};

/** Total height of an entire event (used to try fitting it all on one page) */
const estimateEventHeight = (event, doc) => {
  let h = estimateEventHeaderHeight(event, doc);
  event.sessions?.forEach((s) => { h += estimateSessionHeight(s, doc); });
  h += 10; // divider + gap
  return h;
};

// ─────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────

const downloadItinerary = async (events) => {
  const doc = new jsPDF();

  const [logoBase64, titleBase64, lineBase64] = await Promise.all([
    getBase64FromImage(logo),
    getBase64FromImage(title),
    getBase64FromImage(line),
  ]);

  // Renders the branded header; called once at start and after every addPage()
  const renderHeader = () => {
    doc.addImage(logoBase64, "PNG", PAGE_L, 8, 32, 20);
    doc.addImage(titleBase64, "PNG", 48, 10, 110, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(90, 105, 130);
    doc.text(
      "Building for Resilience, Innovation, Cooperation and Sustainability",
      48,
      27.8
    );
    doc.addImage(lineBase64, "PNG", PAGE_L, 32, PAGE_R - PAGE_L, 1);
  };

  renderHeader();
  let y = PAGE_START;
  let isFirstPage = true;

  /**
   * If `neededHeight` mm does not fit below current y, move to a fresh page.
   * `minY` prevents breaking at the very first line of a new page.
   */
  const ensureFits = (neededHeight, minY = PAGE_START + 1) => {
    if (y + neededHeight > PAGE_BOTTOM && y > minY) {
      doc.addPage();
      isFirstPage = false;  // ← no header on subsequent pages
      y = 15;
    }
  };

  // ─────────────────────────────────────────────
  // Render loop
  // ─────────────────────────────────────────────

  events.forEach((event) => {

    // ── Level 1: try to fit the whole event on one page ──
    ensureFits(estimateEventHeight(event, doc));

    // EVENT DATE
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(33, 64, 154);
    doc.text(formatEventDate(event.start_date), PAGE_L, y);
    y += 10;

    // EVENT TITLE
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    const nameWrap = doc.splitTextToSize(
      capitalizeWords(event.name || "Event"),
      PAGE_R - PAGE_L
    );
    doc.text(nameWrap, PAGE_L, y);
    y += nameWrap.length * 8;

    // EVENT META
    const meta = `${formatDateRange(event.start_date, event.end_date)} | ${
      event.event_type || "N/A"
    } | ${event.venue || "Venue"} | ${cleanText(event.location) || ""}`;
    const FULL_W = PAGE_R - PAGE_L; // 182 mm
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const metaWrap = doc.splitTextToSize(meta, FULL_W);
    doc.text(metaWrap, PAGE_L, y, { maxWidth: FULL_W });
    y += metaWrap.length * 6 + 10;

    // ─────────────────────────────────────────
    // Sessions
    // ─────────────────────────────────────────

    event.sessions?.forEach((session) => {

      // ── Level 2: try to fit the whole session on one page ──
      ensureFits(estimateSessionHeight(session, doc));

      // ── Track session start y for the vertical line ──
      const sessionStartY = y;

      // SESSION TIME + TITLE
      const timeText = `${formatTime(session.start_datetime)} – ${formatTime(session.end_datetime)}`;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(timeText, TIME_X, y);

      // Session title aligned with content
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(0, 0, 0);

      const titleWrap = doc.splitTextToSize(
        capitalizeWords(session.name || "Session"),
        CONTENT_W
      );

      doc.text(titleWrap, CONTENT_X, y);
      y += titleWrap.length * 7 + 6;

      // LOCATION
      const drawLocationPin = (px, py) => {
        doc.setDrawColor(74, 108, 170);
        doc.setFillColor(74, 108, 170);
        doc.setLineWidth(0.1);

        // Outer teardrop — rounded top, pointed bottom
        doc.roundedRect(px + 0.3, py - 3.8, 3, 3, 1.5, 1.5, "FD");

        // White inner circle
        doc.setFillColor(255, 255, 255);
        doc.circle(px + 1.8, py - 2.4, 0.8, "FD");

        // Triangle tip at bottom (pointing down)
        doc.setFillColor(74, 108, 170);
        doc.triangle(
          px + 0.5, py - 1.2,
          px + 3.1, py - 1.2,
          px + 1.8, py + 0.8,
          "FD"
        );
      };

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(74, 108, 170);
      drawLocationPin(CONTENT_X, y);
      const locLines = doc.splitTextToSize(
        session.location || "Not specified",
        CONTENT_W - 8
      );
      doc.text(locLines, CONTENT_X + 7, y);
      y += locLines.length * 6 + 4;

      // DESCRIPTION
      if (session.description) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        const desc = doc.splitTextToSize(session.description, CONTENT_W);
        doc.setTextColor(60, 60, 60);
        doc.text(desc, CONTENT_X, y);
        y += desc.length * 6 + 4;
      }

      // ── Level 3: fit the entire Speakers block on one page ──
      if (session.speakers?.length) {
        ensureFits(estimateSpeakersHeight(session.speakers));

        y += 2;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(80, 80, 80);
        doc.text("Speakers", CONTENT_X, y);
        y += 8;

        session.speakers.forEach((sp) => {
          const spName       = capitalizeWords(sp.user_name || sp.name || "");
          const designation  = capitalizeWords(sp.designation || "");
          const organisation = capitalizeWords(sp.organisation || "");
          const bullet       = "• ";

          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          doc.setTextColor(80, 80, 80);
          const bulletWidth = doc.getTextWidth(bullet);
          doc.text(bullet, CONTENT_X + 2, y);

          doc.setTextColor(74, 108, 170);
          const nameWidth = doc.getTextWidth(spName);
          doc.text(spName, CONTENT_X + 2 + bulletWidth, y);

          doc.setTextColor(80, 80, 80);
          let metaStr = "";
          if (designation && organisation) {
            metaStr = ` \u2013 ${designation} \u00B7 ${organisation}`;
          } else if (designation) {
            metaStr = ` \u2013 ${designation}`;
          } else if (organisation) {
            metaStr = ` \u00B7 ${organisation}`;
          }
          if (metaStr) {
            doc.text(metaStr, CONTENT_X + 2 + bulletWidth + nameWidth, y);
          }
          y += 7;
        });
      }

      // ── Level 4: fit the entire Agenda block on one page ──
      if (session.agendas?.length) {
        ensureFits(estimateAgendaHeight(session.agendas, doc));

        y += 2;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(80, 80, 80);
        doc.text("Agenda", CONTENT_X, y);
        y += 8;

        session.agendas.forEach((agenda) => {
          // Format agenda times in 24-hour format
          const formatAgendaTime = (timeStr) => {
            if (!timeStr) return "TBD";
            const [hours, minutes] = timeStr.split(":").map(Number);
            if (isNaN(hours) || isNaN(minutes)) return "TBD";
            const pad = (n) => n.toString().padStart(2, '0');
            return `${pad(hours)}:${pad(minutes)}`;
          };
          const agendaTime  = `${formatAgendaTime(agenda.start_time)} – ${formatAgendaTime(agenda.end_time)}`;
          const agendaTitle = capitalizeWords(agenda.title || "");

          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          doc.setTextColor(100, 100, 100);
          doc.text(agendaTime, CONTENT_X + 2, y);

          const tw = doc.getTextWidth(agendaTime) + 6;
          doc.setTextColor(80, 80, 80);
          const agendaTitleWrap = doc.splitTextToSize(agendaTitle, CONTENT_W - tw - 2);
          doc.text(agendaTitleWrap, CONTENT_X + 2 + tw, y);
          y += agendaTitleWrap.length * 6;
        });
      }

      // ── Draw vertical blue line spanning full session content ──
      const sessionEndY = y;
      doc.setDrawColor(180, 200, 230);
      doc.setLineWidth(0.8);
      doc.line(TIME_X  - 5, sessionStartY - 4, TIME_X  - 5, sessionEndY);

      y += 8; // gap after session
    });

    // EVENT DIVIDER
    doc.setDrawColor(220, 220, 220);
    doc.line(PAGE_L, y, PAGE_R, y);
    y += 10;
  });

  doc.save("BRICS_Itinerary.pdf");
};

export default downloadItinerary;