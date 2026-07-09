// QuantumAggForage Pulse Handlers
// Vibecodr Pulse: https://vibecodr.space/docs/vibes-pulses

interface PulseInput {
  method: string;
  path: string;
  body: string;
  headers: Record<string, string>;
}

interface PulseEnv {
  pulse: {
    secrets: {
      RESEND_API_KEY: string;
      NOTIFICATION_EMAIL: string;
      FROM_EMAIL: string;
      DISCORD_WEBHOOK_URL?: string;
      ADMIN_EXPORT_TOKEN: string;
    };
  };
  state: {
    club: { get: (key: string) => Promise<any>; set: (key: string, val: any) => Promise<void>; list: (prefix: string) => Promise<string[]>; };
    jobs: { get: (key: string) => Promise<any>; set: (key: string, val: any) => Promise<void>; list: (prefix: string) => Promise<string[]>; };
    contacts: { get: (key: string) => Promise<any>; set: (key: string, val: any) => Promise<void>; list: (prefix: string) => Promise<string[]>; };
  };
}

interface PulseResponse {
  status: number;
  body: any;
}

function json(status: number, data: any): PulseResponse {
  return { status, body: data };
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// === Send email via Resend ===
async function sendEmail(env: PulseEnv, to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.pulse.secrets.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.pulse.secrets.FROM_EMAIL || 'onboarding@resend.dev',
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Resend error:', res.status, text);
    throw new Error(`Email send failed: ${res.status}`);
  }

  return res.json();
}

// === Send Discord webhook ===
async function sendDiscord(env: PulseEnv, content: string) {
  const url = env.pulse.secrets.DISCORD_WEBHOOK_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  } catch (err) {
    console.error('Discord webhook failed:', err);
  }
}

// === Validation helpers ===
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  return /^[\d\s\-+()]{7,20}$/.test(phone);
}

function sanitize(str: string): string {
  return str.replace(/[<>&]/g, '');
}

// ===================== ROUTER =====================

// Generate a secure random token for admin export
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const arr = new Uint32Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
    for (let i = 0; i < 32; i++) {
      result += chars[arr[i] % chars.length];
    }
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < 32; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return result;
}

const ADMIN_TOKEN = generateToken();

export default async function handler(input: PulseInput, env: PulseEnv): Promise<PulseResponse> {
  const url = new URL(input.path, 'http://localhost');
  const path = url.pathname;

  // Log required secrets on first call
  if (!env.pulse.secrets.NOTIFICATION_EMAIL || !env.pulse.secrets.RESEND_API_KEY) {
    console.warn('Warning: Missing required secrets! Set in Vibecodr dashboard:');
    console.warn('  - RESEND_API_KEY (from resend.com)');
    console.warn('  - NOTIFICATION_EMAIL (your email)');
    console.warn('  - FROM_EMAIL (e.g., noreply@quantumaggforage.com)');
    console.warn('  - DISCORD_WEBHOOK_URL (optional)');
    console.warn(`  - ADMIN_EXPORT_TOKEN (auto-generated: ${ADMIN_TOKEN})`);
  }

  // CORS preflight
  if (input.method === 'OPTIONS') {
    return { status: 204, body: null, headers: corsHeaders() };
  }

  try {
    switch (path) {
      case '/api/join-club':
        return await handleJoinClub(input, env);
      case '/api/apply':
        return await handleApply(input, env);
      case '/api/contact':
        return await handleContact(input, env);
      case '/api/admin/export':
        return await handleExport(input, env);
      default:
        return json(404, { error: 'Not found' });
    }
  } catch (err: any) {
    console.error('Pulse error:', err.message);
    return json(500, { error: 'Internal server error' });
  }
}

// ===================== HANDLERS =====================

async function handleJoinClub(input: PulseInput, env: PulseEnv): Promise<PulseResponse> {
  const body = JSON.parse(input.body || '{}');
  const { name, email, phone, location, maxTravel, experience, goals, skills } = body;

  // Validation
  const errors: string[] = [];
  if (!name?.trim()) errors.push('name');
  if (!email?.trim() || !validateEmail(email)) errors.push('email');
  if (!phone?.trim() || !validatePhone(phone)) errors.push('phone');
  if (!location) errors.push('location');
  if (!maxTravel) errors.push('maxTravel');
  if (!experience) errors.push('experience');

  if (errors.length > 0) {
    return json(400, { error: 'Validation failed', fields: errors });
  }

  const key = `club:${Date.now()}:${email}`;
  const record = {
    name: sanitize(name),
    email: sanitize(email),
    phone: sanitize(phone),
    location: sanitize(location),
    maxTravel: sanitize(maxTravel),
    experience: sanitize(experience),
    goals: sanitize(goals || ''),
    skills: Array.isArray(skills) ? skills.map(sanitize) : [],
    timestamp: new Date().toISOString(),
    source: 'landing-page',
  };

  // Store in Pulse State
  await env.state.club.set(key, record);

  // Also store index for listing
  await env.state.club.set(`club:all:${key}`, true);

  // Send welcome email to user
  try {
    await sendEmail(env, email,
      'Welcome to QuantumAggForage!',
      `<div style="font-family:Inter,sans-serif;background:#0a0f0a;color:#e8f5e8;padding:40px;max-width:600px;">
        <h1 style="color:#d4a843;font-family:Georgia,serif;">Welcome, ${sanitize(name)}!</h1>
        <p style="color:#8aa58a;font-size:16px;line-height:1.7;">Thanks for joining the QuantumAggForage club! You're now part of a growing community of foragers across NJ, PA, NY, and FL.</p>
        <div style="background:#111811;border:1px solid #2a3a2a;border-radius:12px;padding:24px;margin:24px 0;">
          <h2 style="color:#d4a843;font-size:18px;margin-bottom:12px;">Next Steps</h2>
          <ol style="color:#8aa58a;line-height:1.8;">
            <li>Join our Discord: <a href="https://discord.gg/rAArGGjpq" style="color:#d4a843;">discord.gg/rAArGGjpq</a></li>
            <li>Drop a pin on our map to show where you forage</li>
            <li>Check the calendar for upcoming walks in your area</li>
            <li>Consider becoming a Supporter (\$20 lifetime) for exclusive perks</li>
          </ol>
        </div>
        <p style="color:#5a7a5a;font-size:14px;">From Beginner to Master Forager — we're glad you're here.</p>
        <p style="color:#5a7a5a;font-size:14px;">— QAF Team</p>
      </div>`
    );
  } catch (err) {
    console.error('Welcome email failed:', err);
  }

  // Send notification to admin
  try {
    const skillsStr = Array.isArray(skills) && skills.length > 0 ? skills.join(', ') : 'None specified';
    await sendEmail(env, env.pulse.secrets.NOTIFICATION_EMAIL,
      'New Club Signup',
      `<div style="font-family:monospace;background:#0a0f0a;color:#e8f5e8;padding:20px;">
        <h2>New Club Member</h2>
        <pre style="color:#8aa58a;">${JSON.stringify(record, null, 2)}</pre>
      </div>`
    );
  } catch (err) {
    console.error('Admin notification failed:', err);
  }

  // Send Discord webhook
  await sendDiscord(env,
    `**New Club Member!**\n**${sanitize(name)}** (${sanitize(email)}) from **${sanitize(location)}** — ${sanitize(experience)}\nTravel: ${sanitize(maxTravel)} miles\nSkills: ${Array.isArray(skills) ? skills.join(', ') : 'None'}`
  );

  return json(200, { success: true, message: 'Welcome to the club!' });
}

async function handleApply(input: PulseInput, env: PulseEnv): Promise<PulseResponse> {
  const body = JSON.parse(input.body || '{}');
  const { name, email, phone, role, resumeBase64, coverLetter, locationPref, seasonal } = body;

  const errors: string[] = [];
  if (!name?.trim()) errors.push('name');
  if (!email?.trim() || !validateEmail(email)) errors.push('email');
  if (!phone?.trim() || !validatePhone(phone)) errors.push('phone');
  if (!role) errors.push('role');
  if (!resumeBase64) errors.push('resume');
  if (!coverLetter?.trim()) errors.push('coverLetter');
  if (!locationPref) errors.push('locationPref');

  if (errors.length > 0) {
    return json(400, { error: 'Validation failed', fields: errors });
  }

  const key = `job:${Date.now()}:${email}`;
  const record = {
    name: sanitize(name),
    email: sanitize(email),
    phone: sanitize(phone),
    role: sanitize(role),
    locationPref: sanitize(locationPref),
    seasonal: seasonal || 'year-round',
    coverLetter: sanitize(coverLetter),
    hasResume: !!resumeBase64,
    resumeSize: resumeBase64 ? Math.round(resumeBase64.length * 0.75 / 1024) + ' KB' : 'N/A',
    timestamp: new Date().toISOString(),
  };

  // Store in Pulse State
  await env.state.jobs.set(key, record);
  await env.state.jobs.set(`jobs:all:${key}`, true);

  // Send confirmation to applicant
  try {
    await sendEmail(env, email,
      `Application Received - ${role.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}`,
      `<div style="font-family:Inter,sans-serif;background:#0a0f0a;color:#e8f5e8;padding:40px;max-width:600px;">
        <h1 style="color:#d4a843;font-family:Georgia,serif;">Thanks, ${sanitize(name)}!</h1>
        <p style="color:#8aa58a;font-size:16px;line-height:1.7;">We've received your application for the <strong>${sanitize(role).replace('-', ' ')}</strong> position. Our team will review it and get back to you soon.</p>
        <div style="background:#111811;border:1px solid #2a3a2a;border-radius:12px;padding:24px;margin:24px 0;">
          <p style="color:#8aa58a;margin:0;">In the meantime, join our community on Discord: <a href="https://discord.gg/rAArGGjpq" style="color:#d4a843;">discord.gg/rAArGGjpq</a></p>
        </div>
        <p style="color:#5a7a5a;font-size:14px;">— QAF Team</p>
      </div>`
    );
  } catch (err) {
    console.error('Confirmation email failed:', err);
  }

  // Notify admin
  try {
    const roleName = role.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
    let bodyHtml = `<div style="font-family:monospace;background:#0a0f0a;color:#e8f5e8;padding:20px;">
      <h2>New Job Application</h2>
      <h3>${roleName}</h3>
      <pre style="color:#8aa58a;">${JSON.stringify(record, null, 2)}</pre>
      <h3>Cover Letter</h3>
      <p style="color:#8aa58a;">${sanitize(coverLetter)}</p>`;

    if (resumeBase64 && resumeBase64.length < 500000) {
      bodyHtml += `<h3>Resume (Base64)</h3>
        <p style="color:#8aa58a;word-break:break-all;">${resumeBase64}</p>`;
    }

    bodyHtml += `</div>`;

    await sendEmail(env, env.pulse.secrets.NOTIFICATION_EMAIL,
      `New Application: ${roleName} - ${sanitize(name)}`,
      bodyHtml
    );
  } catch (err) {
    console.error('Admin notification failed:', err);
  }

  // Discord webhook
  await sendDiscord(env,
    `**New Job Application**\n**${sanitize(name)}** — *${sanitize(role).replace('-', ' ')}*\nLocation: ${sanitize(locationPref)} | ${sanitize(email)}\nHas Resume: ${record.hasResume ? 'Yes' : 'No'}`
  );

  return json(200, { success: true, message: 'Application received!' });
}

async function handleContact(input: PulseInput, env: PulseEnv): Promise<PulseResponse> {
  const body = JSON.parse(input.body || '{}');
  const { name, email, phone, message, inquiryType } = body;

  const errors: string[] = [];
  if (!name?.trim()) errors.push('name');
  if (!email?.trim() || !validateEmail(email)) errors.push('email');
  if (!message?.trim()) errors.push('message');

  if (errors.length > 0) {
    return json(400, { error: 'Validation failed', fields: errors });
  }

  const key = `contact:${Date.now()}:${email}`;
  const record = {
    name: sanitize(name),
    email: sanitize(email),
    phone: sanitize(phone || ''),
    message: sanitize(message),
    inquiryType: sanitize(inquiryType || 'general'),
    timestamp: new Date().toISOString(),
  };

  await env.state.contacts.set(key, record);
  await env.state.contacts.set(`contacts:all:${key}`, true);

  // Notify admin
  try {
    await sendEmail(env, env.pulse.secrets.NOTIFICATION_EMAIL,
      `New Contact: ${sanitize(inquiryType)} - ${sanitize(name)}`,
      `<div style="font-family:monospace;background:#0a0f0a;color:#e8f5e8;padding:20px;">
        <h2>New Contact Form Submission</h2>
        <pre style="color:#8aa58a;">${JSON.stringify(record, null, 2)}</pre>
        <h3>Message</h3>
        <p style="color:#8aa58a;">${sanitize(message)}</p>
      </div>`
    );
  } catch (err) {
    console.error('Admin notification failed:', err);
  }

  // Discord webhook
  await sendDiscord(env,
    `**New Contact**\n**${sanitize(name)}** (${sanitize(email)}) — ${sanitize(inquiryType)}\n${sanitize(message).substring(0, 200)}`
  );

  return json(200, { success: true, message: 'Message received!' });
}

async function handleExport(input: PulseInput, env: PulseEnv): Promise<PulseResponse> {
  const url = new URL(input.path, 'http://localhost');
  const token = url.searchParams.get('token') || input.headers['x-admin-token'] || '';
  const type = url.searchParams.get('type') || 'club';
  const expectedToken = env.pulse.secrets.ADMIN_EXPORT_TOKEN || ADMIN_TOKEN;

  if (token !== expectedToken) {
    return json(403, { error: 'Unauthorized', hint: 'Provide ?token= in URL or x-admin-token header' });
  }

  let records: string[] = [];
  let data: any[] = [];

  switch (type) {
    case 'club':
      records = (await env.state.club.list('club:all:')) || [];
      for (const key of records) {
        const val = await env.state.club.get(key);
        if (val) data.push(val);
      }
      break;
    case 'jobs':
      records = (await env.state.jobs.list('jobs:all:')) || [];
      for (const key of records) {
        const val = await env.state.jobs.get(key);
        if (val) data.push(val);
      }
      break;
    case 'contacts':
      records = (await env.state.contacts.list('contacts:all:')) || [];
      for (const key of records) {
        const val = await env.state.contacts.get(key);
        if (val) data.push(val);
      }
      break;
    default:
      return json(400, { error: 'Invalid type' });
  }

  // Convert to CSV
  if (data.length === 0) {
    return json(200, { data: [], csv: 'No records found' });
  }

  const headers = Object.keys(data[0]);
  let csv = headers.join(',') + '\n';
  for (const row of data) {
    csv += headers.map(h => {
      const val = row[h];
      if (val === undefined || val === null) return '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
    }).join(',') + '\n';
  }

  return json(200, {
    count: data.length,
    type,
    csv,
    data: data,
  });
}
