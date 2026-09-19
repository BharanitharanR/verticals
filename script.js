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
  document.querySelectorAll('a,button,.vertical-card-simple,summary').forEach(el => {
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

// live chat demo
const RULES = [
  { test: /open|hour/i, reply: "Yes, we're open until 9 tonight. What can I help you with?" },
  { test: /price|cost|how much/i, reply: 'For 20 units, the price is ₹4,200. Want me to reserve them for you?' },
  { test: /book|appointment|schedule/i, reply: 'I can book that for you — what date and time works best?' },
  { test: /thank/i, reply: "You're welcome! Anything else I can help with?" },
  { test: /hi|hello|hey/i, reply: 'Hey! Welcome — how can I help you today?' },
];
const FALLBACK = "Got it — let me check on that and get right back to you.";

function botReplyFor(text) {
  const rule = RULES.find(r => r.test.test(text));
  return rule ? rule.reply : FALLBACK;
}

const chatMessages = document.querySelector('#chatMessages');
const chatForm = document.querySelector('#chatForm');
const chatInput = document.querySelector('#chatInput');

function appendChat(text, who) {
  const div = document.createElement('div');
  div.className = `chat ${who}`;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function sendUserMessage(text) {
  if (!text.trim()) return;
  appendChat(text, 'user');
  const typing = appendChat('typing…', 'bot typing');
  setTimeout(() => {
    typing.textContent = botReplyFor(text);
    typing.classList.remove('typing');
  }, 650);
}

if (chatForm) {
  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = chatInput.value;
    chatInput.value = '';
    sendUserMessage(text);
  });
}

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => sendUserMessage(chip.dataset.msg));
});
