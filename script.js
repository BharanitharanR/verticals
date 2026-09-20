// scroll-reveal
const observer = new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) e.target.classList.add('in');
}), { threshold: .12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// custom cursor
const cursor = document.querySelector('#cursorDot');
if (cursor) {
  window.addEventListener('pointermove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });
  document.querySelectorAll('a,button,textarea,.vertical-card-simple,summary').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.style.width = '30px';
      cursor.style.height = '30px';
      cursor.style.background = 'rgba(240,230,220,.08)';
    });
    el.addEventListener('mouseleave', () => {
      cursor.style.width = '10px';
      cursor.style.height = '10px';
      cursor.style.background = 'transparent';
    });
  });
}

// live "build my assistant" demo — talks to Adiyan's own backend
// (mesh/mcp/whatsapp/verticals_demo.py), reachable through the same ngrok
// tunnel already exposing its WhatsApp webhook. NOTE: this is a free-tier
// ngrok URL, not a reserved domain — it changes if that tunnel restarts,
// and this constant has to be updated (and the site republished) to match
// whenever it does.
const API_BASE = 'https://exciting-shock-unvented.ngrok-free.dev';

const demoForm = document.querySelector('#demoForm');
const demoInput = document.querySelector('#demoInput');
const demoSubmit = document.querySelector('#demoSubmit');
const demoResult = document.querySelector('#demoResult');
const demoError = document.querySelector('#demoError');

function waLink(phone, text) {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function showResult(data) {
  demoError.hidden = true;
  const link = waLink(data.whatsapp_number, data.summon_phrase);
  demoResult.innerHTML = `
    <p class="demo-result-title">“${data.business_name}” is live.</p>
    <p>Message <strong>${data.whatsapp_number}</strong> and say <strong>“${data.summon_phrase}”</strong> — or just tap below.</p>
    <div class="demo-result-actions">
      <a class="button crimson" href="${link}" target="_blank" rel="noopener">MESSAGE IT ON WHATSAPP <span>→</span></a>
      <a class="text-link" href="${API_BASE}${data.pdf_url}" target="_blank" rel="noopener">Download the config (PDF) ↓</a>
    </div>
    <p class="demo-result-note">This demo deactivates automatically in about an hour.</p>
  `;
  demoResult.hidden = false;
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
    try {
      const res = await fetch(`${API_BASE}/verticals/status/${jobId}`);
      const data = await res.json();
      if (data.status === 'done') return data.result;
      if (data.status === 'not_found') throw new Error('job not found');
      // 'pending' — keep polling
    } catch (err) {
      // A single dropped poll on a flaky connection isn't fatal — the
      // background job keeps running regardless; just try again.
    }
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
        headers: { 'Content-Type': 'application/json' },
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
