/* ==========================================================
   B&C Consult — Main Script
========================================================== */

/* --- Navbar scroll effect -------------------------------- */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
  highlightActiveSection();
}, { passive: true });

/* --- Mobile menu ---------------------------------------- */
const hamburger = document.getElementById('hamburger');
const navEl     = document.getElementById('navEl');

hamburger.addEventListener('click', () => {
  const isOpen = navEl.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(isOpen));
  document.body.style.overflow = isOpen ? 'hidden' : '';
  const spans = hamburger.querySelectorAll('span');
  if (isOpen) {
    spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
    spans[1].style.opacity   = '0';
    spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
  } else {
    resetHamburger(spans);
  }
});

function resetHamburger(spans = hamburger.querySelectorAll('span')) {
  spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navEl.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    resetHamburger();
  });
});

/* --- Active nav on scroll -------------------------------- */
function highlightActiveSection() {
  const scrollPos = window.scrollY + 140;
  document.querySelectorAll('section[id]').forEach(section => {
    const link = document.querySelector(`.nav-link[href="#${section.id}"]`);
    if (!link) return;
    const inView = scrollPos >= section.offsetTop &&
                   scrollPos < section.offsetTop + section.offsetHeight;
    link.classList.toggle('active', inView);
  });
}

/* --- Scroll reveal (IntersectionObserver) --------------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (!entry.isIntersecting) return;
    const delay = parseInt(entry.target.dataset.revealDelay || 0, 10);
    setTimeout(() => entry.target.classList.add('visible'), delay);
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach((el, index) => {
  el.dataset.revealDelay = (index % 4) * 100;
  revealObserver.observe(el);
});

/* --- Inquiry form submission ----------------------------- */
const form = document.getElementById('inquiryForm');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const btn     = form.querySelector('.submit-btn');
    const btnText = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.btn-spinner');

    btnText.textContent = 'Sending…';
    spinner.hidden      = false;
    btn.disabled        = true;

    try {
      const res = await fetch(form.action, {
        method:  'POST',
        body:    new FormData(form),
        headers: { 'Accept': 'application/json' },
      });

      if (res.ok) {
        showToast('✓ Inquiry sent! We\'ll respond within 24 hours.', 'success');
        form.reset();
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.errors) {
          throw new Error(data.errors.map(err => err.message).join(', '));
        }
        throw new Error('Server error — please try again.');
      }
    } catch (err) {
      showToast(err.message || 'Something went wrong. Please email us directly.', 'error');
    } finally {
      btnText.textContent = 'Submit Inquiry';
      spinner.hidden      = true;
      btn.disabled        = false;
    }
  });

  /* Clear error styling on input */
  form.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('input', () => field.classList.remove('error'));
  });
}

function validateForm() {
  const required = form.querySelectorAll('[required]');
  let valid = true;
  required.forEach(field => {
    field.classList.remove('error');
    if (!field.value.trim()) {
      field.classList.add('error');
      valid = false;
    }
  });
  if (!valid) {
    showToast('Please fill in all required fields.', 'error');
    const firstError = form.querySelector('.error');
    firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return valid;
}

/* --- Toast notification --------------------------------- */
let toastTimer;
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className   = `toast show ${type}`;
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 5000);
}

/* --- Deadline minimum date ------------------------------ */
const deadlineInput = document.getElementById('deadline');
if (deadlineInput) {
  const today = new Date();
  today.setDate(today.getDate() + 1);
  deadlineInput.setAttribute('min', today.toISOString().split('T')[0]);
}

/* --- Smooth scroll for all anchor links ----------------- */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = navbar.offsetHeight + 16;
    const top    = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* --- Stripe payment link guard -------------------------- */
document.querySelectorAll('a[href*="YOUR_"]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Payment setup in progress — please inquire for pricing.', '');
  });
});
