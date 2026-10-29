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
    if (l.kind === "doc"){ const d = docs.get(l.path); l.cb(snapDoc(l.path, d)); }
    else l.cb(snapQuery(l));
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
      update: async d => { if (!docs.has(p)) throw {code: "not-found"}; docs.set(p, {...docs.get(p), ...resolveTs(d)}); notify(); },
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
  const firestoreFn = () => db; firestoreFn.FieldValue = {serverTimestamp: () => SERVER_TS};
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
  check(A.text().includes("Primal Strength"), "home renders with app name");
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
  check(A.text().includes("History"), "back on workouts after save");
  await A.click('[data-act="tab"][data-v="progress"]'); check(A.text().includes("Lifts"), "progress renders after a workout");
  await A.click('[data-act="settings"]', "open settings"); check(A.text().includes("Android app"), "settings explains accounts need the Android app");
  A.w.close();

  /* ===== 2. Trainer + client with accounts ===== */
  step = "trainer-signup";
  const fb = makeFirebase();
  let T = await load(fb);
  await T.click('[data-act="settings"]'); await T.click('[data-act="auth"][data-v="up"]', "open create account");
  await T.click('[data-act="auth-role"][data-v="trainer"]', "pick trainer role");
  await T.type("#a-name", "Coach Ravi"); await T.type("#a-email", "coach@test.in"); await T.type("#a-pass", "secret1");
  await T.click('[data-act="auth-go"]', "create trainer account"); await sleep(600);
  check(T.text().includes("Clients"), "trainer lands on Clients");
  const code = [...fb._docs.keys()].find(k => k.startsWith("codes/"));
  check(!!code, "invite code created"); const inviteCode = code && code.split("/")[1];
  check(T.text().includes(inviteCode), "invite code shown to trainer");

  step = "client-signup";
  let C = await load(makeFirebase());      // client's phone: same backend, its own sign-in
  await C.click('[data-act="settings"]'); await C.click('[data-act="auth"][data-v="up"]');
  await C.type("#a-name", "Asha"); await C.type("#a-email", "asha@test.in"); await C.type("#a-pass", "secret2");
  await C.click('[data-act="auth-go"]', "create client account"); await sleep(600);
  await C.click('[data-act="settings"]'); await C.type("#t-code", inviteCode);
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

  step = "client-follows-program";
  await sleep(300);
  await C.click('[data-act="tab"][data-v="workouts"]');
  check(C.text().includes("Lower") && C.text().includes("set by"), "client sees trainer's program");
  await C.click('[data-act="openday"][data-d="A"]'); check(C.text().includes("@ 60 kg") || C.text().includes("60 kg"), "target weight shown to client");
  await C.click('[data-act="startday"]'); await C.click('[data-act="precheck-skip"]');
  await C.click('[data-act="tick"][data-x="0"][data-s="0"]', "tick set using target");
  check(C.$('[data-in="kg"][data-x="0"][data-s="0"]').value === "60", "kg filled from trainer target");
  await C.click('[data-act="finish"]', "client saves workout"); await sleep(400);
  const alerts = [...fb._docs.keys()].filter(k => k.startsWith("trainers/u_coach/alerts/"));
  check(alerts.length === 1, "trainer alert created");

  step = "trainer-sees-alert";
  await sleep(300);
  await T.click('[data-act="ttab"][data-v="alerts"]'); check(T.text().includes("Asha finished"), "alert listed");
  await T.click('[data-act="open-alert"]', "open alert"); await sleep(1100);
  check(T.text().includes("Back squat"), "session detail opens from alert");
  await T.click('[data-act="sheet-close"]'); await T.click('[data-act="ctab"][data-v="progress"]'); check(T.text().includes("Lifts"), "trainer sees client progress");

  report();
})().catch(e => { errors.push("crash: " + (e && (e.stack || e.message) || e)); report(); });
function report(){
  const enc = x => String(x).replace(/%/g, "%25").replace(/\r/g, "").replace(/\n/g, "%0A");
  if (errors.length){ console.log(`::error title=Smoke test (${errors.length} problems)::` + enc(errors.slice(0, 25).join("\n").slice(0, 3800))); process.exit(1); }
  console.log("All checks passed"); process.exit(0);
}
