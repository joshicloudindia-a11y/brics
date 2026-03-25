import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractRoutes = (content) => {
  const routes = [];
  const re = /router\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    routes.push({ method: m[1], route: m[2] });
  }
  return routes;
};

const hasAuthMiddleware = (content, method, route) => {
  const re = new RegExp(
    `router\\.${method}\\(\\s*["']${esc(route)}["'][\\s\\S]{0,240}?authMiddleware`,
  );
  return re.test(content);
};

const assertRouteSet = (filePath, expected) => {
  const content = read(filePath);
  const actual = extractRoutes(content).map((r) => `${r.method.toUpperCase()} ${r.route}`);
  const want = expected.map((r) => `${r.method.toUpperCase()} ${r.route}`);
  assert.deepEqual(actual, want, `Route list mismatch in ${filePath}`);
};

const assertAuthPolicy = (filePath, policy) => {
  const content = read(filePath);
  for (const p of policy) {
    const ok = hasAuthMiddleware(content, p.method, p.route);
    assert.equal(
      ok,
      p.auth,
      `authMiddleware mismatch in ${filePath} for ${p.method.toUpperCase()} ${p.route}`,
    );
  }
};

test("app mounts all route modules", () => {
  const app = read("src/app.js");
  const expectedMounts = [
    'app.use("/api/auth", authRoutes);',
    'app.use("/api/roles", roleRoutes);',
    'app.use("/api/events", eventRoutes);',
    'app.use("/api/travel", travelRoutes);',
    'app.use("/api/hotel", hotelRoutes);',
    'app.use("/api/hotel-master", hotelMasterRoutes);',
    'app.use("/api/conference/halls", conferenceHallRoutes);',
    'app.use("/api", sessionRoutes);',
    'app.use("/api/speakers", speakerRoutes);',
    'app.use("/api/activities", activityRoutes);',
  ];

  for (const mount of expectedMounts) {
    assert.ok(app.includes(mount), `Missing mount: ${mount}`);
  }
});

test("auth routes contract + auth policy", () => {
  const routes = [
    { method: "post", route: "/login/send-otp" },
    { method: "post", route: "/login/verify-otp" },
    { method: "post", route: "/refresh" },
    { method: "post", route: "/user/create" },
    { method: "put", route: "/user/update-role" },
    { method: "post", route: "/logout" },
    { method: "post", route: "/profile" },
    { method: "get", route: "/details" },
    { method: "put", route: "/update" },
    { method: "put", route: "/users/:userId/update" },
    { method: "post", route: "/events/:eventId/delegates/invite" },
    { method: "post", route: "/events/:eventId/dao" },
    { method: "get", route: "/event/verify/:accreditationId" },
    { method: "post", route: "/:event_id/open/invite/save" },
    { method: "patch", route: "/users/:userId/status" },
    { method: "post", route: "/events/:eventId/bulk-daos" },
    { method: "post", route: "/speakers" },
    { method: "get", route: "/speakers" },
    { method: "get", route: "/speakers/:userId" },
    { method: "patch", route: "/speakers/:userId" },
  ];
  assertRouteSet("src/routes/auth.routes.js", routes);

  const publicRoutes = new Set([
    "post /login/send-otp",
    "post /login/verify-otp",
    "get /event/verify/:accreditationId",
    "post /:event_id/open/invite/save",
  ]);
  assertAuthPolicy(
    "src/routes/auth.routes.js",
    routes.map((r) => ({
      ...r,
      auth: !publicRoutes.has(`${r.method} ${r.route}`),
    })),
  );
});

test("event routes contract + auth policy", () => {
  const routes = [
    { method: "post", route: "/save" },
    { method: "get", route: "/list" },
    { method: "post", route: "/user-event" },
    { method: "get", route: "/user/list" },
    { method: "get", route: "/:eventId" },
    { method: "get", route: "/:eventId/users" },
    { method: "get", route: "/:eventId/delegates-with-inviters" },
    { method: "get", route: "/:eventId/travel-details" },
    { method: "get", route: "/user/all" },
    { method: "get", route: "/admin/event-managers" },
    { method: "post", route: "/admin/event-managers" },
    { method: "get", route: "/admin/dashboard-counts" },
    { method: "get", route: "/manager/my-events" },
    { method: "post", route: "/:eventId/generate-invite-link" },
    { method: "get", route: "/:eventId/validate-invite" },
    { method: "get", route: "/admin/open-invite-registrations" },
    { method: "post", route: "/admin/open-invite-registrations/:userId/status" },
    { method: "get", route: "/:eventId/hotel-details" },
  ];
  assertRouteSet("src/routes/event.routes.js", routes);

  assertAuthPolicy(
    "src/routes/event.routes.js",
    routes.map((r) => ({
      ...r,
      auth: !(r.method === "get" && r.route === "/:eventId/validate-invite"),
    })),
  );
});

test("hotel routes contract + auth policy", () => {
  const routes = [
    { method: "post", route: "/" },
    { method: "get", route: "/list" },
    { method: "get", route: "/event/:eventId" },
    { method: "get", route: "/master" },
  ];
  assertRouteSet("src/routes/hotel.routes.js", routes);
  assertAuthPolicy("src/routes/hotel.routes.js", routes.map((r) => ({ ...r, auth: true })));
});

test("hotel master routes contract + auth policy", () => {
  const routes = [
    { method: "post", route: "/" },
    { method: "get", route: "/" },
    { method: "put", route: "/:id" },
    { method: "delete", route: "/:id" },
  ];
  assertRouteSet("src/routes/hotelmaster.routes.js", routes);
  assertAuthPolicy("src/routes/hotelmaster.routes.js", routes.map((r) => ({ ...r, auth: true })));
});

test("conference hall routes contract + auth policy", () => {
  const routes = [
    { method: "post", route: "/" },
    { method: "post", route: "/bulk" },
    { method: "get", route: "/" },
    { method: "get", route: "/available" },
    { method: "get", route: "/:hallId" },
    { method: "put", route: "/:hallId" },
    { method: "delete", route: "/:hallId" },
    { method: "post", route: "/:hallId/assign" },
    { method: "post", route: "/:hallId/unassign" },
    { method: "get", route: "/event/:eventId" },
  ];
  assertRouteSet("src/routes/conferenceHall.routes.js", routes);
  assertAuthPolicy(
    "src/routes/conferenceHall.routes.js",
    routes.map((r) => ({ ...r, auth: true })),
  );
});

test("role routes contract + auth policy", () => {
  const routes = [
    { method: "post", route: "/" },
    { method: "get", route: "/" },
    { method: "delete", route: "/:id" },
  ];
  assertRouteSet("src/routes/role.routes.js", routes);
  assertAuthPolicy("src/routes/role.routes.js", routes.map((r) => ({ ...r, auth: true })));
});

test("session routes contract + auth policy", () => {
  const routes = [
    { method: "post", route: "/events/:eventId/sessions" },
    { method: "get", route: "/sessions" },
    { method: "get", route: "/events/:eventId/sessions" },
    { method: "get", route: "/sessions/:sessionId" },
    { method: "put", route: "/sessions/:sessionId" },
    { method: "delete", route: "/sessions/:sessionId" },
    { method: "post", route: "/sessions/:sessionId/participants" },
    { method: "get", route: "/sessions/:sessionId/participants" },
    { method: "delete", route: "/sessions/:sessionId/participants/:userId" },
    { method: "post", route: "/sessions/:sessionId/participants/:userId/check-in" },
  ];
  assertRouteSet("src/routes/session.routes.js", routes);
  assertAuthPolicy("src/routes/session.routes.js", routes.map((r) => ({ ...r, auth: true })));
});

test("speaker routes contract + auth policy", () => {
  const routes = [
    { method: "post", route: "/" },
    { method: "get", route: "/" },
    { method: "get", route: "/:speakerId" },
    { method: "put", route: "/:speakerId" },
    { method: "delete", route: "/:speakerId" },
  ];
  assertRouteSet("src/routes/speaker.routes.js", routes);
  assertAuthPolicy("src/routes/speaker.routes.js", routes.map((r) => ({ ...r, auth: true })));
});

test("travel routes contract + auth policy", () => {
  const routes = [
    { method: "post", route: "/" },
    { method: "get", route: "/list" },
    { method: "get", route: "/event/:eventId" },
  ];
  assertRouteSet("src/routes/travel.routes.js", routes);
  assertAuthPolicy("src/routes/travel.routes.js", routes.map((r) => ({ ...r, auth: true })));
});

test("activity routes contract + auth policy", () => {
  const routes = [
    { method: "get", route: "/my-activities" },
    { method: "get", route: "/stats" },
    { method: "get", route: "/:id" },
    { method: "get", route: "/" },
    { method: "delete", route: "/cleanup" },
  ];
  assertRouteSet("src/routes/activity.routes.js", routes);
  assertAuthPolicy("src/routes/activity.routes.js", routes.map((r) => ({ ...r, auth: true })));
});
