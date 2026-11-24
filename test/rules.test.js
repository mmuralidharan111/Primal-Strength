// Firestore security rules tests. Runs against Google's official Firestore emulator in CI:
//   npx firebase-tools emulators:exec --only firestore --project demo-primal "node test/rules.test.js"
// Each check names who is acting and what they try; any unexpected allow or deny fails the build.
const fs = require("fs");
const path = require("path");
const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, addDoc } = require("firebase/firestore");

let failed = 0, passed = 0;
async function expect(kind, label, fn){
  try { await (kind === "allow" ? assertSucceeds(fn()) : assertFails(fn())); passed++; console.log(`  ✓ ${kind === "allow" ? "allowed" : "blocked"}: ${label}`); }
  catch(e){ failed++; console.log(`  ✗ expected ${kind === "allow" ? "ALLOWED" : "BLOCKED"}: ${label} — ${e && e.message ? e.message.split("\n")[0] : e}`); }
}
const allow = (l, f) => expect("allow", l, f), deny = (l, f) => expect("deny", l, f);

(async () => {
  const env = await initializeTestEnvironment({
    projectId: "demo-primal",
    firestore: { rules: fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8"), host: "127.0.0.1", port: 8080 }
  });

  // ---- seed data (rules switched off) ----
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/gita"), {role: "owner", name: "Gita", trainerId: null, gymId: "gita"});
    await setDoc(doc(db, "gyms/gita"), {ownerId: "gita", name: "Primal Gym"});
    await setDoc(doc(db, "gymcodes/GYM123"), {gymId: "gita", name: "Primal Gym"});
    await setDoc(doc(db, "users/coach"), {role: "trainer", name: "Ravi", trainerId: null, gymId: "gita"});
    await setDoc(doc(db, "users/coach2"), {role: "trainer", name: "Other coach", trainerId: null, gymId: null});
    await setDoc(doc(db, "codes/ABC123"), {trainerId: "coach", name: "Ravi"});
    await setDoc(doc(db, "users/asha"), {role: "client", name: "Asha", trainerId: "coach", trainerCode: "ABC123", gymId: null, settings: {}, program: {days: []}});
    await setDoc(doc(db, "users/bob"), {role: "client", name: "Bob", trainerId: null, gymId: null, settings: {}, program: {days: []}});
    await setDoc(doc(db, "users/asha/sessions/s1"), {date: "2026-11-02", title: "Day A"});
    await setDoc(doc(db, "users/asha/reports/private"), {type: "blood", shared: false});
    await setDoc(doc(db, "users/asha/reports/shared"), {type: "blood", shared: true});
    await setDoc(doc(db, "users/asha/dexa/d1"), {date: "2026-10-01"});
    await setDoc(doc(db, "public/asha"), {name: "Asha", trainerId: "coach", buddies: [], showOnBoard: false});
    await setDoc(doc(db, "public/bob"), {name: "Bob", trainerId: null, buddies: [], showOnBoard: false});
    await setDoc(doc(db, "buddycodes/ASHA77"), {uid: "asha"});
    await setDoc(doc(db, "challenges/c1"), {trainerId: "coach", title: "November blitz", members: null});
    await setDoc(doc(db, "trainers/coach/notes/n1"), {clientId: "asha", text: "Knee niggle"});
    await setDoc(doc(db, "trainers/coach/alerts/a1"), {clientId: "asha", title: "Day A"});
    await setDoc(doc(db, "users/asha/sessions/ok1"), {date: "2026-11-04", title: "Day B", approved: {by: "coach", at: "2026-11-04"}});
    await setDoc(doc(db, "users/asha/sessions/s9"), {date: "2026-11-05", title: "Day C"});
    await setDoc(doc(db, "classes/k1"), {trainerId: "coach", title: "Morning HIIT", days: [1, 3, 5], members: null});
    await setDoc(doc(db, "trainers/coach/attendance/w_ok1"), {clientId: "asha", date: "2026-11-04", kind: "workout"});
    // security audit: a second client of the same trainer, a stranger, and an owner of a different gym
    await setDoc(doc(db, "users/ravi2"), {role: "client", name: "Second client", trainerId: "coach", gymId: null, settings: {}, program: {days: []}});
    await setDoc(doc(db, "users/ravi2/sessions/r1"), {date: "2026-11-02", title: "Day A"});
    await setDoc(doc(db, "users/ravi2/body/b1"), {date: "2026-11-02", weight: 80});
    await setDoc(doc(db, "users/mallory"), {role: "client", name: "Mallory", trainerId: null, gymId: null, settings: {}, program: {days: []}});
    await setDoc(doc(db, "users/olga"), {role: "owner", name: "Other gym owner", trainerId: null, gymId: "olga"});
    await setDoc(doc(db, "users/asha/body/b1"), {date: "2026-11-02", weight: 61, tests: {rhr: 58}});
    await setDoc(doc(db, "trainers/coach2/notes/n9"), {clientId: "x", text: "Other trainer's note"});
  });
  const as = uid => env.authenticatedContext(uid).firestore();
  const anon = env.unauthenticatedContext().firestore();
  const asha = as("asha"), bob = as("bob"), coach = as("coach"), coach2 = as("coach2"), gita = as("gita");

  console.log("Profiles");
  await deny("signed-out visitor reads a client's profile", () => getDoc(doc(anon, "users/asha")));
  await allow("client reads own profile", () => getDoc(doc(asha, "users/asha")));
  await deny("stranger reads a client's profile", () => getDoc(doc(bob, "users/asha")));
  await allow("trainer reads their client's profile", () => getDoc(doc(coach, "users/asha")));
  await deny("another trainer reads the client's profile", () => getDoc(doc(coach2, "users/asha")));
  await deny("gym owner reads a client's full profile", () => getDoc(doc(gita, "users/asha")));
  await allow("gym owner reads their trainer's profile", () => getDoc(doc(gita, "users/coach")));
  await deny("client makes themselves a trainer", () => updateDoc(doc(asha, "users/asha"), {role: "trainer"}));
  await deny("client links to a trainer without a valid code", () => updateDoc(doc(bob, "users/bob"), {trainerId: "coach", trainerCode: "WRONG1"}));
  await allow("client links to a trainer with a valid code", () => updateDoc(doc(bob, "users/bob"), {trainerId: "coach", trainerCode: "ABC123"}));
  await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), "users/bob"), {trainerId: null, trainerCode: null}));
  await deny("new account created already linked to a trainer", () => setDoc(doc(as("eve"), "users/eve"), {role: "client", trainerId: "coach", gymId: null}));
  await allow("trainer updates their client's program", () => updateDoc(doc(coach, "users/asha"), {program: {days: [], name: "Block 2"}}));
  await deny("trainer changes their client's settings", () => updateDoc(doc(coach, "users/asha"), {settings: {consent: null}}));

  console.log("Workouts and health data");
  await allow("client logs own workout", () => setDoc(doc(asha, "users/asha/sessions/s2"), {date: "2026-11-03"}));
  await deny("stranger reads a client's workouts", () => getDoc(doc(bob, "users/asha/sessions/s1")));
  await allow("trainer reads their client's workouts", () => getDoc(doc(coach, "users/asha/sessions/s1")));
  await allow("trainer logs a session on the gym screen", () => setDoc(doc(coach, "users/asha/sessions/g1"), {date: "2026-11-03", loggedOn: "gym screen"}));
  await deny("trainer writes their client's DEXA scan", () => setDoc(doc(coach, "users/asha/dexa/d2"), {date: "2026-11-01"}));
  await allow("trainer reads their client's DEXA scan", () => getDoc(doc(coach, "users/asha/dexa/d1")));
  await deny("trainer reads a private health report", () => getDoc(doc(coach, "users/asha/reports/private")));
  await allow("trainer reads a shared health report", () => getDoc(doc(coach, "users/asha/reports/shared")));
  await deny("gym owner reads a client's workouts", () => getDoc(doc(gita, "users/asha/sessions/s1")));
  await deny("gym owner reads a shared health report", () => getDoc(doc(gita, "users/asha/reports/shared")));
  await deny("client writes to an unknown collection", () => setDoc(doc(asha, "users/asha/secrets/x"), {a: 1}));

  console.log("Codes");
  await allow("signed-in user looks up one invite code", () => getDoc(doc(bob, "codes/ABC123")));
  await deny("signed-in user lists all invite codes", () => getDocs(collection(bob, "codes")));
  await deny("signed-in user lists all buddy codes", () => getDocs(collection(bob, "buddycodes")));
  await deny("signed-in user lists all gym codes", () => getDocs(collection(bob, "gymcodes")));
  await deny("client creates a trainer invite code", () => setDoc(doc(bob, "codes/FAKE01"), {trainerId: "bob"}));

  console.log("Boards, buddies and the gym owner");
  await deny("stranger reads a hidden public summary", () => getDoc(doc(bob, "public/asha")));
  await allow("trainer reads their client's public summary", () => getDoc(doc(coach, "public/asha")));
  await allow("gym owner reads a client summary of their trainer", () => getDoc(doc(gita, "public/asha")));
  await deny("stranger adds themselves as a buddy without the code", () => updateDoc(doc(bob, "public/asha"), {buddies: ["bob"], joinCode: "WRONG1"}));
  await allow("user adds themselves as a buddy with the buddy code", () => updateDoc(doc(bob, "public/asha"), {buddies: ["bob"], joinCode: "ASHA77"}));
  await deny("buddy adds someone else as a buddy", () => updateDoc(doc(bob, "public/asha"), {buddies: ["bob", "eve"], joinCode: "ASHA77"}));
  await allow("buddy removes themselves", () => updateDoc(doc(bob, "public/asha"), {buddies: [], joinCode: "ASHA77"}));
  await allow("gym owner reads their gym", () => getDoc(doc(gita, "gyms/gita")));
  await allow("trainer in the gym reads the gym", () => getDoc(doc(coach, "gyms/gita")));
  await deny("client reads someone's gym", () => getDoc(doc(bob, "gyms/gita")));

  console.log("Challenges, notes and alerts");
  await allow("client reads their trainer's challenge", () => getDoc(doc(asha, "challenges/c1")));
  await deny("other client reads the challenge", () => getDoc(doc(bob, "challenges/c1")));
  await allow("client joins their trainer's challenge", () => setDoc(doc(asha, "challenges/c1/entries/asha"), {name: "Asha", value: 0}));
  await deny("client joins another trainer's challenge", () => setDoc(doc(bob, "challenges/c1/entries/bob"), {name: "Bob", value: 0}));
  await deny("client reads the trainer's private notes", () => getDoc(doc(asha, "trainers/coach/notes/n1")));
  await allow("trainer reads their own notes", () => getDoc(doc(coach, "trainers/coach/notes/n1")));
  await allow("client sends their trainer a workout alert", () => addDoc(collection(asha, "trainers/coach/alerts"), {clientId: "asha", title: "Day B"}));
  await deny("client sends an alert pretending to be someone else", () => addDoc(collection(asha, "trainers/coach/alerts"), {clientId: "bob", title: "Day B"}));
  await deny("client sends an alert to a trainer they don't have", () => addDoc(collection(bob, "trainers/coach/alerts"), {clientId: "bob", title: "Day B"}));
  await allow("client finds their own alerts", () => getDocs(query(collection(asha, "trainers/coach/alerts"), where("clientId", "==", "asha"))));
  await deny("client lists all of the trainer's alerts", () => getDocs(collection(asha, "trainers/coach/alerts")));

  console.log("Approval, attendance and classes");
  await deny("client logs a workout that says it's approved", () => setDoc(doc(asha, "users/asha/sessions/s3"), {date: "2026-11-06", approved: {by: "coach", at: "2026-11-06"}}));
  await deny("client approves their own workout", () => updateDoc(doc(asha, "users/asha/sessions/s9"), {approved: {by: "asha", at: "2026-11-05"}}));
  await deny("client removes their trainer's approval", () => setDoc(doc(asha, "users/asha/sessions/ok1"), {date: "2026-11-04", title: "Day B"}));
  await allow("client edits an approved workout and keeps the approval", () => setDoc(doc(asha, "users/asha/sessions/ok1"), {date: "2026-11-04", title: "Day B edited", approved: {by: "coach", at: "2026-11-04"}}));
  await allow("trainer approves their client's workout", () => updateDoc(doc(coach, "users/asha/sessions/s9"), {approved: {by: "coach", at: "2026-11-05"}}));
  await deny("another trainer approves the workout", () => updateDoc(doc(coach2, "users/asha/sessions/s2"), {approved: {by: "coach2", at: "2026-11-05"}}));
  await allow("trainer records attendance for their client", () => setDoc(doc(coach, "trainers/coach/attendance/w_s9"), {clientId: "asha", date: "2026-11-05", kind: "workout"}));
  await deny("trainer records attendance for someone else's client", () => setDoc(doc(coach, "trainers/coach/attendance/w_x"), {clientId: "bob", date: "2026-11-05", kind: "workout"}));
  await deny("client writes their own attendance", () => setDoc(doc(asha, "trainers/coach/attendance/fake"), {clientId: "asha", date: "2026-11-05", kind: "class"}));
  await deny("client reads the trainer's attendance", () => getDoc(doc(asha, "trainers/coach/attendance/w_ok1")));
  await allow("gym owner reads their trainer's attendance", () => getDocs(collection(gita, "trainers/coach/attendance")));
  await deny("another trainer reads the attendance", () => getDocs(collection(coach2, "trainers/coach/attendance")));
  await allow("trainer creates a class", () => setDoc(doc(coach, "classes/k2"), {trainerId: "coach", title: "Evening strength", days: [2, 4]}));
  await deny("client creates a class", () => setDoc(doc(asha, "classes/k3"), {trainerId: "asha", title: "Fake", days: [1]}));
  await deny("trainer creates a class in another trainer's name", () => setDoc(doc(coach2, "classes/k4"), {trainerId: "coach", title: "Fake", days: [1]}));
  await allow("client reads their trainer's classes", () => getDocs(query(collection(asha, "classes"), where("trainerId", "==", "coach"))));
  await deny("other client reads the trainer's classes", () => getDoc(doc(bob, "classes/k1")));
  await allow("gym owner reads their trainer's class", () => getDoc(doc(gita, "classes/k1")));
  await deny("another trainer edits the class", () => updateDoc(doc(coach2, "classes/k1"), {title: "Mine now"}));
  await deny("trainer hands a class to another trainer", () => updateDoc(doc(coach, "classes/k1"), {trainerId: "coach2"}));
  await allow("trainer deletes their class", () => deleteDoc(doc(coach, "classes/k2")));

  console.log("Security audit: one person reading or changing another's data");
  const mallory = as("mallory"), ravi2 = as("ravi2"), olga = as("olga");
  for (const col of ["sessions", "cardio", "body", "dexa", "reports"]){
    await deny(`stranger lists a client's ${col}`, () => getDocs(collection(mallory, `users/asha/${col}`)));
  }
  await deny("stranger lists every user", () => getDocs(collection(mallory, "users")));
  await deny("stranger lists every public summary", () => getDocs(collection(mallory, "public")));
  await deny("stranger writes into a client's workouts", () => setDoc(doc(mallory, "users/asha/sessions/x1"), {date: "2026-11-09"}));
  await deny("stranger changes a client's program", () => updateDoc(doc(mallory, "users/asha"), {program: {days: [], name: "Hacked"}}));
  await deny("signed-out visitor lists challenges", () => getDocs(collection(anon, "challenges")));
  await deny("client reads another client of the same trainer", () => getDoc(doc(ravi2, "users/asha")));
  await deny("client reads another client's workouts (same trainer)", () => getDocs(collection(ravi2, "users/asha/sessions")));
  await deny("client reads another client's check-ins (same trainer)", () => getDocs(collection(ravi2, "users/asha/body")));
  await deny("client reads their trainer's private notes list", () => getDocs(collection(ravi2, "trainers/coach/notes")));
  await deny("client reads their trainer's attendance list", () => getDocs(collection(ravi2, "trainers/coach/attendance")));

  console.log("Security audit: trainers see only their own clients");
  await allow("trainer lists their own clients", () => getDocs(query(collection(coach, "users"), where("trainerId", "==", "coach"))));
  await deny("trainer lists every user", () => getDocs(collection(coach, "users")));
  await deny("trainer reads a stranger's profile", () => getDoc(doc(coach, "users/mallory")));
  await deny("trainer lists a stranger's workouts", () => getDocs(collection(coach, "users/mallory/sessions")));
  await deny("other trainer lists the client's check-ins", () => getDocs(collection(coach2, "users/asha/body")));
  await deny("other trainer lists the client's DEXA scans", () => getDocs(collection(coach2, "users/asha/dexa")));
  await deny("trainer reads another trainer's notes", () => getDoc(doc(coach, "trainers/coach2/notes/n9")));
  await deny("trainer changes a client's settings or consent", () => updateDoc(doc(coach, "users/asha"), {"settings.intake": {}}));
  await deny("trainer rewrites what a client logged in a workout", () => updateDoc(doc(coach, "users/asha/sessions/s1"), {title: "Changed by trainer", exercises: []}));
  await allow("trainer approves a workout (only the approval changes)", () => updateDoc(doc(coach, "users/asha/sessions/s1"), {approved: {by: "coach", at: "2026-11-09"}}));

  console.log("Security audit: gym owners see summaries of their own trainers' clients only");
  await deny("gym owner lists a client's check-ins", () => getDocs(collection(gita, "users/asha/body")));
  await deny("gym owner lists a client's DEXA scans", () => getDocs(collection(gita, "users/asha/dexa")));
  await deny("gym owner reads the trainer's private notes", () => getDocs(collection(gita, "trainers/coach/notes")));
  await deny("gym owner reads the trainer's alerts", () => getDocs(collection(gita, "trainers/coach/alerts")));
  await deny("gym owner reads a trainer outside their gym", () => getDoc(doc(gita, "users/coach2")));
  await deny("another gym's owner reads this trainer's attendance", () => getDocs(collection(olga, "trainers/coach/attendance")));
  await deny("another gym's owner reads this trainer's client summaries", () => getDocs(query(collection(olga, "public"), where("trainerId", "==", "coach"))));
  await deny("another gym's owner reads this trainer's classes", () => getDoc(doc(olga, "classes/k1")));

  console.log("Security audit: gym codes");
  await deny("stranger takes over a gym's join code", () => setDoc(doc(mallory, "gymcodes/GYM123"), {gymId: "mallory", name: "Fake gym"}));
  await deny("another gym owner takes over a gym's join code", () => setDoc(doc(olga, "gymcodes/GYM123"), {gymId: "olga", name: "Other gym"}));
  await deny("a client (not a gym owner) creates a gym join code", () => setDoc(doc(mallory, "gymcodes/MAL999"), {gymId: "mallory", name: "Not a gym"}));
  await allow("gym owner creates their own gym join code", () => setDoc(doc(olga, "gymcodes/OLG123"), {gymId: "olga", name: "Other gym"}));
  await allow("gym owner renames their own gym join code", () => updateDoc(doc(gita, "gymcodes/GYM123"), {name: "Primal Gym HSR"}));
  await deny("gym owner hands their join code to another gym", () => updateDoc(doc(gita, "gymcodes/GYM123"), {gymId: "olga"}));
  await deny("trainer joins a gym through a code that points elsewhere", () => updateDoc(doc(coach2, "users/coach2"), {gymId: "mallory", gymCode: "GYM123"}));
  await allow("gym owner deletes their own join code", () => deleteDoc(doc(olga, "gymcodes/OLG123")));

  console.log("Deleting an account");
  await deny("stranger deletes a client's account", () => deleteDoc(doc(bob, "users/asha")));
  await deny("trainer deletes their client's account", () => deleteDoc(doc(coach, "users/asha")));
  await allow("client deletes their own alert", () => deleteDoc(doc(asha, "trainers/coach/alerts/a1")));
  await allow("client deletes their own workouts", () => deleteDoc(doc(asha, "users/asha/sessions/s1")));
  await allow("client deletes their own public summary", () => deleteDoc(doc(asha, "public/asha")));
  await allow("client deletes their own buddy code", () => deleteDoc(doc(asha, "buddycodes/ASHA77")));
  await allow("client deletes their own account", () => deleteDoc(doc(asha, "users/asha")));

  await env.cleanup();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed){ console.log(`::error title=Database rules tests::${failed} rule check(s) failed — see the log above`); process.exit(1); }
  process.exit(0);
})().catch(e => { console.log("::error title=Database rules tests::" + (e && e.message || e)); process.exit(1); });
