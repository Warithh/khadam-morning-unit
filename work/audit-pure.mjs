// Pure extract of core domain logic from index.html for audit (no DOM).
const DAYS = [
  { id: "sat", name: "السبت" }, { id: "sun", name: "الأحد" }, { id: "mon", name: "الاثنين" },
  { id: "tue", name: "الثلاثاء" }, { id: "wed", name: "الأربعاء" }, { id: "thu", name: "الخميس" },
  { id: "fri", name: "الجمعة" }
];
const DAY_NAME = Object.fromEntries(DAYS.map((d) => [d.id, d.name]));

function weekdayId(dateISO) {
  const parts = dateISO.split("-").map(Number);
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date(parts[0], parts[1] - 1, parts[2]).getDay()];
}

function classify(state, dateISO) {
  const day = weekdayId(dateISO);
  const openSites = state.sites.filter((s) => !s.fridayOnly || day === "fri");
  const openIds = new Set(openSites.map((s) => s.id));
  const bySite = new Map(openSites.map((s) => [s.id, []]));
  const rest = [], leave = [], waiting = [], used = new Set();
  state.people.forEach((person) => {
    if (used.has(person.id)) return;
    used.add(person.id);
    if (person.leave) { leave.push(person); return; }
    if (person.rest === day) { rest.push(person); return; }
    if (!person.site || !openIds.has(person.site)) { waiting.push(person); return; }
    bySite.get(person.site).push({ person, zoneId: person.zone || "" });
  });
  return { day, openSites, bySite, rest, leave, waiting };
}

function uniqueRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    if (seen.has(row.person.id)) return false;
    seen.add(row.person.id);
    return true;
  });
}

function workingCount(view) {
  return [...view.bySite.values()].reduce((sum, rows) => sum + uniqueRows(rows).length, 0);
}

// Minimal seed mirror (ids from app)
const state = {
  sites: [
    { id: "s4", title: "4", fridayOnly: false, zones: [{ id: "s4a", label: "a" }] },
    { id: "s10", title: "رابطة", fridayOnly: true, zones: [] },
    { id: "fatima", title: "فاطمة", fridayOnly: false, zones: [] },
    { id: "garage", title: "گراج", fridayOnly: true, zones: [] },
    { id: "murtada", title: "مرتضى", fridayOnly: true, zones: [] }
  ],
  people: [
    { id: "p1", name: "A", rest: "tue", site: "s4", zone: "s4a", note: "", leave: false },
    { id: "p24", name: "حسن عبود", rest: "sat", site: "fatima", zone: "", note: "موقع الغسل", leave: false },
    { id: "p16", name: "مصطفى", rest: "sun", site: "s10", zone: "", note: "", leave: false },
    { id: "px", name: "مجاز", rest: "mon", site: "s4", zone: "", note: "", leave: true },
    { id: "py", name: "بانتظار", rest: "wed", site: "", zone: "", note: "", leave: false }
  ],
  fixedPosts: [{ id: "f1", personId: "p24", siteId: "fatima", zoneId: "", label: "موقع الغسل" }]
};

const checks = [];
function assert(name, cond, detail) {
  checks.push({ name, ok: !!cond, detail: detail ?? "" });
}

assert("weekday_mon", weekdayId("2026-11-23") === "mon");
assert("weekday_fri", weekdayId("2026-11-27") === "fri");

const mon = classify(state, "2026-11-23");
assert("mon_is_mon", mon.day === "mon");
assert("fri_only_hidden_mon", !mon.openSites.some((s) => s.fridayOnly));
assert("hassan_working_mon", mon.bySite.get("fatima")?.some((r) => r.person.id === "p24"));
assert("leave_out", mon.leave.length === 1 && mon.leave[0].id === "px");
assert("waiting_empty_site", mon.waiting.some((p) => p.id === "py"));
assert("s10_person_waiting_mon", mon.waiting.some((p) => p.id === "p16"));

const fri = classify(state, "2026-11-27");
assert("fri_opens_friday_only", fri.openSites.filter((s) => s.fridayOnly).length === 3);
assert("s10_working_fri", fri.bySite.get("s10")?.some((r) => r.person.id === "p16"));

// rest day: p1 rests tue
const tue = classify(state, "2026-11-24");
assert("rest_excluded", tue.rest.some((p) => p.id === "p1") && !(tue.bySite.get("s4") || []).some((r) => r.person.id === "p1"));

// duplicate person id should only count once
const dup = {
  ...state,
  people: [...state.people, { ...state.people[0], name: "A2" }]
};
const dview = classify(dup, "2026-11-23");
assert("dedupe_by_id", workingCount(dview) === workingCount(mon));

// fixedPosts do NOT affect classify today — only UI lock; person.site is source of truth
assert("fixed_is_ui_only", true);

function migrateHassanFixed(data) {
  if (!Array.isArray(data.fixedPosts)) data.fixedPosts = [];
  const hassan = data.people.find((p) => p.name.trim() === "حسن عبود");
  if (!hassan || !/غسل/.test(hassan.note || "")) return false;
  if (data.fixedPosts.some((f) => f.personId === hassan.id)) return false;
  data.fixedPosts.push({ id: "f1", personId: hassan.id, siteId: hassan.site || "fatima", zoneId: "", label: "موقع الغسل" });
  return true;
}
function migrateOnce(saved) {
  saved.meta = saved.meta || {};
  if (!Array.isArray(saved.fixedPosts)) saved.fixedPosts = [];
  if (!saved.meta.fixedMigrated) {
    migrateHassanFixed(saved);
    saved.meta.fixedMigrated = true;
  }
  return saved;
}
const emptyOnce = migrateOnce({ people: state.people, sites: state.sites, fixedPosts: [] });
assert("empty_array_migrates_once", emptyOnce.fixedPosts.length === 1 && emptyOnce.meta.fixedMigrated === true);

const clearedAfter = migrateOnce({
  people: state.people,
  sites: state.sites,
  fixedPosts: [],
  meta: { fixedMigrated: true }
});
assert("after_flag_empty_stays", clearedAfter.fixedPosts.length === 0, "بعد الترحيل لا نعيد فرض التثبيت");

const missingKey = migrateOnce({ people: state.people, sites: state.sites });
assert("missing_key_migrates", missingKey.fixedPosts.length === 1);

const failed = checks.filter((c) => !c.ok);
console.log(JSON.stringify({ total: checks.length, failed: failed.length, checks }, null, 2));
process.exit(failed.length ? 1 : 0);
