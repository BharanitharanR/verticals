// scroll-reveal
const observer = new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) e.target.classList.add('in');
}), { threshold: .12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// vertical-card artwork AND the header logo mark: color follows the
// cursor's horizontal position (see .art-color's mask-image in
// styles.css). Plain mousemove drives it on desktop; :hover has no real
// equivalent on a touchscreen (there's no cursor sitting still on the
// element), so a tap toggles a .touch-active class instead - styles.css
// triggers the same reveal from either. --mx defaults to center (50%) on
// tap since there's no cursor position to read.
document.querySelectorAll('.card-art, .brand-mark').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    card.style.setProperty('--mx', `${pct}%`);
  });
  card.addEventListener('touchstart', e => {
    const touch = e.touches[0];
    const rect = card.getBoundingClientRect();
    const pct = ((touch.clientX - rect.left) / rect.width) * 100;
    card.style.setProperty('--mx', `${pct}%`);
    card.classList.add('touch-active');
  }, { passive: true });
  card.addEventListener('touchend', () => {
    setTimeout(() => card.classList.remove('touch-active'), 400);
  });
});

// system-bar live clock, echoing the reference interface's own timestamp
const clockEl = document.querySelector('#sysClock');
if (clockEl) {
  const tick = () => { clockEl.textContent = new Date().toLocaleTimeString('en-GB'); };
  tick();
  setInterval(tick, 1000);
}

// live "build my assistant" demo — talks to Adiyan's own backend
// (mesh/mcp/whatsapp/verticals_demo.py), reachable through the same ngrok
// tunnel already exposing its WhatsApp webhook. NOTE: this is a free-tier
// ngrok URL, not a reserved domain — it changes if that tunnel restarts,
// and this constant has to be updated (and the site republished) to match
// whenever it does.
const API_BASE = 'https://exciting-shock-unvented.ngrok-free.dev';

// Confirmed live: ngrok's own free-tier tunnels serve an interstitial HTML
// "you're about to visit..." warning page (ERR_NGROK_6024) in place of the
// real response when a request looks like it came from a browser - this is
// ngrok's documented bypass, required on every request through the tunnel
// or a real visitor's fetch() gets HTML back where JSON was expected.
const API_HEADERS = { 'ngrok-skip-browser-warning': 'true' };

const demoForm = document.querySelector('#demoForm');
const demoInput = document.querySelector('#demoInput');
const verticalsDemo = document.querySelector('#verticalsDemo');
const demoSubmit = document.querySelector('#demoSubmit');
const demoResult = document.querySelector('#demoResult');
const demoError = document.querySelector('#demoError');

// READY dot's colorful blink (styles.css's .status-dot.disco) grays out and
// freezes the moment a visitor actually starts writing their description -
// see #verticalsDemo.interacting there - so it never competes with someone
// trying to read what they just typed. Real focus/blur, not tied to the
// build flow itself.
if (verticalsDemo && demoInput) {
  demoInput.addEventListener('focus', () => verticalsDemo.classList.add('interacting'));
  demoInput.addEventListener('blur', () => verticalsDemo.classList.remove('interacting'));
}

function waLink(phone, text) {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

// A plain <a href> to the PDF can't carry API_HEADERS (a real page
// navigation, not fetch) - it would hit the exact same ngrok interstitial
// the polling fix above works around. Fetched as a blob instead, so the
// bypass header applies here too.
async function downloadPdf(url, filename) {
  try {
    const res = await fetch(url, { headers: API_HEADERS });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    showError("Couldn't download the config right now — try again in a moment.");
  }
}

function showResult(data) {
  demoError.hidden = true;
  // whatsapp_number is used to build the wa.me link only - never rendered
  // as visible text on the page.
  const link = waLink(data.whatsapp_number, data.summon_phrase);
  demoResult.innerHTML = `
    <p class="demo-result-title">“${data.business_name}” is live.</p>
    <p>Say <strong>“${data.summon_phrase}”</strong> to reach it — just tap below.</p>
    <div class="demo-result-actions">
      <a class="button" href="${link}" target="_blank" rel="noopener">MESSAGE IT ON WHATSAPP <span>→</span></a>
      <button type="button" class="text-link" id="demoPdfLink">Download the config (PDF) ↓</button>
    </div>
    <p class="demo-result-note">This demo deactivates automatically in about an hour.</p>
  `;
  demoResult.hidden = false;
  document.querySelector('#demoPdfLink').addEventListener('click', () => {
    downloadPdf(`${API_BASE}${data.pdf_url}`, `${data.vertical_id}.pdf`);
  });
}

function showError(message) {
  demoResult.hidden = true;
  demoError.textContent = message;
  demoError.hidden = false;
}

// Confirmed live: end to end (reading the description, writing the config,
// and — when the description implies one — creating and activating a real
// n8n workflow) can take up to ~100 seconds on ordinary hardware. Holding
// ONE fetch open that long is fragile — confirmed live that a weak mobile
// connection killed it outright partway through. So the backend starts the
// work as a background job and returns immediately; this polls for the
// result instead of waiting on one long request, so a dropped poll never
// loses the work in progress, it just gets picked up on the next poll.
const BUILD_STAGES = [
  'READING YOUR BUSINESS…',
  'WRITING YOUR ASSISTANT…',
  'SETTING UP WHATSAPP…',
  'ALMOST THERE…',
];
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pollJob(jobId) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    let data;
    try {
      const res = await fetch(`${API_BASE}/verticals/status/${jobId}`, { headers: API_HEADERS });
      data = await res.json();
    } catch (err) {
      // A single dropped poll on a flaky connection isn't fatal — the
      // background job keeps running regardless; just try again.
      continue;
    }
    if (data.status === 'done') return data.result;
    if (data.status === 'not_found') throw new Error('job not found');
    // 'pending' — keep polling
  }
  throw new Error('timed out waiting for a result');
}

if (demoForm) {
  demoForm.addEventListener('submit', async e => {
    e.preventDefault();
    const description = demoInput.value.trim();
    if (!description) return;

    demoSubmit.disabled = true;
    demoResult.hidden = true;
    demoError.hidden = true;

    let stage = 0;
    demoSubmit.textContent = BUILD_STAGES[0];
    const stageTimer = setInterval(() => {
      stage = Math.min(stage + 1, BUILD_STAGES.length - 1);
      demoSubmit.textContent = BUILD_STAGES[stage];
    }, 12000);

    try {
      const startRes = await fetch(`${API_BASE}/verticals/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...API_HEADERS },
        body: JSON.stringify({ description }),
      });
      const started = await startRes.json();
      if (!started.ok) {
        showError(started.error || "Couldn't start that right now — try again in a moment.");
        return;
      }
      const result = await pollJob(started.job_id);
      if (result.ok) {
        showResult(result);
      } else {
        showError(result.error || "Couldn't build that right now — try again in a moment.");
      }
    } catch (err) {
      showError("Couldn't reach the demo right now — try again in a moment.");
    } finally {
      clearInterval(stageTimer);
      demoSubmit.disabled = false;
      demoSubmit.innerHTML = 'BUILD MY ASSISTANT <span>→</span>';
    }
  });
}
