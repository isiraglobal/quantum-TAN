(function () {
  'use strict';

  // ==========================================================================
  // Utility Functions
  // ==========================================================================
  function $(selector, context = document) {
    return context.querySelector(selector);
  }

  function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  }

  function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'class') el.className = value;
      else if (key === 'style') Object.assign(el.style, value);
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
      else if (key === 'dataset') Object.entries(value).forEach(([k, v]) => el.dataset[k] = v);
      else el.setAttribute(key, value);
    });
    children.forEach(child => {
      if (typeof child === 'string') el.appendChild(document.createTextNode(child));
      else if (child instanceof Node) el.appendChild(child);
    });
    return el;
  }

  function showToast(message, type = 'success') {
    const container = $('#toastContainer');
    if (!container) return;
    const toast = createElement('div', {
      class: `toast toast--${type}`,
      role: 'alert',
      'aria-live': 'polite'
    }, [message]);
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  function showModal(id) {
    const modal = $(`#${id}`);
    if (modal) {
      modal.classList.add('is-visible');
      document.body.style.overflow = 'hidden';
      const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable) focusable.focus();
    }
  }

  function closeModal(id) {
    const modal = $(`#${id}`);
    if (modal) {
      modal.classList.remove('is-visible');
      document.body.style.overflow = '';
    }
  }

  function initModals() {
    $$('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal(overlay.id);
      });
    });

    $$('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.closest('.modal-overlay').id));
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        $$('.modal-overlay.is-visible').forEach(m => closeModal(m.id));
      }
    });

    $('#privacyLink')?.addEventListener('click', e => { e.preventDefault(); showModal('privacyModal'); });
    $('#termsLink')?.addEventListener('click', e => { e.preventDefault(); showModal('termsModal'); });
  }

  // ==========================================================================
  // Header & Navigation
  // ==========================================================================
  function initHeader() {
    const header = $('.site-header');
    const menuToggle = $('[data-menu-toggle]');
    const nav = $('[data-nav]');
    let lastScrollY = window.scrollY;

    function updateHeader() {
      const currentScrollY = Math.max(0, window.scrollY);
      const isScrollingDown = currentScrollY > lastScrollY;
      const isMenuOpen = nav?.classList.contains('is-open');
      const shouldHide = isScrollingDown && currentScrollY > 80 && !isMenuOpen;

      header?.classList.toggle('hidden', shouldHide);
      header?.classList.toggle('scrolled', currentScrollY > 50);
      lastScrollY = currentScrollY;
    }

    if (menuToggle && nav) {
      menuToggle.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('is-open');
        menuToggle.setAttribute('aria-expanded', isOpen);
      });

      $$('a', nav).forEach(link => {
        link.addEventListener('click', () => {
          nav.classList.remove('is-open');
          menuToggle.setAttribute('aria-expanded', 'false');
        });
      });
    }

    window.addEventListener('scroll', () => requestAnimationFrame(updateHeader), { passive: true });
    updateHeader();
  }

  // ==========================================================================
  // Lead Capture Modal
  // ==========================================================================
  function initLeadModal() {
    const modal = $('#leadModal');
    const closeBtn = $('#leadCloseBtn');
    const skipBtn = $('#leadSkipBtn');
    const form = $('#leadModalForm');
    const submitBtn = $('#leadSubmitBtn');

    if (!modal) return;

    const hasSeenModal = sessionStorage.getItem('qaf_modal_seen');
    if (!hasSeenModal) {
      setTimeout(() => {
        modal.classList.add('is-visible');
        document.body.style.overflow = 'hidden';
        $('#leadName')?.focus();
      }, 1200);
    }

    function hideModal() {
      modal.classList.remove('is-visible');
      document.body.style.overflow = '';
      sessionStorage.setItem('qaf_modal_seen', 'true');
    }

    closeBtn?.addEventListener('click', hideModal);
    skipBtn?.addEventListener('click', hideModal);
    modal.addEventListener('click', e => { if (e.target === modal) hideModal(); });

    form?.addEventListener('submit', async e => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Signing up...</span>';

      const formData = new FormData(form);
      const payload = {
        formType: 'submission',
        name: formData.get('name') || '',
        email: formData.get('email') || '',
        phone: formData.get('phone') || '',
        location: '',
        inquiryType: 'popup',
        message: ''
      };

      try {
        await submitForm(payload);
        showToast('Welcome to the community!', 'success');
        hideModal();
        form.reset();
      } catch (err) {
        showToast('Something went wrong. Please try again.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Join the Community</span>';
      }
    });
  }

  // ==========================================================================
  // Form Submission
  // ==========================================================================
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby6kcPiiVogv0eW28pp8-FDfIoNsv7QdPfJGjUqasz4YO8oFdcml55CxktgKHPqcJdUxg/exec';

  async function submitForm(payload) {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || result.success === false) {
      throw new Error(result.error || 'Submission failed');
    }
    return result;
  }

  function initForms() {
    // Contact Form
    const contactForm = $('#contactForm');
    const contactSubmitBtn = $('#contactSubmitBtn');
    const contactFeedback = $('#contactFeedback');

    contactForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const btnText = contactSubmitBtn?.querySelector('.btn-text');
      const btnSpinner = contactSubmitBtn?.querySelector('.btn-spinner');

      if (contactSubmitBtn) contactSubmitBtn.disabled = true;
      if (btnText) btnText.textContent = 'Sending...';
      if (btnSpinner) btnSpinner.style.display = 'inline-block';
      if (contactFeedback) { contactFeedback.style.display = 'none'; contactFeedback.className = 'form-feedback'; }

      const formData = new FormData(contactForm);
      const payload = {
        formType: 'submission',
        name: formData.get('name') || '',
        email: formData.get('email') || '',
        phone: formData.get('phone') || '',
        location: formData.get('location') || '',
        inquiryType: formData.get('inquiryType') || '',
        message: formData.get('message') || ''
      };

      try {
        await submitForm(payload);
        if (contactFeedback) {
          contactFeedback.style.display = 'block';
          contactFeedback.className = 'form-feedback form-feedback--success';
          contactFeedback.textContent = 'Thank you! Your message has been sent. A chapter lead will be in touch soon.';
        }
        contactForm.reset();
      } catch (err) {
        if (contactFeedback) {
          contactFeedback.style.display = 'block';
          contactFeedback.className = 'form-feedback form-feedback--error';
          contactFeedback.textContent = 'Something went wrong. Please try again or email us directly.';
        }
      } finally {
        if (contactSubmitBtn) contactSubmitBtn.disabled = false;
        if (btnText) btnText.textContent = 'Submit';
        if (btnSpinner) btnSpinner.style.display = 'none';
      }
    });

    // Newsletter Form
    const newsletterForm = $('#newsletterForm');
    const newsletterSubmitBtn = $('#newsletterSubmitBtn');
    const newsletterFeedback = $('#newsletterFeedback');

    newsletterForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const emailInput = $('#newsletterEmail');

      if (newsletterSubmitBtn) newsletterSubmitBtn.disabled = true;

      const payload = {
        formType: 'submission',
        name: '',
        email: emailInput?.value || '',
        phone: '',
        location: '',
        inquiryType: 'newsletter',
        message: ''
      };

      try {
        await submitForm(payload);
        if (newsletterFeedback) {
          newsletterFeedback.style.display = 'block';
          newsletterFeedback.className = 'form-feedback form-feedback--success';
          newsletterFeedback.textContent = 'Subscribed successfully!';
        }
        newsletterForm.reset();
      } catch (err) {
        if (newsletterFeedback) {
          newsletterFeedback.style.display = 'block';
          newsletterFeedback.className = 'form-feedback form-feedback--error';
          newsletterFeedback.textContent = 'Something went wrong. Please try again.';
        }
      } finally {
        if (newsletterSubmitBtn) newsletterSubmitBtn.disabled = false;
      }
    });

    // Footer year
    const footerYear = $('#footerYear');
    if (footerYear) footerYear.textContent = new Date().getFullYear();
  }

  // ==========================================================================
  // Interactive Map (Leaflet)
  // ==========================================================================
  let map = null;
  let userMarker = null;
  let userCircle = null;
  let currentTool = 'pin';

  function loadLeaflet(cb) {
    if (window.L) { cb(); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = cb;
    document.body.appendChild(script);
  }

  function saveUserPin(latlng) {
    try {
      localStorage.setItem('qaf_user_pin', JSON.stringify({ lat: latlng.lat, lng: latlng.lng }));
    } catch (e) {}
  }

  function loadUserPin() {
    try {
      const raw = localStorage.getItem('qaf_user_pin');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.lat && data.lng && window.L) {
          placeUserPin(L.latLng(data.lat, data.lng));
        }
      }
    } catch (e) {}
  }

  function placeUserPin(latlng) {
    if (!map || !window.L) return;

    if (userMarker) {
      userMarker.setLatLng(latlng);
    } else {
      userMarker = L.marker(latlng, { draggable: true }).addTo(map);
      userMarker.bindPopup('<strong>Your Foraging Area</strong><br>Drag to adjust. Click "Set Range" to change radius.');
      userMarker.on('dragend', () => {
        const pos = userMarker.getLatLng();
        if (userCircle) userCircle.setLatLng(pos);
        saveUserPin(pos);
        updateCoordDisplay(pos);
        showToast('Pin location updated', 'success');
      });
    }

    const radiusMeters = 25 * 1609.34; // 25 miles default
    if (userCircle) {
      userCircle.setLatLng(latlng);
      userCircle.setRadius(radiusMeters);
    } else {
      userCircle = L.circle(latlng, {
        radius: radiusMeters,
        color: '#6b8e68',
        fillColor: 'rgba(107, 142, 104, 0.15)',
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.2
      }).addTo(map);
    }

    map.setView(latlng, Math.max(map.getZoom(), 8));
    saveUserPin(latlng);
    updateCoordDisplay(latlng);

    $('#removeMapPin')?.style.setProperty('display', 'inline-flex', 'important');
    setRadiusToolState(false);
  }

  function removeUserPin() {
    if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
    if (userCircle) { map.removeLayer(userCircle); userCircle = null; }
    try { localStorage.removeItem('qaf_user_pin'); } catch (e) {}
    $('#removeMapPin')?.style.setProperty('display', 'none', 'important');
    $('#coordDisplay').textContent = 'No location selected';
    $('#radiusDisplay').style.display = 'none';
    showToast('Pin removed', 'success');
    setPinToolState(true);
  }

  function updateCoordDisplay(latlng) {
    const coordDisplay = $('#coordDisplay');
    const radiusDisplay = $('#radiusDisplay');
    if (coordDisplay) {
      coordDisplay.textContent = `📍 ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
    }
    if (radiusDisplay && userCircle) {
      const miles = (userCircle.getRadius() / 1609.34).toFixed(0);
      radiusDisplay.textContent = `📏 ${miles} mile radius`;
      radiusDisplay.style.display = 'inline';
    }
  }

  function setPinToolState(active) {
    const pinBtn = $('#pinTool');
    const radiusBtn = $('#radiusTool');
    if (pinBtn) {
      pinBtn.classList.toggle('active', active);
      pinBtn.setAttribute('aria-pressed', active);
    }
    if (radiusBtn) {
      radiusBtn.classList.toggle('active', !active);
      radiusBtn.setAttribute('aria-pressed', !active);
    }
    currentTool = active ? 'pin' : 'radius';
  }

  function setRadiusToolState(active) {
    setPinToolState(!active);
  }

  function initMap() {
    const container = $('#map');
    if (!container || map) return;

    loadLeaflet(() => {
      map = L.map('map', {
        center: [39.5, -76.5],
        zoom: 6,
        zoomControl: true,
        scrollWheelZoom: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Map click handler
      map.on('click', e => {
        if (currentTool === 'pin') {
          placeUserPin(e.latlng);
          showToast('Pin dropped', 'success');
        }
      });

      // Toolbar buttons
      const pinBtn = $('#pinTool');
      const radiusBtn = $('#radiusTool');
      const removeBtn = $('#removeMapPin');
      const exportBtn = $('#exportMap');

      pinBtn?.addEventListener('click', () => setPinToolState(true));
      radiusBtn?.addEventListener('click', () => {
        setPinToolState(false);
        if (!userMarker) {
          showToast('Drop a pin first, then set your range', 'success');
        } else {
          showToast('Drag the pin to adjust center, or re-click map', 'success');
        }
      });
      removeBtn?.addEventListener('click', removeUserPin);
      exportBtn?.addEventListener('click', exportGPX);

      loadUserPin();

      // Ensure map renders correctly
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 500);
    });
  }

  function exportGPX() {
    if (!userMarker) {
      showToast('Drop a pin on the map first', 'error');
      return;
    }
    const latlng = userMarker.getLatLng();
    const radius = userCircle ? userCircle.getRadius() : 0;
    const miles = (radius / 1609.34).toFixed(1);

    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="QuantumAggForage" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>QuantumAggForage Foraging Area</name>
    <desc>Foraging location and travel radius exported from QuantumAggForage</desc>
    <author><name>QuantumAggForage</name></author>
  </metadata>
  <wpt lat="${latlng.lat}" lon="${latlng.lng}">
    <name>My Foraging Spot</name>
    <desc>Center point for foraging activities</desc>
  </wpt>
  ${radius > 0 ? `<rte>
    <name>Travel Radius (${miles} miles)</name>
    <desc>Approximate circular travel area</desc>
    <rtept lat="${latlng.lat}" lon="${latlng.lng}"><name>Center</name></rtept>
  </rte>` : ''}
</gpx>`;

    const blob = new Blob([gpx.trim()], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-forage-area.gpx';
    a.click();
    URL.revokeObjectURL(url);
    showToast('GPX file downloaded', 'success');
  }

  // Initialize map when section is visible
  if ('IntersectionObserver' in window) {
    const mapObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          initMap();
          mapObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '100px' });
    const mapSection = $('#map-section');
    if (mapSection) mapObserver.observe(mapSection);
  } else {
    initMap();
  }

  // ==========================================================================
  // Smooth Scroll for Anchor Links
  // ==========================================================================
  $$('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const targetId = anchor.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        const headerOffset = 80;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        target.focus({ preventScroll: true });
      }
    });
  });

  // ==========================================================================
  // Intersection Observer for Scroll Animations
  // ==========================================================================
  function initScrollAnimations() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    $$('.section, .feature-card, .editorial-split > *, .process-step, .map-wrapper, .contact-form').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(el);
    });

    // Add visible class styles dynamically
    const style = document.createElement('style');
    style.textContent = `
      .section.is-visible, .feature-card.is-visible, .editorial-split > *.is-visible, .process-step.is-visible, .map-wrapper.is-visible, .contact-form.is-visible {
        opacity: 1 !important;
        transform: translateY(0) !important;
      }
      .feature-card { transition-delay: calc(var(--delay, 0) * 100ms); }
    `;
    document.head.appendChild(style);

    // Stagger feature cards
    $$('.feature-card').forEach((card, i) => card.style.setProperty('--delay', i));
    $$('.process-step').forEach((step, i) => step.style.setProperty('--delay', i));
  }

  // ==========================================================================
  // Initialize Everything
  // ==========================================================================
  function init() {
    initHeader();
    initModals();
    initLeadModal();
    initForms();
    initScrollAnimations();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();