// Smoke test: loads the app in jsdom with an in-memory Firebase stand-in and clicks through
// the client and trainer flows. Any uncaught error or failed check exits non-zero.
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync(path.join(__dirname, "..", "www", "index.html"), "utf8")
  .replace(/<script src="vendor\/[^"]+"><\/script>/g, "")      // real SDK not loaded in the test
  .replace(/<link[^>]+fonts[^>]+>/g, "");
const errors = [];
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
    for (const [f, op, v] of q.wh) rows = rows.filter(r => op === "==" ? r.d[f] === v : true);
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
    batch: () => { const ops = []; return {set: (r, d) => ops.push(() => r.set(d)), update: (r, d) => ops.push(() => r.update(d)), commit: async () => { for (const o of ops) await o(); }}; }
  };
  let user = null; const authCbs = []; const accounts = SHARED.accounts;
  const emit = () => authCbs.forEach(cb => cb(user));
  const auth = {
    onAuthStateChanged: cb => { authCbs.push(cb); setTimeout(() => cb(user), 0); },
    createUserWithEmailAndPassword: async (e, p) => { if (accounts[e]) throw {code: "auth/email-already-in-use"}; accounts[e] = {uid: "u_" + e.split("@")[0], email: e, p}; user = accounts[e]; emit(); return {user}; },
    signInWithEmailAndPassword: async (e, p) => { if (!accounts[e] || accounts[e].p !== p) throw {code: "auth/invalid-credential"}; user = accounts[e]; emit(); return {user}; },
    signOut: async () => { user = null; emit(); },
    sendPasswordResetEmail: async () => {}
  };
  const firestoreFn = () => db; firestoreFn.FieldValue = {serverTimestamp: () => SERVER_TS, arrayUnion: (...v) => ({__au: v}), arrayRemove: (...v) => ({__ar: v})};
  return {initializeApp: () => {}, firestore: firestoreFn, auth: () => auth, _docs: docs};
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
  const click = async (sel, msg) => { const el = typeof sel === "string" ? $(sel) : sel; check(!!el, msg || `found ${sel}`); if (el) el.dispatchEvent(new w.MouseEvent("click", {bubbles: true})); await sleep(150); return el; };
  const type = async (sel, v) => { const el = $(sel); check(!!el, `input ${sel}`); if (!el) return; el.value = v; el.dispatchEvent(new w.Event("input", {bubbles: true})); await sleep(30); };
  const text = () => w.document.getElementById("app").textContent;
  return {w, $, click, type, text};
}

(async () => {
  /* ===== 1. Offline client flow ===== */
  step = "offline";
  let A = await load(null);
  step = "onboarding";
  check(A.text().includes("I'm your Primal Strength coach"), "first run opens the coach questionnaire");
  await A.type("#ob-name", "Manas");
  await A.click('[data-act="ob-next"]', "start questionnaire");
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
  A.w.close();

  /* ===== 2. Trainer + client with accounts ===== */
  step = "trainer-signup";
  const fb = makeFirebase();
  let T = await load(fb);
  check(T.text().includes("Train with a plan"), "signed-out app opens on the sign-up page");
  check(!T.$('[data-act="tab"]'), "app content is hidden until signed in");
  await T.click('[data-act="auth-role"][data-v="trainer"]', "pick trainer role");
  await T.type("#a-name", "Coach Ravi"); await T.type("#a-email", "coach@test.in"); await T.type("#a-pass", "secret1");
  await T.click('[data-act="auth-go"]', "create trainer account"); await sleep(600);
  check(T.text().includes("Clients") || T.text().includes("clients"), "trainer lands on Clients");
  check(T.text().includes(", Coach"), "trainer greeted by name");
  const code = [...fb._docs.keys()].find(k => k.startsWith("codes/"));
  check(!!code, "invite code created"); const inviteCode = code && code.split("/")[1];
  check(T.text().includes(inviteCode), "invite code shown to trainer");

  step = "client-signup";
  let C = await load(makeFirebase());      // client's phone: same backend, its own sign-in
  await C.type("#a-name", "Asha"); await C.type("#a-email", "asha@test.in"); await C.type("#a-pass", "secret2");
  await C.click('[data-act="auth-go"]', "create client account"); await sleep(600);
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
  await B.click('[data-act="ob-skip"]', "buddy skips questionnaire"); await sleep(200);
  check(B.text().includes("Let's set up your training") && !!B.$("#e-tcode"), "new account without a program sees questionnaire and trainer-code options");
  await B.click('[data-act="tab"][data-v="squad"]'); await sleep(300);
  await B.type("#buddy-code", ashaCode); await B.click('[data-act="buddy-add"]', "add buddy by code"); await sleep(500);
  check((fb._docs.get("public/u_asha").buddies || []).includes("u_ben") && (fb._docs.get("public/u_ben").buddies || []).includes("u_asha"), "buddies linked both ways");
  check(B.text().includes("Asha") && B.text().includes("Buddy board"), "buddy card and board shown");
  await B.click('[data-act="five"]', "send high-five"); await sleep(300);
  check([...fb._docs.keys()].some(k => k.startsWith("public/u_asha/fives/")), "high-five delivered");
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

  report();
})().catch(e => { errors.push("crash: " + (e && (e.stack || e.message) || e)); report(); });
function report(){
  const enc = x => String(x).replace(/%/g, "%25").replace(/\r/g, "").replace(/\n/g, "%0A");
  if (errors.length){ console.log(`::error title=Smoke test (${errors.length} problems)::` + enc(errors.slice(0, 25).join("\n").slice(0, 3800))); process.exit(1); }
  console.log("All checks passed"); process.exit(0);
}
