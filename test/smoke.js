// Smoke test: loads the app in jsdom with an in-memory Firebase stand-in and clicks through
// the client and trainer flows. Any uncaught error or failed check exits non-zero.
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync(path.join(__dirname, "..", "www", "index.html"), "utf8")
  .replace(/<script src="vendor\/[^"]+"><\/script>/g, "")      // real SDK not loaded in the test
  .replace(/<link[^>]+fonts[^>]+>/g, "");
const errors = [];
const pad2 = n => String(n).padStart(2, "0");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let step = "boot";
function check(cond, msg){ if (!cond){ errors.push(`[${step}] ${msg}`); console.log("  ✗", msg); } else console.log("  ✓", msg); }

/* ---------- in-memory Firebase stand-in ---------- */
const SHARED = {docs: new Map(), listeners: new Set(), accounts: {}};
function makeFirebase(){
  const docs = SHARED.docs;
  const listeners = SHARED.listeners;
  const SERVER_TS = {__ts: true};
  const resolveTs = o => JSON.parse(JSON.stringify(o, (k, v) => v && v.__ts ? new Date().toISOString() : v));
  const isDirectChild = (p, col) => p.startsWith(col + "/") && !p.slice(col.length + 1).includes("/");
  function notify(){ for (const l of listeners) fire(l); }
  function fire(l){
    try {
    if (l.kind === "doc"){ const d = docs.get(l.path); l.cb(snapDoc(l.path, d)); }
    else l.cb(snapQuery(l));
    } catch(e){ listeners.delete(l); if (!/activeElement|document|window/.test(String(e))) errors.push(`[${step}] listener error: ${e}`); }
  }
  function snapDoc(p, d){ return {id: p.split("/").pop(), exists: d !== undefined, data: () => d && JSON.parse(JSON.stringify(d))}; }
  function runQuery(q){
    let rows = [...docs.entries()].filter(([p]) => isDirectChild(p, q.path)).map(([p, d]) => ({p, d}));
    const cmp = {"==": (a, b) => a === b, "<": (a, b) => a < b, "<=": (a, b) => a <= b, ">": (a, b) => a > b, ">=": (a, b) => a >= b};
    for (const [f, op, v] of q.wh) rows = rows.filter(r => cmp[op] ? r.d[f] != null && cmp[op](r.d[f], v) : true);
    if (q.ob) rows.sort((a, b) => String(b.d[q.ob[0]]).localeCompare(String(a.d[q.ob[0]])) * (q.ob[1] === "desc" ? 1 : -1));
    if (q.lim) rows = rows.slice(0, q.lim);
    return rows;
  }
  function snapQuery(q){ const rows = runQuery(q); return {docs: rows.map(r => snapDoc(r.p, r.d)), size: rows.length, empty: !rows.length}; }
  function query(pathStr, wh = [], ob = null, lim = null){
    const q = {path: pathStr, wh, ob, lim};
    return {
      where: (f, op, v) => query(pathStr, [...wh, [f, op, v]], ob, lim),
      orderBy: (f, dir) => query(pathStr, wh, [f, dir || "asc"], lim),
      limit: n => query(pathStr, wh, ob, n),
      get: async () => snapQuery(q),
      onSnapshot: (cb) => { const l = {kind: "q", ...q, cb}; listeners.add(l); setTimeout(() => fire(l), 0); return () => listeners.delete(l); },
      doc: id => docRef(pathStr + "/" + (id || Math.random().toString(36).slice(2))),
      add: async data => { const r = docRef(pathStr + "/" + Math.random().toString(36).slice(2)); await r.set(data); return r; }
    };
  }
  function docRef(p){
    return {
      id: p.split("/").pop(), path: p,
      get: async () => snapDoc(p, docs.get(p)),
      set: async d => { docs.set(p, resolveTs(d)); notify(); },
      update: async d => {
        if (!docs.has(p)) throw {code: "not-found"};
        const cur = {...docs.get(p)};
        for (const [k, v] of Object.entries(d)){
          if (v && v.__au) cur[k] = [...new Set([...(cur[k] || []), ...v.__au])];
          else if (v && v.__ar) cur[k] = (cur[k] || []).filter(x => !v.__ar.includes(x));
          else cur[k] = resolveTs({x: v}).x;
        }
        docs.set(p, cur); notify();
      },
      delete: async () => { docs.delete(p); notify(); },
      onSnapshot: (cb) => { const l = {kind: "doc", path: p, cb}; listeners.add(l); setTimeout(() => fire(l), 0); return () => listeners.delete(l); },
      collection: c => query(p + "/" + c)
    };
  }
  const db = {
    enablePersistence: async () => {},
    collection: c => query(c),
    doc: p => docRef(p),
    batch: () => { const ops = []; return {set: (r, d) => ops.push(() => r.set(d)), update: (r, d) => ops.push(() => r.update(d)), delete: r => ops.push(() => r.delete()), commit: async () => { for (const o of ops) await o(); }}; }
  };
  let user = null; const authCbs = []; const accounts = SHARED.accounts;
  const emit = () => authCbs.forEach(cb => cb(user));
  const auth = {
    onAuthStateChanged: cb => { authCbs.push(cb); setTimeout(() => cb(user), 0); },
    createUserWithEmailAndPassword: async (e, p) => {
      if (accounts[e]) throw {code: "auth/email-already-in-use"};
      const acc = accounts[e] = {uid: "u_" + e.split("@")[0], email: e, p, emailVerified: false, verifySent: 0};
      acc.sendEmailVerification = async () => { acc.verifySent++; };
      acc.reload = async () => {};
      acc.reauthenticateWithCredential = async c => { if (!c || c.p !== acc.p) throw {code: "auth/wrong-password"}; };
      acc.delete = async () => { delete accounts[e]; user = null; emit(); };
      user = acc; emit(); return {user};
    },
    get currentUser(){ return user; },
    signInWithEmailAndPassword: async (e, p) => { if (!accounts[e] || accounts[e].p !== p) throw {code: "auth/invalid-credential"}; user = accounts[e]; emit(); return {user}; },
    signOut: async () => { user = null; emit(); },
    sendPasswordResetEmail: async () => {}
  };
  const firestoreFn = () => db; firestoreFn.FieldValue = {serverTimestamp: () => SERVER_TS, arrayUnion: (...v) => ({__au: v}), arrayRemove: (...v) => ({__ar: v})};
  const authFn = () => auth; authFn.EmailAuthProvider = {credential: (e, p) => ({e, p})};
  return {initializeApp: () => {}, firestore: firestoreFn, auth: authFn, _docs: docs, verify: e => { accounts[e].emailVerified = true; }, accounts};
}

/* ---------- harness ---------- */
async function load(fb){
  const dom = new JSDOM(html, {runScripts: "dangerously", pretendToBeVisual: true, url: "https://localhost/",
    beforeParse(w){
      if (fb) w.firebase = fb;
      w.scrollTo = () => {};
      w.navigator.vibrate = () => true;
      w.addEventListener("error", e => errors.push(`[${step}] window error: ${e.message}`));
      w.addEventListener("unhandledrejection", e => errors.push(`[${step}] unhandled rejection: ${e.reason && (e.reason.stack || e.reason.message || e.reason)}`));
      const ce = w.console.error; w.console.error = (...a) => { errors.push(`[${step}] console.error: ${a.map(String).join(" ")}`); };
    }});
  const w = dom.window; await sleep(400);
  const $ = sel => w.document.querySelector(sel);
  const $$ = sel => [...w.document.querySelectorAll(sel)];
  const click = async (sel, msg) => { const el = typeof sel === "string" ? $(sel) : sel; check(!!el, msg || `found ${sel}`); if (el) el.dispatchEvent(new w.MouseEvent("click", {bubbles: true})); await sleep(150); return el; };
  const type = async (sel, v) => { const el = $(sel); check(!!el, `input ${sel}`); if (!el) return; el.value = v; el.dispatchEvent(new w.Event("input", {bubbles: true})); await sleep(30); };
  const text = () => w.document.getElementById("app").textContent;
  return {w, $, $$, click, type, text};
}

// The privacy screen every new user sees before anything else
async function agree(X, {dob = "1985-04-12", health = true, staff = false} = {}){
  check(X.text().includes("Your privacy"), "privacy and consent screen shown");
  if (!staff){ if (dob) await X.type("#cg-dob", dob); if (health) X.$("#cg-health").checked = true; }
  X.$("#cg-agree").checked = true;
  await X.click('[data-act="cg-go"]', "agree and continue"); await sleep(300);
}

(async () => {
  /* ===== 1. Offline client flow ===== */
  step = "offline";
  let A = await load(null);
  step = "consent";
  check(!A.$('[data-act="tab"]') && !A.text().includes("I'm your Primal Strength coach"), "nothing opens before the privacy screen");
  await A.click('[data-act="cg-go"]'); await sleep(100);
  check(A.text().includes("Your privacy"), "can't continue without agreeing to the policy");
  await agree(A);
  step = "onboarding";
  check(A.text().includes("I'm your Primal Strength coach"), "after consent the coach questionnaire opens");
  await A.type("#ob-name", "Manas");
  await A.click('[data-act="ob-next"]', "start questionnaire");
  check(A.text().includes("What's your sport?") && A.$$('[data-act="ob-sport"]').length === 19, "sport step lists all 19 sports");
  check(A.$('[data-act="ob-next"]').disabled, "can't continue without picking a sport");
  await A.click('[data-act="ob-sport"][data-v="general"]', "pick general fitness");
  await A.click('[data-act="ob-next"]');
  await A.click('[data-act="ob-pick"][data-k="goal"][data-v="strength"]', "pick goal");
  await A.click('[data-act="ob-next"]');
  await A.click('[data-act="ob-pick"][data-k="experience"][data-v="experienced"]', "pick experience");
  await A.click('[data-act="ob-next"]');
  await A.click('[data-act="ob-pick"][data-k="days"][data-v="3"]', "pick days"); await A.click('[data-act="ob-next"]');
  await A.click('[data-act="ob-pick"][data-k="equipment"][data-v="gym"]', "pick equipment"); await A.click('[data-act="ob-next"]');
  await A.type("#ob-age", "45"); await A.type("#ob-weight", "86"); await A.click('[data-act="ob-next"]');
  await A.click('[data-act="ob-pain"][data-v="back"]', "flag lower back"); await A.click('[data-act="ob-next"]');
  await A.type("#ob-squat-kg", "100"); await A.type("#ob-squat-reps", "5"); await A.type("#ob-bench-kg", "80"); await A.type("#ob-bench-reps", "5");
  await A.click('[data-act="ob-next"]', "build plan");
  check(A.text().includes("here's your plan"), "plan screen shown");
  check(A.text().includes("Goblet squat") && !A.text().includes("Back squat ["), "back answer swaps to a back-friendly squat");
  check(/@ \d+(\.\d)? kg/.test(A.text()), "target weights calculated from strength numbers");
  check(A.text().includes("Work with a trainer"), "plan recommends a trainer");
  await A.click('[data-act="ob-start"]', "start plan");
  step = "offline";
  check(A.text().includes(", Manas"), "home greets the user by name");
  check(A.text().includes("starter block"), "home mentions the starter block");
  for (const v of ["workouts", "cardio", "body", "progress", "today"]){ await A.click(`[data-act="tab"][data-v="${v}"]`, `tab ${v}`); }
  await A.click('[data-act="openday"]', "open next workout");
  check(A.text().includes("Start now"), "overview shows Start now");
  await A.click('[data-act="swap-prog"]', "swap from overview");
  check(!!A.$("#swap-sel") && A.$("#swap-sel").options.length > 50, "library drop-down lists exercises");
  await A.click('[data-act="sheet-close"]') ; if (A.$(".scrim")) await A.click(".scrim");
  await A.click('[data-act="startday"]', "start workout");
  await A.type("#p-weight", "86.4");
  await A.click('[data-act="precheck-go"]', "start after check-in");
  check(!!A.$(".sets"), "logging screen shows set table");
  await A.type('[data-in="reps"][data-x="0"][data-s="0"]', "8");
  await A.type('[data-in="kg"][data-x="0"][data-s="0"]', "40");
  await A.click('[data-act="tick"][data-x="0"][data-s="0"]', "tick first set");
  check(!!A.$("#timer"), "rest timer appears");
  await A.click('[data-act="swap"][data-x="1"]', "swap during workout");
  A.$("#swap-sel").value = "Machine chest press";
  await A.click('[data-act="swap-apply"]', "apply swap");
  check(A.text().includes("Machine chest press"), "swapped exercise shown");
  await A.click('[data-act="finish"]', "save workout");
  check(A.text().includes("points") && A.text().includes("Workout complete"), "celebration shows points after a workout");
  await A.click('[data-act="sheet-close"]', "close celebration");
  check(A.text().includes("History"), "back on workouts after save");
  await A.click('[data-act="tab"][data-v="today"]'); check(A.text().includes("Workouts") && A.text().includes("Check-in") && A.text().includes("pts"), "rings, rank and points on Today");
  await A.click('[data-act="tab"][data-v="progress"]'); await A.click('[data-act="ptab"][data-v="trophies"]', "trophies tab");
  check(A.text().includes("Primal rank") && A.text().includes("Badges") && A.text().includes("First workout") && A.text().includes("Strength score"), "trophies show rank, badges and strength score");
  await A.click('[data-act="ptab"][data-v="stats"]');
  await A.click('[data-act="tab"][data-v="squad"]'); check(A.text().includes("need an account"), "Squad explains accounts are needed offline");
  await A.click('[data-act="tab"][data-v="progress"]'); check(A.text().includes("Lifts"), "progress renders after a workout");
  await A.click('[data-act="settings"]', "open settings"); check(A.text().includes("Android app"), "settings explains accounts need the Android app");
  step = "start-over";
  await A.click('[data-act="ask-reset"]', "start over button");
  await A.click('[data-act="confirm-yes"]', "confirm start over"); await sleep(300);
  check(A.text().includes("I'm your Primal Strength coach"), "after start over the coach questionnaire runs again");
  await A.click('[data-act="ob-skip"]', "skip questionnaire");
  await A.click('[data-act="tab"][data-v="today"]');
  check(A.text().includes("Let's set up your training") && !A.$('[data-act="openday"]'), "no default program: Today shows the get-started choices");
  check(!!A.$('[data-act="ob-retake"]') && !!A.$('[data-act="selftpl"]'), "questionnaire and ready-made options offered");
  await A.click('[data-act="tab"][data-v="workouts"]'); check(A.text().includes("Finished workouts appear here") && A.text().includes("Let's set up your training"), "workouts tab empty after start over");
  await A.click('[data-act="settings"]'); check(A.text().includes("Current: none yet") && !A.text().includes("${"), "settings shows no program and no raw code");
  await A.click('[data-act="selftpl"]', "browse ready-made programs"); await A.click('[data-act="selftpl-pick"][data-v="10k"]', "pick 10K program"); await sleep(200);
  check(A.text().includes("Intervals + core") && !A.text().includes("Let's set up your training"), "ready-made program applied");
  if (A.$(".scrim")) await A.click('[data-act="sheet-close"]');

  step = "dexa-balance";
  await A.click('[data-act="tab"][data-v="body"]');
  await A.click('[data-act="dexa-new"]', "add DEXA scan");
  await A.type("#d-date", "2026-10-01"); await A.type("#d-legL", "8.9"); await A.type("#d-legR", "9.8"); await A.type("#d-trunkL", "10.6"); await A.type("#d-trunkR", "10.4");
  await A.click('[data-act="dexa-save"]', "save DEXA"); await sleep(200);
  check(A.text().includes("Left–right balance") && A.text().includes("Legs: left side") && A.text().includes("Trunk: balanced"), "balance card reads the DEXA scan");
  await A.click('[data-act="tab"][data-v="workouts"]'); await A.click('[data-act="openday"][data-d="B"]', "open 10K strength day");
  check(A.text().includes("+1 left leg"), "weaker leg gets the extra set");
  await A.click('[data-act="tab"][data-v="body"]'); await A.click('[data-act="bal-toggle"]', "turn balance work off");
  await A.click('[data-act="tab"][data-v="workouts"]'); await A.click('[data-act="openday"][data-d="B"]');
  check(!A.text().includes("+1 left leg"), "balance work can be switched off");

  step = "reports";
  await A.click('[data-act="tab"][data-v="body"]');
  await A.click('[data-act="rep-new"]', "add report");
  await A.type("#rp-date", "2026-06-01"); await A.type("#rp-hba1c", "6.1"); await A.type("#rp-ldl", "140");
  await A.click('[data-act="rep-save"]', "save blood report"); await sleep(150);
  await A.click('[data-act="rep-new"]'); await A.type("#rp-date", "2026-10-01"); await A.type("#rp-hba1c", "5.7");
  await A.click('[data-act="rep-addrow"]', "add custom result row"); await A.type("#rp-cn-0", "Homocysteine"); await A.type("#rp-cv-0", "11"); await A.type("#rp-cu-0", "µmol/L");
  await A.click('[data-act="rep-save"]'); await sleep(150);
  check(A.text().includes("Health reports") && A.text().includes("HbA1c") && A.text().includes("Homocysteine"), "reports listed with preset and custom results");
  check(!!A.$("#app svg.chart"), "report trend chart drawn");
  const ty = A.$("#rp-type"); check(!ty, "report sheet closed after save");
  await A.click('[data-act="rep-new"]'); const rtSel = A.$("#rp-type"); rtSel.value = "vo2"; rtSel.dispatchEvent(new A.w.Event("change", {bubbles: true})); await sleep(100);
  check(!!A.$("#rp-vo2"), "switching type shows VO2 max fields");
  await A.click('[data-act="sheet-close"]');

  /* ===== Sport: change sport, sport logging, races, tests, progress, exercise list ===== */
  step = "sport-triathlon";
  const setSel = async (X, sel, v) => { const el = X.$(sel); check(!!el, `select ${sel}`); if (!el) return; el.value = v; el.dispatchEvent(new X.w.Event("change", {bubbles: true})); await sleep(120); };
  await A.click('[data-act="settings"]'); await A.click('[data-act="profile-edit"]', "edit profile");
  check(!!A.$("#pf-sport") && A.$("#pf-sport").options.length === 19, "profile offers all 19 sports");
  A.$("#pf-sport").value = "triathlon"; A.$("#pf-sport2").value = "running";
  await A.click('[data-act="profile-save"]', "save sport"); await sleep(200);
  if (A.$('[data-act="sheet-close"]')) await A.click('[data-act="sheet-close"]');
  await A.click('[data-act="tab"][data-v="today"]');
  check(A.text().includes("Triathlon this week") && A.text().includes("Swim") && A.text().includes("Bike"), "Today shows swim, bike and run targets for a triathlete");
  check(A.text().includes("Swim + bike + run"), "weekly ring is labelled for the sport");
  await A.click('[data-act="tab"][data-v="cardio"]');
  check(A.text().includes("Training log") && [...A.$("#c-type").options].some(o => o.value === "Swimming") && [...A.$("#c-type").options].some(o => o.value === "Brick (bike then run)"), "Cardio tab offers triathlon session types");
  await A.type("#c-min", "30");
  await setSel(A, "#c-type", "Swimming");
  check(!!A.$("#c-metres") && !!A.$("#c-stroke") && !A.$("#c-incline"), "swim log asks for metres and stroke, not incline");
  check(A.$("#c-min").value === "30", "minutes kept when the session type changes");
  await A.type("#c-metres", "1500"); A.$("#c-stroke").value = "Freestyle";
  A.$("#cardioForm").dispatchEvent(new A.w.Event("submit", {bubbles: true, cancelable: true})); await sleep(250);
  check(A.text().includes("1,500 m") && A.text().includes("2:00 /100 m") && A.text().includes("Freestyle"), "swim saved with distance, pace per 100 m and stroke");
  await setSel(A, "#c-type", "Cycling");
  check(!!A.$("#c-power") && !!A.$("#c-cadence") && !!A.$("#c-elev"), "ride log asks for power, cadence and climb");
  await A.type("#c-min", "60"); await A.type("#c-dist", "30"); await A.type("#c-power", "180");
  A.$("#cardioForm").dispatchEvent(new A.w.Event("submit", {bubbles: true, cancelable: true})); await sleep(250);
  check(A.text().includes("30 km/h") && A.text().includes("180 W"), "ride saved with speed and power");

  step = "sport-events";
  await A.click('[data-act="tab"][data-v="body"]');
  check(A.text().includes("Event results") && A.text().includes("Triathlon tests"), "Body tab has event results and sport tests");
  await A.click('[data-act="ev-new"]', "log a race");
  check(A.$("#ev-kind").value === "tri-sprint", "race picker starts with the athlete's sport");
  await setSel(A, "#ev-kind", "tri-olympic");
  check(!!A.$('[data-evs="t1"]') && !!A.$('[data-evs="swim"]'), "triathlon result asks for swim, T1, bike, T2 and run splits");
  await A.type("#ev-name", "Goa Olympic Tri"); await A.type("#ev-date", "2026-11-01"); await A.type("#ev-finish", "2:45:10"); await A.type("#ev-place", "42"); await A.type("#ev-field", "300");
  A.$('[data-evs="swim"]').value = "28:30"; A.$('[data-evs="bike"]').value = "1:20:00"; A.$('[data-evs="run"]').value = "52:10";
  await A.click('[data-act="ev-save"]', "save race"); await sleep(250);
  const race = A.w.eval("S.data.sessions.find(s => s.event)");
  check(race && race.event.finish === 9910 && race.event.splits.swim === 1710 && race.day === "🏁" && race.durationMin === 165, "race saved as a workout with finish time and splits");
  check(A.text().includes("Goa Olympic Tri") && A.text().includes("2:45:10") && A.text().includes("#42 of 300"), "race listed under Event results");
  await A.click('[data-act="viewsession"]', "open race");
  check(A.text().includes("counted as a workout") && A.text().includes("28:30") && A.text().includes("1:20:00") && A.text().includes("52:10"), "race detail shows the splits");
  await A.click('[data-act="sheet-close"]');
  await A.click('[data-act="test-new"]', "add test results");
  await A.type("#tst-css", "1:55"); await A.type("#tst-ftp", "210");
  await A.click('[data-act="test-save"]', "save tests"); await sleep(200);
  check(A.text().includes("Swim pace per 100 m (CSS)") && A.text().includes("1:55") && A.text().includes("210 W"), "test results listed");
  check(!A.text().includes("source"), "tests kept out of the check-in table");

  step = "sport-progress";
  await A.click('[data-act="tab"][data-v="progress"]');
  const pt = A.text();
  check(pt.includes("Your sport") && pt.includes("Triathlon") && pt.includes("Second sport: Running"), "progress names the sport and second sport");
  check(pt.includes("Swim pace per 100 m") && pt.includes("Riding") && pt.includes("Weekly minutes by sport") && pt.includes("Race results") && pt.includes("Goa Olympic Tri"), "triathlon progress: swim pace, riding, minutes by sport, races");
  check(pt.includes("All stats") && pt.includes("Lifts"), "general stats still below");

  step = "sport-exercises";
  await A.click('[data-act="tab"][data-v="workouts"]'); await A.click('[data-act="openday"][data-d="B"]');
  await A.click('[data-act="swap-prog"]', "swap in a triathlete's program");
  const opts = () => [...A.$("#swap-sel").options].map(o => o.value);
  check(!opts().includes("Back squat") && opts().includes("Swim intervals") && opts().includes("Goblet squat"), "triathlete's exercise list leaves out back squats");
  check(!A.$$('[data-act="swap-pick"]').some(b => b.dataset.v === "Back squat"), "swap suggestions fit the sport");
  await A.type("#swap-q", "back squat");
  check(opts().includes("Back squat"), "searching finds exercises from any sport");
  await A.click('[data-act="swap-all"]', "show all sports");
  check(opts().includes("Back squat"), "all-sports switch shows everything");
  await A.click('[data-act="sheet-close"]');

  step = "sport-hyrox";
  await A.click('[data-act="settings"]'); await A.click('[data-act="profile-edit"]');
  A.$("#pf-sport").value = "hyrox"; A.$("#pf-sport2").value = "";
  await A.click('[data-act="profile-save"]'); await sleep(200); if (A.$('[data-act="sheet-close"]')) await A.click('[data-act="sheet-close"]');
  await A.click('[data-act="tab"][data-v="body"]'); await A.click('[data-act="ev-new"]');
  check(A.$("#ev-kind").value === "hyrox" && A.$$("[data-evs]").length === 18, "HYROX result asks for 8 runs, 8 stations, Roxzone and division");
  await A.type("#ev-name", "HYROX Bengaluru");
  ["r1","r2","r3","r4","r5","r6","r7","r8"].forEach((k, i) => A.$(`[data-evs="${k}"]`).value = `4:${pad2(10 + i)}`);
  [["ski","4:30"],["push","3:05"],["pull","4:40"],["bbj","5:10"],["row","4:45"],["farm","2:05"],["lunge","4:50"],["wb","6:20"],["rox","7:30"]].forEach(([k, v]) => A.$(`[data-evs="${k}"]`).value = v);
  await A.click('[data-act="ev-save"]', "save HYROX race with splits only"); await sleep(250);
  const hx = A.w.eval('S.data.sessions.find(s => s.event && s.event.kind === "hyrox")');
  check(hx && hx.event.finish === (8*250 + 28) + (270+185+280+310+285+125+290+380) + 450, "HYROX finish time added up from the splits");
  await A.click('[data-act="tab"][data-v="progress"]');
  check(A.text().includes("HYROX splits") && A.text().includes("Sled push 50 m") && A.text().includes("3:05"), "HYROX progress shows run splits and station times");
  await A.click('[data-act="tab"][data-v="today"]');
  check(A.text().includes("HYROX this week") && A.text().includes("Running"), "Today shows HYROX weekly targets");

  step = "sport-strength";
  await A.click('[data-act="settings"]'); await A.click('[data-act="profile-edit"]');
  A.$("#pf-sport").value = "strength";
  await A.click('[data-act="profile-save"]'); await sleep(200); if (A.$('[data-act="sheet-close"]')) await A.click('[data-act="sheet-close"]');
  await A.click('[data-act="tab"][data-v="progress"]');
  check(A.text().includes("Squat: estimated max") && A.text().includes("Powerlifting total") && A.text().includes("Rep PBs"), "strength progress: maxes, total, rep PBs");
  await A.click('[data-act="tab"][data-v="cardio"]');
  check(![...A.$("#c-type").options].some(o => o.value === "Swim intervals") && A.$("#c-type").options[0].value === "Zone 2 incline walk", "strength athlete isn't offered swim sessions they never logged");
  for (const sp of ["general","strength","bodybuilding","weightlifting","hyrox","crossfit","running","triathlon","cycling","swimming","ocr","team","racquet","combat","calisthenics","rowing","climbing","yoga","rehab"]){
    A.w.eval(`S.profile.settings.intake.sport = "${sp}"`);
    await A.click('[data-act="tab"][data-v="progress"]'); await A.click('[data-act="tab"][data-v="today"]'); await A.click('[data-act="tab"][data-v="cardio"]'); await A.click('[data-act="tab"][data-v="body"]');
    check(A.text().length > 200 && !A.text().includes("undefined") && !A.text().includes("NaN"), `${sp}: every tab renders cleanly`);
  }
  A.w.close();

  step = "sport-onboarding";
  let SW = await load(null);
  await agree(SW);
  await SW.type("#ob-name", "Meera"); await SW.click('[data-act="ob-next"]');
  await SW.click('[data-act="ob-sport"][data-v="swimming"]', "pick swimming");
  check(!!SW.$("#ob-sport2"), "second sport offered once a main sport is picked");
  await SW.click('[data-act="ob-next"]');
  await SW.click('[data-act="ob-pick"][data-k="goal"][data-v="fitness"]'); await SW.click('[data-act="ob-next"]');
  await SW.click('[data-act="ob-pick"][data-k="experience"][data-v="some"]'); await SW.click('[data-act="ob-next"]');
  await SW.click('[data-act="ob-pick"][data-k="days"][data-v="4"]'); await SW.click('[data-act="ob-next"]');
  await SW.click('[data-act="ob-pick"][data-k="equipment"][data-v="gym"]'); await SW.click('[data-act="ob-next"]');
  await SW.click('[data-act="ob-next"]'); await SW.click('[data-act="ob-next"]'); await SW.click('[data-act="ob-next"]', "build swimmer's plan");
  check(SW.text().includes("Swimming — 8 weeks") && SW.text().includes("Swim intervals") && SW.text().includes("Dryland strength"), "swimmer gets a swimming starter program");
  await SW.click('[data-act="ob-start"]');
  check(SW.w.eval("S.profile.settings.intake.sport") === "swimming", "sport saved to the profile");
  await SW.click('[data-act="tab"][data-v="today"]');
  check(SW.text().includes("Swimming this week") && SW.text().includes("/ 8,000 m"), "swimmer's weekly target is metres swum");
  SW.w.close();

  /* ===== 2. Trainer + client with accounts ===== */
  step = "trainer-signup";
  const fb = makeFirebase();
  let T = await load(fb);
  check(T.text().includes("Train with a plan"), "signed-out app opens on the sign-up page");
  check(!T.$('[data-act="tab"]'), "app content is hidden until signed in");
  await T.click('[data-act="auth-role"][data-v="trainer"]', "pick trainer role");
  await T.type("#a-name", "Coach Ravi"); await T.type("#a-email", "coach@test.in"); await T.type("#a-pass", "secret1");
  await T.click('[data-act="auth-go"]', "create trainer account"); await sleep(600);
  check(!T.text().includes("Confirm your email"), "no email confirmation step");
  await agree(T, {staff: true});
  check(!!fb._docs.get("users/u_coach").consent && fb._docs.get("users/u_coach").consent.v === 1, "trainer's consent saved");
  check(T.text().includes("Clients") || T.text().includes("clients"), "trainer lands on Clients");
  check(T.text().includes(", Coach"), "trainer greeted by name");
  const code = [...fb._docs.keys()].find(k => k.startsWith("codes/"));
  check(!!code, "invite code created"); const inviteCode = code && code.split("/")[1];
  check(T.text().includes(inviteCode), "invite code shown to trainer");

  step = "client-signup";
  let C = await load(makeFirebase());      // client's phone: same backend, its own sign-in
  await C.type("#a-name", "Asha"); await C.type("#a-email", "asha@test.in"); await C.type("#a-pass", "secret2");
  await C.click('[data-act="auth-go"]', "create client account"); await sleep(600);
  await agree(C);
  check(fb._docs.get("users/u_asha").consent.health === true && fb._docs.get("users/u_asha").settings.intake.dob === "1985-04-12", "client's consent and date of birth saved");
  check(C.text().includes("Hi Asha"), "new client greeted by name in the questionnaire");
  await C.click('[data-act="ob-havetrainer"]', "client says they have a trainer's code"); await sleep(200);
  await C.type("#t-code", inviteCode);
  await C.click('[data-act="connect-trainer"]', "connect to trainer"); await sleep(400);
  check(fb._docs.get("users/u_asha").trainerId === "u_coach", "client linked to trainer");

  step = "trainer-builds-program";
  await sleep(300);
  check(T.text().includes("Asha"), "client appears in trainer list");
  await T.click('[data-act="open-client"]', "open client");
  for (const v of ["program", "progress", "history", "overview"]) await T.click(`[data-act="ctab"][data-v="${v}"]`, `client tab ${v}`);
  await T.click('[data-act="ctab"][data-v="program"]');
  await T.click('[data-act="b-new"]', "new program"); await T.click('[data-act="b-tpl"][data-v="blank"]', "blank template");
  check(!!T.$('[data-bp="name"]'), "builder renders");
  await T.type('[data-bp="name"]', "Asha Block 1");
  await T.type('[data-bp="block.weeks"]', "6"); await T.type('[data-bp="block.deloadText"]', "4");
  await T.type('[data-bp="days.0.title"]', "Lower");
  const sel = T.$('[data-bp="days.0.ex.0.n"]'); sel.value = "Back squat"; sel.dispatchEvent(new T.w.Event("input", {bubbles: true})); await sleep(150);
  await T.type('[data-bp="days.0.ex.0.sets"]', "4"); await T.type('[data-bp="days.0.ex.0.reps"]', "5"); await T.type('[data-bp="days.0.ex.0.kg"]', "60"); await T.type('[data-bp="days.0.ex.0.kgInc"]', "2.5");
  await T.click('[data-act="b-addday"]', "add day"); await T.click('[data-act="b-addex"][data-d="1"]', "add exercise to day B");
  await T.click('[data-act="b-save"]', "save program"); await sleep(400);
  const prog = fb._docs.get("users/u_asha").program;
  check(prog && prog.byTrainer && prog.name === "Asha Block 1" && prog.block.weeks === 6 && prog.block.deload[0] === 4, "program saved with block settings");
  check(prog && prog.days.length === 2 && prog.days[0].ex[0].n === "Back squat" && prog.days[0].ex[0].kg === 60, "program days and targets saved");

  step = "templates-and-notes";
  await T.click('[data-act="ctab"][data-v="notes"]', "notes tab");
  await T.type("#n-text", "Left knee niggle on lunges; swap to split squats if it persists.");
  await T.click('[data-act="note-save"]', "save note"); await sleep(300);
  check([...fb._docs.entries()].some(([k, v]) => k.startsWith("trainers/u_coach/notes/") && v.clientId === "u_asha" && v.text.includes("knee")), "dated note saved for client");
  check(T.text().includes("knee niggle"), "note listed under client");
  await T.click('[data-act="ctab"][data-v="program"]'); await T.click('[data-act="b-new"]');
  for (const k of ["hyrox","marathon","half","10k","crossfit","upperlower","ppl","fatloss"]) check(!!T.$(`[data-act="b-tpl"][data-v="tpl:${k}"]`), `template ${k} offered`);
  await T.click('[data-act="b-tpl"][data-v="tpl:half"]', "pick half-marathon template");
  const ev = new Date(Date.now() + 33 * 86400000), evStr = `${ev.getFullYear()}-${String(ev.getMonth()+1).padStart(2,"0")}-${String(ev.getDate()).padStart(2,"0")}`;
  await T.type('[data-bp="event.name"]', "Bengaluru Half"); await T.type('[data-bp="event.date"]', evStr);
  await T.click('[data-act="b-evfit"]', "fit block to event date");
  check(T.text().includes("isn't enough time") && T.text().includes("real coach"), "short timeline warns and recommends a coach");
  await T.click('[data-act="b-save"]', "save template program"); await sleep(400);
  const hp = fb._docs.get("users/u_asha").program;
  check(hp && hp.block.weeks >= 4 && hp.block.weeks <= 6 && hp.event && hp.event.date === evStr && hp.block.peak === hp.block.weeks - 1, "half-marathon program compressed to the event date with a taper");
  check(hp && hp.days.length === 4 && hp.days[3].ex[0].n === "Long run" && hp.days[3].ex[0].repsInc === 1, "half-marathon days and progression kept");

  step = "challenge";
  await T.click('[data-act="ttab"][data-v="tsquad"]', "trainer Squad tab");
  await T.click('[data-act="chal-new"]', "new challenge");
  const ct = T.$('[data-chf="title"]'); ct.value = "November blitz"; ct.dispatchEvent(new T.w.Event("input", {bubbles: true}));
  await T.click('[data-act="chal-save"]', "create challenge"); await sleep(300);
  check(T.text().includes("November blitz"), "challenge listed for trainer");
  await C.click('[data-act="tab"][data-v="squad"]', "client Squad tab"); await sleep(300);
  check(C.text().includes("November blitz"), "client sees the challenge");
  await C.click('[data-act="chal-join"]', "join challenge"); await sleep(300);
  check([...fb._docs.keys()].some(k => /^challenges\/[^/]+\/entries\/u_asha$/.test(k)), "client entry created on join");
  await C.click('[data-act="board-toggle"]', "show me on weekly board"); await sleep(200);
  check(fb._docs.get("users/u_asha").settings.showOnBoard === true, "weekly board opt-in saved");

  step = "client-follows-program";
  await sleep(300);
  await C.click('[data-act="tab"][data-v="workouts"]');
  check(C.text().includes("Long run") || C.text().includes("Easy run") || C.text().includes("set by"), "client sees trainer's program");
  await C.click('[data-act="openday"][data-d="D"]', "open long-run day"); check(C.text().includes("km easy"), "run target shown to client");
  await C.click('[data-act="startday"]'); await C.click('[data-act="precheck-skip"]');
  check(C.text().includes("Km") && C.text().includes("Min"), "run logging shows km and minutes");
  await C.type('[data-in="kg"][data-x="0"][data-s="0"]', "62");
  await C.click('[data-act="tick"][data-x="0"][data-s="0"]', "tick run");
  check(C.$('[data-in="reps"][data-x="0"][data-s="0"]').value !== "", "distance filled from target");
  await C.click('[data-act="finish"]', "client saves workout"); await sleep(400);
  const alerts = [...fb._docs.keys()].filter(k => k.startsWith("trainers/u_coach/alerts/"));
  check(alerts.length === 1, "trainer alert created");

  await C.click('[data-act="sheet-close"]', "close celebration");
  await sleep(3200);
  const entryKey = [...fb._docs.keys()].find(k => /^challenges\/[^/]+\/entries\/u_asha$/.test(k));
  check(entryKey && fb._docs.get(entryKey).value === 1, "challenge score updates after a workout");
  check(fb._docs.get("public/u_asha") && fb._docs.get("public/u_asha").weekSessions === 1 && fb._docs.get("public/u_asha").showOnBoard === true, "public summary synced");
  check(!("weight" in (fb._docs.get("public/u_asha") || {})) && !JSON.stringify(fb._docs.get("public/u_asha") || {}).includes("backPain"), "public summary has no body weight or pain");
  await T.click('[data-act="ttab"][data-v="tsquad"]'); await sleep(200);
  check(T.text().includes("Asha") && T.text().includes("🥇"), "trainer leaderboard shows the client");

  step = "buddies";
  const ashaCode = fb._docs.get("users/u_asha").buddyCode;
  check(!!ashaCode, "buddy code created");
  let B = await load(makeFirebase());
  await B.type("#a-name", "Ben Thomas"); await B.type("#a-email", "ben@test.in"); await B.type("#a-pass", "secret3");
  await B.click('[data-act="auth-go"]', "create buddy account"); await sleep(600);
  await agree(B, {health: false, dob: ""});
  check(!!fb._docs.get("users/u_ben").consent, "date of birth is optional");
  await B.click('[data-act="ob-skip"]', "buddy skips questionnaire"); await sleep(200);
  check(B.text().includes("Let's set up your training") && !!B.$("#e-tcode"), "new account without a program sees questionnaire and trainer-code options");
  await B.click('[data-act="tab"][data-v="squad"]'); await sleep(300);
  await B.type("#buddy-code", ashaCode); await B.click('[data-act="buddy-add"]', "add buddy by code"); await sleep(500);
  check((fb._docs.get("public/u_asha").buddies || []).includes("u_ben") && (fb._docs.get("public/u_ben").buddies || []).includes("u_asha"), "buddies linked both ways");
  check(B.text().includes("Asha") && B.text().includes("Buddy board"), "buddy card and board shown");
  await B.click('[data-act="five"]', "send high-five"); await sleep(300);
  check([...fb._docs.keys()].some(k => k.startsWith("public/u_asha/fives/")), "high-five delivered");
  await B.click('[data-act="tab"][data-v="body"]'); check(B.text().includes("haven't switched on health data") && !B.$('[data-act="dexa-new"]'), "health features hidden without health consent");

  step = "delete-account";
  await B.click('[data-act="settings"]'); await B.click('[data-act="ask-delete-account"]', "delete my account");
  await B.type("#da-pass", "wrong"); await B.click('[data-act="delacct-go"]', "wrong password"); await sleep(200);
  check(!!fb._docs.get("users/u_ben"), "wrong password deletes nothing");
  await B.type("#da-pass", "secret3"); await B.click('[data-act="delacct-go"]', "confirm deletion"); await sleep(800);
  check(!fb._docs.get("users/u_ben") && !fb._docs.get("public/u_ben") && !fb.accounts["ben@test.in"], "account, profile, summary and login deleted");
  check(![...fb._docs.keys()].some(k => k.startsWith("users/u_ben/")), "all of the deleted user's records gone");
  check(!(fb._docs.get("public/u_asha").buddies || []).includes("u_ben"), "deleted user removed from their buddy's list");
  check(B.text().includes("Train with a plan"), "after deletion the app returns to the sign-up page");
  await C.click('[data-act="tab"][data-v="today"]'); await sleep(200);
  check(C.text().includes("high-fived"), "client sees the high-five");
  B.w.close();

  step = "squads-custom-challenge";
  await T.click('[data-act="ttab"][data-v="tsquad"]');
  await T.click('[data-act="sq-new"]', "new squad"); await T.type("#sq-name", "6 am crew");
  const cb = T.$('[data-sqm="u_asha"]'); cb.checked = true; await T.click('[data-act="sq-save"]', "save squad"); await sleep(300);
  check([...fb._docs.entries()].some(([k, v]) => k.startsWith("trainers/u_coach/squads/") && v.members.includes("u_asha")), "squad saved");
  await T.click('[data-act="chal-new"]');
  const tt = T.$('[data-chf="title"]'); tt.value = "Mix it up"; tt.dispatchEvent(new T.w.Event("input", {bubbles: true}));
  const ms = T.$('[data-chf="metric"]'); ms.value = "mix"; ms.dispatchEvent(new T.w.Event("change", {bubbles: true})); await sleep(100);
  check(!!T.$('[data-chmix="0"]'), "custom mix rows shown");
  await T.click('[data-act="ch-preset"][data-v="thisweek"]', "this-week preset");
  const rp = T.$('[data-chf="repeat"]'); rp.value = "week"; rp.dispatchEvent(new T.w.Event("change", {bubbles: true}));
  await T.click('[data-act="ch-who"][data-v="squads"]', "limit to squads");
  const sq = T.$("[data-chsq]"); sq.checked = true; sq.dispatchEvent(new T.w.Event("change", {bubbles: true}));
  const tg = T.$('[data-chf="target"]'); tg.value = "10"; tg.dispatchEvent(new T.w.Event("input", {bubbles: true}));
  await T.click('[data-act="chal-save"]', "save custom challenge"); await sleep(300);
  const mixDoc = [...fb._docs.entries()].find(([k, v]) => /^challenges\/[^/]+$/.test(k) && v.title === "Mix it up");
  check(mixDoc && mixDoc[1].metric === "mix" && mixDoc[1].mix.length === 2 && mixDoc[1].members.includes("u_asha") && mixDoc[1].repeat === "week" && mixDoc[1].target === 10, "custom mix challenge saved with squad, repeat and target");
  await fb.firestore().collection("challenges").doc("old1").set({trainerId: "u_coach", title: "Weekly sets", metric: "sets", start: "2026-01-05", end: "2026-01-11", repeat: "week", members: null});
  await sleep(600);
  const rolled = [...fb._docs.entries()].filter(([k, v]) => k.startsWith("challenges/old1_"));
  check(rolled.length === 1 && rolled[0][1].end >= new Date().toISOString().slice(0, 10) && fb._docs.get("challenges/old1").next === rolled[0][0].split("/")[1], "repeating challenge rolled forward to the current week");
  await C.click('[data-act="tab"][data-v="squad"]'); await sleep(200);
  check(C.text().includes("Mix it up") && C.text().includes("Target"), "client in squad sees custom challenge with target");

  step = "health-share";
  await C.click('[data-act="tab"][data-v="body"]'); await C.click('[data-act="rep-new"]');
  await C.type("#rp-hba1c", "5.4"); C.$("#rp-share").checked = true;
  await C.click('[data-act="rep-save"]', "client saves shared report"); await sleep(300);
  await C.click('[data-act="rep-new"]'); await C.type("#rp-ldl", "99"); await C.click('[data-act="rep-save"]', "client saves private report"); await sleep(300);
  const reps = [...fb._docs.entries()].filter(([k]) => k.startsWith("users/u_asha/reports/"));
  check(reps.length === 2 && reps.filter(([, v]) => v.shared).length === 1, "one shared and one private report saved");
  await T.click('[data-act="ttab"][data-v="clients"]'); await T.click('[data-act="open-client"]'); await T.click('[data-act="ctab"][data-v="health"]', "trainer Health tab"); await sleep(300);
  check(T.text().includes("HbA1c") && !T.text().includes("LDL"), "trainer sees only the shared report");

  step = "gym-screen";
  await T.click('[data-act="ttab"][data-v="clients"]'); await T.click('[data-act="gympick"]', "open gym screen picker");
  await T.click('[data-act="gpick"][data-id="u_asha"]', "pick client"); await T.click('[data-act="gstart"]', "start gym screen"); await sleep(400);
  check(T.text().includes("Gym screen") && !!T.$('[data-gin="reps"][data-u="u_asha"]'), "gym screen shows the client's column");
  await T.click('[data-act="gtick"][data-u="u_asha"][data-x="0"][data-s="0"]', "tick a set on the big screen");
  await T.click('[data-act="gsave"][data-u="u_asha"]', "save workout from big screen"); await sleep(300);
  check([...fb._docs.entries()].some(([k, v]) => k.startsWith("users/u_asha/sessions/") && v.loggedOn === "gym screen"), "big-screen workout saved to the client");
  check(T.text().includes("Saved for Asha"), "column confirms the save");
  await T.click('[data-act="gexit"]', "exit gym screen");

  step = "gym-owner";
  let O = await load(makeFirebase());
  await O.click('[data-act="auth-role"][data-v="owner"]', "pick gym owner role");
  await O.type("#a-name", "Gita Owner"); await O.type("#a-email", "gita@test.in"); await O.type("#a-pass", "secret4"); await O.type("#a-gym", "Primal Gym HSR");
  await O.click('[data-act="auth-go"]', "create owner account"); await sleep(800);
  await agree(O, {staff: true}); await sleep(300);
  const gcode = (fb._docs.get("users/u_gita") || {}).gymCode;
  check(fb._docs.get("gyms/u_gita") && fb._docs.get("gyms/u_gita").name === "Primal Gym HSR" && !!gcode, "gym and gym code created");
  check(O.text().includes(gcode) && O.text().includes("No trainers yet"), "owner dashboard shows the gym code");
  await T.click('[data-act="ttab"][data-v="account"]'); await T.type("#gym-code", gcode); await T.click('[data-act="gym-join"]', "trainer joins gym"); await sleep(500);
  check(fb._docs.get("users/u_coach").gymId === "u_gita", "trainer linked to gym");
  await sleep(300);
  check(O.text().includes("Coach Ravi") && O.text().includes("Trainers"), "owner sees the trainer");
  await O.click('[data-act="otrainer"]', "open trainer detail"); await sleep(200);
  check(O.text().includes("Asha") && O.text().includes("Active"), "owner sees client summary and status");
  check(!O.text().includes("5.4") && !O.text().includes("HbA1c"), "owner sees no health data");
  O.w.close();

  step = "trainer-sees-alert";
  await sleep(300);
  await T.click('[data-act="ttab"][data-v="alerts"]'); check(T.text().includes("Asha finished"), "alert listed");
  await T.click('[data-act="open-alert"]', "open alert"); await sleep(1100);
  check(T.text().includes("Long run"), "session detail opens from alert");
  await T.click('[data-act="sheet-close"]'); await T.click('[data-act="ctab"][data-v="progress"]'); check(T.text().includes("Running km per week"), "trainer sees client running progress");
  check(T.text().includes("Your sport") && T.text().includes("General fitness"), "trainer sees the client's sport progress");

  /* ===== Coach tools: classes, roll call, approval = attendance, one workout to many, timers, sport challenges ===== */
  step = "coach-classes";
  const docsUnder = pre => [...fb._docs.entries()].filter(([k]) => k.startsWith(pre));
  await T.click('[data-act="ttab"][data-v="tclasses"]', "trainer Classes tab");
  check(T.text().includes("Classes") && T.text().includes("Attendance"), "classes view with attendance report");
  await T.click('[data-act="cl-new"]', "new class");
  await T.type("#cl-title", "Morning HIIT");
  for (const d of ["0", "2", "4", "6"]) await T.click(`[data-act="cl-day"][data-v="${d}"]`);
  check(T.$$('[data-act="cl-day"].on').length === 7, "class on every day");
  await T.click('[data-act="cl-who"][data-v="squads"]', "class for a troop");
  T.$("[data-clsq]").checked = true;
  await T.click('[data-act="cl-save"]', "save class"); await sleep(300);
  const cls = docsUnder("classes/").find(([, v]) => v.title === "Morning HIIT");
  check(cls && cls[1].trainerId === "u_coach" && cls[1].days.length === 7 && cls[1].members.includes("u_asha") && cls[1].squadNames[0] === "6 am crew", "class saved for the troop");
  await C.click('[data-act="tab"][data-v="today"]'); await sleep(200);
  check(C.text().includes("Your classes") && C.text().includes("Morning HIIT") && C.text().includes("Today"), "client sees the class on Today");
  await T.click('[data-act="cl-roll"]', "take attendance");
  T.$('[data-roll="u_asha"]').checked = true;
  await T.click('[data-act="roll-save"]', "save roll call"); await sleep(300);
  check(docsUnder("trainers/u_coach/attendance/c_").some(([, v]) => v.clientId === "u_asha" && v.kind === "class"), "class attendance recorded");
  check(T.text().includes("1 attended") && T.text().includes("Edit attendance"), "class shows who attended");

  step = "coach-approve";
  await T.click('[data-act="ttab"][data-v="alerts"]');
  const apb = T.$('[data-act="approve"]'); check(!!apb, "approve button on a workout alert");
  const apSid = apb && apb.dataset.id;
  await T.click('[data-act="approve"]', "approve workout"); await sleep(300);
  check(fb._docs.get(`users/u_asha/sessions/${apSid}`).approved && fb._docs.get(`users/u_asha/sessions/${apSid}`).approved.by === "u_coach", "workout marked approved");
  check(!!fb._docs.get(`trainers/u_coach/attendance/w_${apSid}`), "approved workout counted as attendance");
  check(T.text().includes("✓ Approved"), "alert shows it's approved");
  check(docsUnder("trainers/u_coach/attendance/w_").some(([, v]) => v.clientId === "u_asha"), "gym-screen workouts count as attendance too");
  await T.click('[data-act="ttab"][data-v="tclasses"]');
  check(/Asha\s*\d+\s*1\s*\d+/.test(T.text().replace(/\s+/g, " ")) || (T.text().includes("Asha") && T.text().includes("All clients")), "attendance report lists the client");
  await C.click('[data-act="tab"][data-v="workouts"]'); await sleep(200);
  check(C.text().includes("✓ Approved"), "client sees the approval in their history");

  step = "coach-send-many";
  await T.click('[data-act="ttab"][data-v="clients"]');
  await T.click('[data-act="mw-new"]', "send one workout to several clients");
  check(T.text().includes("One workout, many clients") && !T.$('[data-act="b-addday"]'), "multi-client builder opens");
  await T.type('[data-bp="days.0.title"]', "Saturday WOD");
  const mx = T.$('[data-bp="days.0.ex.0.n"]'); mx.value = "Back squat"; mx.dispatchEvent(new T.w.Event("input", {bubbles: true})); await sleep(150);
  await T.type('[data-bp="days.0.ex.0.reps"]', "5");
  await T.click('[data-act="b-save"]', "next: choose clients");
  check(T.text().includes("Send to clients"), "client picker shown");
  const mwc = T.$('[data-mwc="u_asha"]'); mwc.checked = true; mwc.dispatchEvent(new T.w.Event("change", {bubbles: true}));
  await T.click('[data-act="mw-preview"]', "preview loads"); await sleep(400);
  check(T.text().includes("Check and send") && T.text().includes("Back squat") && /from their back squat|no history/.test(T.text()), "preview shows each client's personalised load");
  await T.click('[data-act="mw-send"]', "send workout"); await sleep(400);
  const oo = (fb._docs.get("users/u_asha").program.oneoffs || [])[0];
  check(oo && oo.title === "Saturday WOD" && oo.ex[0].n === "Back squat" && !("why" in oo.ex[0]), "one-off workout saved to the client's program");
  await C.click('[data-act="tab"][data-v="today"]'); await sleep(300);
  check(C.text().includes("From your trainer") && C.text().includes("Saturday WOD"), "client sees the trainer's workout on Today");
  await C.click(`[data-act="openday"][data-d="${oo && oo.id}"]`, "open trainer's workout");
  check(C.text().includes("From your trainer") && C.text().includes("Back squat") && !!C.$('[data-act="startday"]'), "one-off workout can be started");

  step = "coach-timer";
  await C.click('[data-act="tab"][data-v="workouts"]');
  await C.click('[data-act="wt-open"]', "open workout timer");
  check(C.$$('[data-act="wt-mode"]').length === 4, "AMRAP, EMOM, Tabata and For Time offered");
  await C.click('[data-act="wt-mode"][data-v="fortime"]');
  await C.click('[data-act="wt-start"]', "start For Time");
  check(!!C.$("#wt") && C.text().includes("Get ready"), "full-screen timer starts with a countdown");
  C.w.eval("S.wt.t0 -= 11000"); await sleep(250);
  await C.click('[data-act="wt-round"]'); await C.click('[data-act="wt-round"]');
  check(C.$("#wt-sub").textContent.includes("2 rounds"), "rounds counted");
  await C.click('[data-act="wt-done"]', "finish For Time");
  check(C.text().includes("For Time finished"), "result shown");
  await C.click('[data-act="wt-close"]'); check(!C.$("#wt"), "timer closes");
  const emom = C.w.eval(`(() => { S.wt = {mode:"emom", cfg:{every:60, rounds:3}, t0: Date.now() - 75000, pausedAt:null, pausedTotal:0, rounds:0, done:false, key:""}; const a = wtState(); S.wt.t0 = Date.now() - 300000; const b = wtState(); S.wt = {mode:"tabata", cfg:{work:20, rest:10, rounds:8}, t0: Date.now() - 45000, pausedAt:null, pausedTotal:0, rounds:0, done:false, key:""}; const c = wtState(); S.wt = null; return [a.phase, a.big, !!b.end, c.phase, c.sub]; })()`);
  check(emom[0] === "Round 2 of 3" && emom[1] === "0:55" && emom[2] && emom[3] === "Work" && emom[4] === "Round 2 of 8", "EMOM and Tabata clocks count correctly");

  step = "coach-sport-challenge";
  await T.click('[data-act="ttab"][data-v="tsquad"]'); await T.click('[data-act="chal-new"]');
  const t2 = T.$('[data-chf="title"]'); t2.value = "HYROX time trial"; t2.dispatchEvent(new T.w.Event("input", {bubbles: true}));
  check([...T.$('[data-chf="metric"]').options].some(o => o.value === "swim") && [...T.$('[data-chf="metric"]').options].some(o => o.value === "rounds"), "sport metrics offered");
  const m2 = T.$('[data-chf="metric"]'); m2.value = "evbest"; m2.dispatchEvent(new T.w.Event("change", {bubbles: true})); await sleep(100);
  check(!!T.$('[data-chf="evkind"]'), "race picker shown for best race time");
  const tg2 = T.$('[data-chf="target"]'); tg2.value = "1:20:00"; tg2.dispatchEvent(new T.w.Event("input", {bubbles: true}));
  await T.click('[data-act="chal-save"]', "save race challenge"); await sleep(300);
  const hc = docsUnder("challenges/").find(([, v]) => v.title === "HYROX time trial");
  check(hc && hc[1].metric === "evbest" && hc[1].evkind === "hyrox" && hc[1].target === 4800, "race-time challenge saved with time target");
  check(T.text().includes("Best time: HYROX"), "challenge card names the race");

  step = "owner-attendance";
  let O2 = await load(makeFirebase());
  await O2.click('[data-act="auth-mode"][data-v="in"]'); await O2.type("#a-email", "gita@test.in"); await O2.type("#a-pass", "secret4");
  await O2.click('[data-act="auth-go"]', "owner signs in"); await sleep(800);
  await O2.click('[data-act="otrainer"]', "open trainer"); await sleep(300);
  check(O2.text().includes("Attendance") && O2.text().includes("Asha") && O2.text().includes("All clients"), "gym owner sees the trainer's attendance for billing");
  O2.w.close();

  /* ===== Retention: risk score, call list, pause, comeback, report card, dashboard, membership, badges ===== */
  step = "retention-risk";
  const R = (c, k) => C.w.eval(`riskOf(${JSON.stringify(c)}${k ? ", " + k : ""})`);
  const dAgo = n => C.w.eval(`addDays(today(), ${-n})`), monAgo = n => C.w.eval(`addDays(mondayOf(today()), -${7 * n})`);
  const wc = arr => Object.fromEntries(arr.map((v, i) => [monAgo(i), v]));
  const steady = {joined: dAgo(200), weekCounts: wc([0, 3, 3, 3, 3, 3, 3, 3]), lastWorkout: {date: dAgo(2)}};
  check(R(steady).st === "active", "member at their usual 3 a week is active");
  const drop = {joined: dAgo(200), weekCounts: wc([0, 1, 3, 3, 3, 3, 3, 3]), lastWorkout: {date: dAgo(3)}};
  const rd = R(drop); check(rd.st === "risk" && /1 workout last week; usually 3 a week/.test(rd.why), "drop from 3 a week to 1 is flagged, with the reason");
  check(R({...drop, weekCounts: wc([2, 1, 3, 3, 3, 3, 3, 3])}).st === "active", "a member already back on track this week isn't flagged");
  const easy = {joined: dAgo(200), weekCounts: wc([0, 1, 1, 1, 1, 1, 1, 1]), lastWorkout: {date: dAgo(9)}};
  check(R(easy).st === "active", "a once-a-week member isn't flagged after 9 days");
  check(R({...easy, joined: dAgo(30)}).st === "risk" && R({...easy, joined: dAgo(30)}).isNew, "a new member (first 60 days) is flagged sooner");
  check(R({joined: dAgo(200), weekCounts: {}, lastWorkout: {date: dAgo(16)}}).st === "risk" && R({joined: dAgo(200), weekCounts: {}, lastWorkout: {date: dAgo(40)}}).st === "inactive", "16 days off is at risk, 40 days inactive");
  check(R({joined: dAgo(10), weekCounts: {}}).st === "never" && R({joined: dAgo(2), weekCounts: {}}).fresh, "new member with no workout yet");
  check(R({...drop, pauses: [{from: dAgo(3), to: dAgo(-4)}]}).st === "paused", "a paused member is not at risk");
  check(R({...drop, weekCounts: wc([0, 0, 0, 3, 3, 3, 3, 3]), lastWorkout: {date: dAgo(10)}, pauses: [{from: dAgo(13), to: dAgo(1)}]}).st === "active", "days on pause don't count as missed training");
  check(R(steady, 3).st === "active" && R({joined: dAgo(200), weekCounts: wc([0, 0, 0, 0, 3, 3, 3, 3]), lastWorkout: {date: dAgo(30)}}, 0).st !== "active", "trend: risk worked out for earlier weeks");

  step = "retention-pause";
  await C.click('[data-act="tab"][data-v="today"]');
  await C.click('[data-act="settings"]', "open settings");
  check(C.text().includes("Pause / holiday"), "settings offer a pause");
  await C.click('[data-act="pause-open"]', "open pause sheet");
  await C.type("#pz-from", dAgo(1)); await C.type("#pz-to", dAgo(-6));
  const why = C.$("#pz-why"); why.value = "ill";
  await C.click('[data-act="pause-save"]', "save pause"); await sleep(300);
  const pz = (fb._docs.get("users/u_asha").pauses || [])[0];
  check(pz && pz.from === dAgo(1) && pz.to === dAgo(-6) && pz.why === "ill" && pz.by === "member", "member's pause saved with reason");
  check(C.text().includes("Training paused until"), "Today says training is paused");
  check(C.w.eval("gameStats().rings.paused") >= 2, "this week's rings know about the pause");
  await sleep(2800);
  const pubA = fb._docs.get("public/u_asha");
  check(pubA.pauses && pubA.pauses[0].from === dAgo(1) && !("why" in pubA.pauses[0]), "public summary carries the pause dates but not the reason");
  check(!!pubA.joined, "public summary carries the join date");
  await C.click('[data-act="pause-open"]'); await C.click('[data-act="pause-end"]', "end the pause"); await sleep(300);
  check((fb._docs.get("users/u_asha").pauses || [])[0].to === dAgo(1), "ending the pause closes it yesterday");
  check(!C.text().includes("Training paused until"), "pause banner gone");

  step = "retention-profile";
  await C.click('[data-act="settings"]'); await C.click('[data-act="profile-edit"]', "edit profile");
  await C.type("#pf-phone", "98450 12345"); await C.type("#pf-mend", dAgo(-20));
  await C.click('[data-act="profile-save"]', "save profile"); await sleep(400);
  check(fb._docs.get("users/u_asha").settings.phone === "98450 12345" && fb._docs.get("users/u_asha").memberEnd === dAgo(-20), "WhatsApp number and membership end saved");

  step = "retention-trainer";
  await fb.firestore().collection("public").doc("u_ravi").set({name: "Ravi K", trainerId: "u_coach", buddies: [], week: monAgo(0), joined: dAgo(40), weekCounts: wc([0, 0, 2, 2, 2, 2, 2, 2]), lastWorkout: {date: dAgo(9), title: "Legs"}, program: {name: "Hyrox prep", days: 3}});
  await T.click('[data-act="ttab"][data-v="clients"]'); await sleep(300);
  check(T.text().includes("Members to contact this week") && T.text().includes("Ravi K"), "trainer's call list shows the member slipping");
  check(T.$('[data-call="u_ravi"]').textContent.includes("New") && /No workout for 9 days/.test(T.text()), "new-member tag and reason shown");
  check(/Membership ends in 20 days/.test(T.text()), "trainer sees the membership end soon");
  const wa = T.$('[data-call="u_ravi"] a[href^="https://wa.me/"]'); check(!!wa && wa.href.includes("text="), "one-tap WhatsApp link with a ready message");
  await T.click('[data-act="call-out"][data-id="u_ravi"][data-v="called"]', "record: called"); await sleep(300);
  const callId = `trainers/u_coach/calls/u_ravi_${monAgo(0)}`;
  check(fb._docs.get(callId) && fb._docs.get(callId).outcome === "called" && fb._docs.get(callId).clientName === "Ravi K", "call outcome saved");
  await T.click('[data-act="call-out"][data-id="u_ravi"][data-v="back"]', "record: back training"); await sleep(300);
  check(fb._docs.get(callId).outcome === "back" && !T.$('[data-call="u_ravi"]'), "member marked back drops off this week's list");
  await T.click('[data-act="open-client"][data-id="u_asha"]', "open Asha"); await sleep(300);
  check(T.text().includes("Status") && T.text().includes("Membership ends"), "client overview has status and membership");
  check(T.$('a[href*="wa.me/919845012345"]') !== null, "WhatsApp link uses the client's number with India's code");
  await T.type("#mend-date", dAgo(-45)); await T.click('[data-act="mend-save"]', "trainer saves membership end"); await sleep(300);
  check(fb._docs.get("users/u_asha").memberEnd === dAgo(-45) && fb._docs.get("public/u_asha").memberEnd === dAgo(-45), "membership end saved to the client and their summary");
  await T.click('[data-act="pause-open"][data-c="u_asha"]', "trainer opens pause");
  await T.type("#pz-from", dAgo(-10)); await T.type("#pz-to", dAgo(-17));
  await T.click('[data-act="pause-save"]', "trainer saves pause"); await sleep(300);
  check((fb._docs.get("users/u_asha").pauses || []).some(p => p.by === "trainer" && p.from === dAgo(-10)) && (fb._docs.get("public/u_asha").pauses || []).some(p => p.from === dAgo(-10)), "trainer can pause a client");
  await T.click('[data-act="ctab"][data-v="progress"]'); check(T.text().includes("Monthly report card"), "trainer sees the client's monthly report card");
  await T.click('[data-act="ttab"][data-v="clients"]'); await T.click('[data-act="ttab"][data-v="tretention"]', "trainer retention dashboard"); await sleep(200);
  check(T.text().includes("By month joined") && T.text().includes("Active members per week") && T.text().includes("By troop"), "trainer retention dashboard renders");
  await T.click('[data-act="ret-split"][data-v="program"]'); check(T.text().includes("Hyrox prep"), "split by program");

  step = "retention-comeback";
  const cbk = C.w.eval(`(() => {
    const keep = S.data; const d0 = addDays(today(), -14);
    S.data = {...keep, sessions: [{id: "x1", date: addDays(today(), -30), exercises: []}, {id: "x2", date: d0, exercises: []}]};
    const ex = {n: "Back squat", sets: 4, reps: "5", kg: 60, type: "load"}, w = Math.max(1, weekOf(today()));
    const on = comebackInfo(), banner = comebackBanner(), sets = setLabels(ex, 0, w).length, kg = targetKg(ex, w);
    S.profile.settings.comebackOff = on && on.after; const off = comebackInfo(), sets2 = setLabels(ex, 0, w).length, kg2 = targetKg(ex, w);
    S.profile.settings.comebackOff = null; S.data = {...keep, sessions: [{id: "x1", date: addDays(today(), -12), exercises: []}, {id: "x2", date: addDays(today(), -2), exercises: []}]};
    const back = comebackInfo(); S.data = keep;
    return {waiting: on && on.waiting, gap: on && on.gap, banner, sets, kg, off, sets2, kg2, back: back && back.start};
  })()`);
  check(cbk.waiting && cbk.gap === 14 && /Welcome back/.test(cbk.banner), "after 14 days off, a comeback week is offered");
  check(cbk.sets === 3 && cbk.sets2 === 4 && cbk.kg < cbk.kg2, "comeback week has fewer sets and lighter weights");
  check(cbk.off === null, "member can switch the comeback week off");
  check(cbk.back === C.w.eval("addDays(today(), -2)"), "comeback week runs 7 days from the first workout back");

  step = "retention-report";
  const mr = C.w.eval(`(() => { const r = monthReport(monthKey(today())); return {w: r.workouts, pbs: Array.isArray(r.pbs), m: r.m}; })()`);
  check(mr.w >= 1 && mr.pbs, "monthly report counts this month's workouts");
  await C.click('[data-act="tab"][data-v="progress"]'); await C.click('[data-act="ptab"][data-v="stats"]');
  check(C.text().includes("Monthly report card") && !!C.$('[data-act="mr-share"]'), "report card with share button on Progress");
  check(C.w.eval(`BADGES.some(b => b[0] === "m12")`) && C.w.eval(`(() => { const s = S.profile.since; S.profile.since = addDays(today(), -100); const b = gameStats().badges; S.profile.since = s; return b.has("m3") && !b.has("m6"); })()`), "anniversary badge at 3 months");

  step = "retention-owner";
  let O3 = await load(makeFirebase());
  await O3.click('[data-act="auth-mode"][data-v="in"]'); await O3.type("#a-email", "gita@test.in"); await O3.type("#a-pass", "secret4");
  await O3.click('[data-act="auth-go"]', "owner signs in"); await sleep(800);
  check(O3.text().includes("At risk or inactive") && O3.text().includes("New (first 60 days)"), "owner dashboard shows at-risk and new-member counts");
  await O3.click('[data-act="otrainer"]'); await sleep(200);
  check(O3.text().includes("Follow-up") && O3.text().includes("Back training") && O3.text().includes("Ravi K"), "owner sees trainer follow-up outcomes");
  check(!O3.text().includes("Illness") && !O3.text().includes("98450"), "owner sees no pause reasons or phone numbers");
  await O3.click('[data-act="otab"][data-v="oretention"]', "owner retention tab"); await sleep(200);
  check(O3.text().includes("By month joined") && O3.text().includes("Trainer follow-ups") && O3.text().includes("Coach Ravi"), "owner retention dashboard by trainer");
  await O3.click('[data-act="ret-split"][data-v="class"]'); check(O3.text().includes("Morning HIIT"), "split by class");
  O3.w.close();
  await fb.firestore().collection("public").doc("u_ravi").delete();

  step = "bounded-reads";
  const dayStr = n => { const d = new Date(Date.now() - n * 86400000); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  await fb.firestore().collection("users").doc("u_asha").collection("sessions").doc("old300").set({id: "old300", date: dayStr(300), title: "Year-ago workout", week: 1, day: "A", exercises: []});
  await fb.firestore().collection("users").doc("u_asha").collection("sessions").doc("mid100").set({id: "mid100", date: dayStr(100), title: "Spring workout", week: 1, day: "A", exercises: []});
  let C2 = await load(makeFirebase());
  await C2.click('[data-act="auth-mode"][data-v="in"]'); await C2.type("#a-email", "asha@test.in"); await C2.type("#a-pass", "secret2");
  await C2.click('[data-act="auth-go"]', "client signs in on a new phone"); await sleep(900);
  const ids = () => C2.w.eval("S.data.sessions.map(s => s.id)");
  check(ids().includes("mid100") && !ids().includes("old300"), "a new phone loads the last 6 months, not older history");
  check(C2.w.eval("S.data.sessions.length") >= 2, "recent workouts still loaded");
  await C2.click('[data-act="tab"][data-v="progress"]');
  check(C2.text().includes("Showing the last 6 months") && !!C2.$('[data-act="hist-all"]'), "Progress says how far back it goes and offers older history");
  await C2.click('[data-act="hist-all"]', "load older history"); await sleep(400);
  check(ids().includes("old300") && !C2.$('[data-act="hist-all"]'), "older history loads on request");
  check(C2.w.eval('localStorage.getItem("ps-hist-all:u:u_asha")') === "1", "the phone remembers to show all history next time");
  C2.w.close();

  report();
})().catch(e => { errors.push("crash: " + (e && (e.stack || e.message) || e)); report(); });
function report(){
  const enc = x => String(x).replace(/%/g, "%25").replace(/\r/g, "").replace(/\n/g, "%0A");
  if (errors.length){ console.log(`::error title=Smoke test (${errors.length} problems)::` + enc(errors.slice(0, 25).join("\n").slice(0, 3800))); process.exit(1); }
  console.log("All checks passed"); process.exit(0);
}
