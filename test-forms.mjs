// Test payload script — sends test submissions for all 4 form types
// to the QuantumAggForage Google Script endpoint.

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby6kcPiiVogv0eW28pp8-FDfIoNsv7QdPfJGjUqasz4YO8oFdcml55CxktgKHPqcJdUxg/exec";

const TEST_SUFFIX = `[TEST ${Date.now()}]`;

const payloads = [
  // 1. Join Club
  {
    formType: "join-club",
    name: `Test User Join ${TEST_SUFFIX}`,
    email: `join-${TEST_SUFFIX}@test.com`,
    phone: "555-111-2222",
    location: "Princeton, NJ",
    maxTravel: "50 miles",
    experience: "beginner",
    skills: "identification, photography",
    goals: "Learn about mushroom foraging and join group walks",
    inquiryType: "join",
    message: "I want to join the club!",
  },
  // 2. Contact
  {
    formType: "contact",
    name: `Test User Contact ${TEST_SUFFIX}`,
    email: `contact-${TEST_SUFFIX}@test.com`,
    phone: "555-333-4444",
    location: "Philadelphia, PA",
    inquiryType: "private-forage",
    message: "I would like to schedule a private foraging walk for my group of 5.",
  },
  // 3. Visitor Lead
  {
    formType: "visitor-lead",
    name: `Test Lead ${TEST_SUFFIX}`,
    email: `lead-${TEST_SUFFIX}@test.com`,
    phone: "555-555-6666",
    page: "/index.html",
  },
  // 4. Newsletter
  {
    formType: "newsletter",
    email: `newsletter-${TEST_SUFFIX}@test.com`,
  },
  // 5. Domain Contract
  {
    formType: "domain-contract",
    email: `contract-${TEST_SUFFIX}@test.com`,
    domain: "quantumaggforage.com",
    timestamp: new Date().toISOString(),
    accepted: true,
  },
];

async function send(type, data) {
  const start = Date.now();
  try {
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(data),
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    return {
      type,
      status: res.status,
      ok: res.ok,
      body: json,
      ms: Date.now() - start,
    };
  } catch (err) {
    return { type, status: 0, ok: false, error: err.message, ms: Date.now() - start };
  }
}

async function main() {
  console.log(`Sending ${payloads.length} test payloads to:\n  ${GOOGLE_SCRIPT_URL}\n`);
  const results = await Promise.all(payloads.map((p) => send(p.formType, p)));
  let allOk = true;
  for (const r of results) {
    const icon = r.ok ? "✓" : "✗";
    console.log(`${icon} [${r.type}] (${r.status}, ${r.ms}ms)`);
    if (r.ok) {
      console.log(`   → ${JSON.stringify(r.body)}`);
    } else {
      console.log(`   → ERROR: ${r.error || r.body?.raw || JSON.stringify(r.body)}`);
      allOk = false;
    }
  }
  console.log(`\n${allOk ? "All tests passed." : "Some tests failed."}`);
  process.exit(allOk ? 0 : 1);
}

main();
