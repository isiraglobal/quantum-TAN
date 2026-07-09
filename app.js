(function() {
  'use strict';

  // ====== Config ======
  const ADMIN_TOKEN_KEY = 'qaf_admin_token';
  const API_BASE = 'https://script.google.com/macros/s/AKfycby6kcPiiVogv0eW28pp8-FDfIoNsv7QdPfJGjUqasz4YO8oFdcml55CxktgKHPqcJdUxg/exec';

  // ====== DOM Cache ======
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const dom = {
    nav: $('.nav'),
    navToggle: $('.nav-toggle'),
    mobileMenu: $('.mobile-menu'),
    navLinks: $$('.nav-link'),
    heroMedia: $('#heroMedia'),
    year: $('#year'),
    toastContainer: $('#toastContainer'),
    locationCards: $$('.location-card'),
    roleCards: $$('.role-card'),
    mapContainer: $('#map'),
    mapToolbarBtns: $$('.map-toolbar button[data-tool]'),
    heatmapToggle: $('#heatmapToggle'),
    exportBtn: $('#exportMap'),
    mapInstructions: $('#mapInstructions'),
    joinForm: $('#joinForm'),
    applyForm: $('#applyForm'),
    contactForm: $('#contactForm'),
  };

  // ====== Utility ======
  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
  window.scrollToSection = scrollToSection;

  function showModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
  }
  window.showModal = showModal;

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = 'none';
      document.body.style.overflow = '';
    }
  }
  window.closeModal = closeModal;

  function getFormData(form) {
    const data = {};
    const fd = new FormData(form);
    for (const [key, val] of fd) {
      if (data[key]) {
        if (!Array.isArray(data[key])) data[key] = [data[key]];
        data[key].push(val);
      } else {
        data[key] = val;
      }
    }
    return data;
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    return /^[\d\s\-\+\(\)]{7,20}$/.test(phone);
  }

  function showError(inputId) {
    const el = document.getElementById(inputId);
    if (el) el.classList.add('visible');
  }

  function hideError(inputId) {
    const el = document.getElementById(inputId);
    if (el) el.classList.remove('visible');
  }

  function showToast(msg, type) {
    const el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'success');
    el.textContent = msg;
    dom.toastContainer.appendChild(el);
    setTimeout(function() { el.remove(); }, 4000);
  }

  function setLoading(btn, loading) {
    const text = btn.querySelector('.submit-text');
    const spinner = btn.querySelector('.spinner');
    if (loading) {
      btn.disabled = true;
      if (text) text.style.display = 'none';
      if (spinner) spinner.style.display = 'inline-block';
    } else {
      btn.disabled = false;
      if (text) text.style.display = '';
      if (spinner) spinner.style.display = 'none';
    }
  }

  function markFieldError(input, errorId) {
    input.classList.add('error');
    showError(errorId);
  }

  function clearFieldError(input, errorId) {
    input.classList.remove('error');
    hideError(errorId);
  }

  // ====== Navigation ======
  dom.navToggle.addEventListener('click', function() {
    const open = dom.mobileMenu.classList.toggle('open');
    this.setAttribute('aria-expanded', open);
  });

  dom.mobileMenu.querySelectorAll('a').forEach(function(a) {
    a.addEventListener('click', function() {
      dom.mobileMenu.classList.remove('open');
      dom.navToggle.setAttribute('aria-expanded', 'false');
      const id = this.getAttribute('href').replace('#', '');
      scrollToSection(id);
    });
  });

  // Nav background on scroll
  window.addEventListener('scroll', function() {
    if (window.scrollY > 40) {
      dom.nav.classList.add('scrolled');
    } else {
      dom.nav.classList.remove('scrolled');
    }
  });

  // Active nav link on scroll
  const sections = $$('section[id]');
  window.addEventListener('scroll', function() {
    const scrollY = window.scrollY + 120;
    let current = 'hero';
    for (const sec of sections) {
      if (sec.offsetTop <= scrollY) {
        current = sec.id;
      }
    }
    dom.navLinks.forEach(function(a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  });

  // ====== Footer Year ======
  if (dom.year) dom.year.textContent = new Date().getFullYear();

  // ====== Intersection Observer Animations ======
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function(entries) {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    $$('.fade-up, .stagger-children').forEach(function(el) {
      observer.observe(el);
    });
  } else {
    $$('.fade-up, .stagger-children').forEach(function(el) { el.classList.add('visible'); });
  }

  // ====== Mission Carousel ======
  (function() {
    var track = document.getElementById('missionTrack');
    var dots = document.querySelectorAll('.mission-dot');
    if (!track || !dots.length) return;

    var cards = track.querySelectorAll('.mission-card');
    var totalUnique = 3;
    var currentIndex = 3; // Start at index 3 (Respect main card)
    var interval = null;
    var isPaused = false;
    var isTransitioning = false;
    var CARD_PCT = 100 / 3;

    function setTrackTransform(offsetPct) {
      track.style.transform = 'translateX(' + offsetPct + '%)';
    }

    function highlightCenter(centerIndex) {
      cards.forEach(function(c, i) {
        var isCenter = (i === centerIndex);
        c.classList.toggle('center', isCenter);
      });
      // Active dot should correspond to the unique card index (0, 1, or 2)
      var activeCard = cards[centerIndex];
      if (activeCard) {
        var uniqueCardIdx = parseInt(activeCard.dataset.card);
        dots.forEach(function(d, i) {
          d.classList.toggle('active', i === uniqueCardIdx);
        });
      }
    }

    function updateCarousel(index, animate) {
      if (animate) {
        track.style.transition = 'transform 1200ms cubic-bezier(0.22, 1, 0.36, 1)';
        isTransitioning = true;
      } else {
        track.style.transition = 'none';
      }

      currentIndex = index;
      var offset = -(currentIndex - 1) * CARD_PCT;
      setTrackTransform(offset);
      highlightCenter(currentIndex);
    }

    // Seamless warping after transition ends
    track.addEventListener('transitionend', function() {
      isTransitioning = false;
      // If we move past index 5, warp back to main range by subtracting 3 indices
      if (currentIndex >= 6) {
        updateCarousel(currentIndex - 3, false); // Instant reset
      }
    });

    function nextSlide() {
      if (!isPaused && !isTransitioning) {
        updateCarousel(currentIndex + 1, true);
      }
    }

    function startAutoScroll() {
      if (interval) clearInterval(interval);
      interval = setInterval(nextSlide, 5000);
    }

    function stopAutoScroll() {
      if (interval) { clearInterval(interval); interval = null; }
    }

    dots.forEach(function(dot) {
      dot.addEventListener('click', function() {
        if (isTransitioning) return;
        var targetUnique = parseInt(this.dataset.slide);
        if (!isNaN(targetUnique)) {
          stopAutoScroll();
          
          // Map click to the next occurrence of targetUnique >= currentIndex
          var targetIndex = currentIndex;
          while (targetIndex % totalUnique !== targetUnique) {
            targetIndex++;
          }
          
          // If they click the same dot as the current center card, do nothing
          if (targetIndex !== currentIndex) {
            updateCarousel(targetIndex, true);
          }
          
          setTimeout(startAutoScroll, 6000);
        }
      });
    });

    var carousel = document.getElementById('missionCarousel');
    if (carousel) {
      carousel.addEventListener('mouseenter', function() { isPaused = true; });
      carousel.addEventListener('mouseleave', function() { isPaused = false; });
    }

    // Initialize instantly
    updateCarousel(3, false);
    startAutoScroll();
  })();

  // ====== Location Cards ======
  dom.locationCards.forEach(function(card) {
    card.addEventListener('click', function() {
      var wasExpanded = this.classList.contains('expanded');
      dom.locationCards.forEach(function(c) {
        c.classList.remove('expanded');
      });
      if (!wasExpanded) {
        this.classList.add('expanded');
      }
    });
  });

  // ====== Role Cards ======
  dom.roleCards.forEach(function(card) {
    card.addEventListener('click', function() {
      var wasExpanded = this.classList.contains('expanded');
      dom.roleCards.forEach(function(c) {
        c.classList.remove('expanded');
      });
      if (!wasExpanded) {
        this.classList.add('expanded');
      }
    });
  });

  // ====== Map (Leaflet) ======
  let map = null;
  let userMarker = null;
  let userCircle = null;
  let heatLayer = null;
  let isHeatmap = false;
  let currentTool = 'pin';
  let allPins = [];

  function initMap() {
    if (!dom.mapContainer) return;

    function loadLeaflet(cb) {
      if (window.L) { cb(); return; }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = cb;
      document.body.appendChild(script);
    }

    loadLeaflet(function() {
      map = L.map('map', {
        center: [40.5, -75.0],
        zoom: 7,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      map.on('click', function(e) {
        if (currentTool === 'pin') {
          placeUserPin(e.latlng);
        }
      });

      // Draw toolbar
      const toolbar = L.control({ position: 'bottomleft' });
      toolbar.onAdd = function() {
        const div = L.DomUtil.create('div', 'draw-toolbar');
        div.innerHTML = '<button id="pinTool" class="active" title="Drop pin"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg></button>' +
          '<button id="radiusTool" title="Draw range"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/></svg></button>' +
          '<button id="removeTool" title="Remove pin"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
        return div;
      };
      toolbar.addTo(map);

      map.on('popupopen', function() {
        setTimeout(function() { map.invalidateSize(); }, 100);
      });

      if (getAdminToken()) {
        loadAdminPins();
        dom.heatmapToggle.style.display = '';
      }

      map.invalidateSize();
    });
  }

  function placeUserPin(latlng) {
    if (userMarker) {
      userMarker.setLatLng(latlng);
    } else {
      userMarker = L.marker(latlng, {
        draggable: true,
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="width:16px;height:16px;background:var(--hunter-green);border:2px solid var(--white);border-radius:50%;box-shadow:0 0 20px rgba(62,95,68,0.5);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })
      }).addTo(map);

      userMarker.bindPopup('<b>Your Forage Spot</b><br>Drag to adjust.');
      userMarker.openPopup();

      userMarker.on('dragend', function() {
        const pos = userMarker.getLatLng();
        if (userCircle) {
          userCircle.setLatLng(pos);
        }
        saveUserPin(pos);
      });
    }

    const travelMiles = parseInt($('#joinTravel') ? $('#joinTravel').value : '25', 10);
    const radiusMeters = travelMiles * 1609.34;

    if (userCircle) {
      userCircle.setLatLng(latlng);
      userCircle.setRadius(radiusMeters);
    } else {
      userCircle = L.circle(latlng, {
        radius: radiusMeters,
        color: '#3E5F44',
        fillColor: 'rgba(62, 95, 68, 0.1)',
        weight: 2,
        opacity: 0.6,
        fillOpacity: 0.15,
      }).addTo(map);
    }

    map.setView(latlng, 10);
    saveUserPin(latlng);

    if (currentTool !== 'pin') {
      currentTool = 'pin';
      updateToolbar();
    }
  }

  function updateToolbar() {
    dom.mapToolbarBtns.forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.tool === currentTool);
      btn.setAttribute('aria-pressed', btn.dataset.tool === currentTool ? 'true' : 'false');
    });
    const instr = dom.mapInstructions;
    if (currentTool === 'pin') instr.textContent = 'Click on the map to drop your foraging pin. Drag the pin to adjust.';
    else if (currentTool === 'radius') instr.textContent = 'Click on the map to set your travel range center. Use the form below to change radius.';
    else if (currentTool === 'heatmap') instr.textContent = 'Heatmap showing all member concentrations.';
  }

  dom.mapToolbarBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      const tool = this.dataset.tool;
      if (tool === 'heatmap') {
        toggleHeatmap();
        return;
      }
      currentTool = tool;
      updateToolbar();
    });
  });

  // Export GPX
  if (dom.exportBtn) {
    dom.exportBtn.addEventListener('click', function() {
      if (!userMarker) {
        showToast('Drop a pin first!', 'error');
        return;
      }
      const latlng = userMarker.getLatLng();
      const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="QuantumAggForage" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="${latlng.lat}" lon="${latlng.lng}">
    <name>My Forage Spot</name>
    <cmt>QuantumAggForage user foraging location</cmt>
  </wpt>
</gpx>`;
      const blob = new Blob([gpx.trim()], { type: 'application/gpx+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-forage-spot.gpx';
      a.click();
      URL.revokeObjectURL(url);
      showToast('GPX file downloaded!', 'success');
    });
  }

  // Save pin to localStorage
  function saveUserPin(latlng) {
    try {
      const data = { lat: latlng.lat, lng: latlng.lng, timestamp: Date.now() };
      localStorage.setItem('qaf_user_pin', JSON.stringify(data));
    } catch (e) {}
  }

  function loadUserPin() {
    try {
      const raw = localStorage.getItem('qaf_user_pin');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.lat && data.lng) {
          placeUserPin(L.latLng(data.lat, data.lng));
        }
      }
    } catch (e) {}
  }

  // Admin functions
  function getAdminToken() {
    return new URLSearchParams(window.location.search).get('admin') ||
           localStorage.getItem(ADMIN_TOKEN_KEY);
  }

  function loadAdminPins() {
    showToast('Admin mode — loading member data...', 'success');
  }

  function toggleHeatmap() {
    isHeatmap = !isHeatmap;
    dom.heatmapToggle.classList.toggle('active');
    if (isHeatmap) {
      showToast('Heatmap mode active (requires member data)', 'success');
    }
  }

  // ====== Form Handling ======

  // === Join Club Form ===
  if (dom.joinForm) {
    const joinFieldDefs = {
      name: { el: $('#joinName'), error: 'joinNameError' },
      email: { el: $('#joinEmail'), error: 'joinEmailError' },
      phone: { el: $('#joinPhone'), error: 'joinPhoneError' },
      location: { el: $('#joinLocation'), error: 'joinLocationError' },
      travel: { el: $('#joinTravel'), error: 'joinTravelError' },
    };

    Object.keys(joinFieldDefs).forEach(function(key) {
      const fld = joinFieldDefs[key];
      fld.el.dataset.errorId = fld.error;
      fld.el.addEventListener('input', function() { clearFieldError(this, this.dataset.errorId); });
      fld.el.addEventListener('change', function() { clearFieldError(this, this.dataset.errorId); });
    });

    $$('input[name="experience"]', dom.joinForm).forEach(function(r) {
      r.addEventListener('change', function() { hideError('joinExperienceError'); });
    });

    dom.joinForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      let valid = true;

      Object.keys(joinFieldDefs).forEach(function(key) {
        const fld = joinFieldDefs[key];
        if (!fld.el.value.trim()) {
          markFieldError(fld.el, fld.error);
          valid = false;
        } else {
          clearFieldError(fld.el, fld.error);
        }
      });

      if (!validateEmail(joinFieldDefs.email.el.value)) {
        markFieldError(joinFieldDefs.email.el, joinFieldDefs.email.error);
        valid = false;
      }

      if (!validatePhone(joinFieldDefs.phone.el.value)) {
        markFieldError(joinFieldDefs.phone.el, joinFieldDefs.phone.error);
        valid = false;
      }

      const exp = $$('input[name="experience"]:checked', dom.joinForm);
      if (!exp.length) {
        showError('joinExperienceError');
        valid = false;
      } else {
        hideError('joinExperienceError');
      }

      if (!valid) return;

      const btn = dom.joinForm.querySelector('.form-submit');
      setLoading(btn, true);

      try {
        const data = getFormData(dom.joinForm);
        data.formType = 'join-club';
        await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(data),
        });

        showToast('Welcome to the club! Check your email for Discord invite.', 'success');
        dom.joinForm.reset();
      } catch (err) {
        showToast('Something went wrong. Please try again.', 'error');
      }

      setLoading(btn, false);
    });
  }

  // === Apply Form ===
  if (dom.applyForm) {
    const applyFieldDefs = {
      name: { el: $('#applyName'), error: 'applyNameError' },
      email: { el: $('#applyEmail'), error: 'applyEmailError' },
      phone: { el: $('#applyPhone'), error: 'applyPhoneError' },
      role: { el: $('#applyRole'), error: 'applyRoleError' },
      locationPref: { el: $('#applyLocation'), error: 'applyLocationError' },
      cover: { el: $('#applyCover'), error: 'applyCoverError' },
    };

    Object.keys(applyFieldDefs).forEach(function(key) {
      const fld = applyFieldDefs[key];
      fld.el.dataset.errorId = fld.error;
      fld.el.addEventListener('input', function() { clearFieldError(this, this.dataset.errorId); });
      fld.el.addEventListener('change', function() { clearFieldError(this, this.dataset.errorId); });
    });

    const resumeInput = $('#applyResume');
    const resumeLabel = resumeInput ? resumeInput.parentElement.querySelector('.form-file-label span') : null;
    const resumeName = $('#resumeFileName');

    if (resumeInput) {
      resumeInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            showToast('Resume must be under 5MB', 'error');
            this.value = '';
            return;
          }
          if (resumeLabel) resumeLabel.textContent = file.name;
          if (resumeName) {
            resumeName.textContent = file.name + ' (' + Math.round(file.size / 1024) + ' KB)';
            resumeName.classList.add('visible');
          }
          clearFieldError(this, 'applyResumeError');
        }
      });
    }

    dom.applyForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      let valid = true;

      Object.keys(applyFieldDefs).forEach(function(key) {
        const fld = applyFieldDefs[key];
        if (!fld.el.value.trim()) {
          markFieldError(fld.el, fld.error);
          valid = false;
        }
      });

      if (!validateEmail(applyFieldDefs.email.el.value)) {
        markFieldError(applyFieldDefs.email.el, applyFieldDefs.email.error);
        valid = false;
      }

      if (!validatePhone(applyFieldDefs.phone.el.value)) {
        markFieldError(applyFieldDefs.phone.el, applyFieldDefs.phone.error);
        valid = false;
      }

      if (!resumeInput || !resumeInput.files || !resumeInput.files.length) {
        markFieldError(resumeInput, 'applyResumeError');
        valid = false;
      }

      if (!valid) return;

      const btn = dom.applyForm.querySelector('.form-submit');
      setLoading(btn, true);

      try {
        const data = getFormData(dom.applyForm);
        data.formType = 'apply';

        // Convert resume to base64
        const file = resumeInput.files[0];
        const reader = new FileReader();
        data.resumeBase64 = await new Promise(function(resolve) {
          reader.onload = function(ev) { resolve(ev.target.result.split(',')[1]); };
          reader.readAsDataURL(file);
        });
        data.resumeFileName = file.name;

        await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(data),
        });

        showToast("Application received! We'll be in touch soon.", 'success');
        dom.applyForm.reset();
        if (resumeLabel) resumeLabel.textContent = 'Upload resume';
        if (resumeName) {
          resumeName.classList.remove('visible');
          resumeName.textContent = '';
        }
      } catch (err) {
        showToast('Something went wrong. Please try again.', 'error');
      }

      setLoading(btn, false);
    });
  }

  // === Contact Form ===
  if (dom.contactForm) {
    const contactFieldDefs = {
      name: { el: $('#contactName'), error: 'contactNameError' },
      email: { el: $('#contactEmail'), error: 'contactEmailError' },
    };

    Object.keys(contactFieldDefs).forEach(function(key) {
      const fld = contactFieldDefs[key];
      fld.el.dataset.errorId = fld.error;
      fld.el.addEventListener('input', function() { clearFieldError(this, this.dataset.errorId); });
    });

    dom.contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      let valid = true;

      Object.keys(contactFieldDefs).forEach(function(key) {
        const fld = contactFieldDefs[key];
        if (!fld.el.value.trim()) {
          markFieldError(fld.el, fld.error);
          valid = false;
        }
      });

      if (!validateEmail(contactFieldDefs.email.el.value)) {
        markFieldError(contactFieldDefs.email.el, contactFieldDefs.email.error);
        valid = false;
      }

      const msgEl = $('#contactMessage');
      if (!msgEl || !msgEl.value.trim()) {
        markFieldError(msgEl, 'contactMessageError');
        valid = false;
      } else {
        clearFieldError(msgEl, 'contactMessageError');
      }

      if (!valid) return;

      const btn = dom.contactForm.querySelector('.form-submit');
      setLoading(btn, true);

      try {
        const data = getFormData(dom.contactForm);
        data.formType = 'contact';
        await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(data),
        });

        showToast("Message sent! We'll get back to you soon.", 'success');
        dom.contactForm.reset();
      } catch (err) {
        showToast('Something went wrong. Please try again.', 'error');
      }

      setLoading(btn, false);
    });
  }

  // ====== Init ======
  document.addEventListener('DOMContentLoaded', function() {
    // Init map when section comes into view
    const mapObserver = new IntersectionObserver(function(entries) {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          initMap();
          loadUserPin();
          mapObserver.unobserve(entry.target);
        }
      }
    }, { threshold: 0.1 });
    const mapSection = $('#map-section');
    if (mapSection) mapObserver.observe(mapSection);

    // Privacy & Terms modal triggers
    const privacyLink = document.getElementById('privacyLink');
    const termsLink = document.getElementById('termsLink');
    if (privacyLink) {
      privacyLink.addEventListener('click', function(e) {
        e.preventDefault();
        showModal('privacyModal');
      });
    }
    if (termsLink) {
      termsLink.addEventListener('click', function(e) {
        e.preventDefault();
        showModal('termsModal');
      });
    }

    // Close modals on overlay click
    $$('.modal-overlay').forEach(function(overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          closeModal(this.id);
        }
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        $$('.modal-overlay').forEach(function(m) {
          if (m.style.display === 'block') closeModal(m.id);
        });
      }
    });

    // Plausible analytics events
    if (window.plausible) {
      $$('form').forEach(function(form) {
        form.addEventListener('submit', function() {
          window.plausible('form_submit', {
            props: { form: this.id || 'unknown' }
          });
        });
      });
    }
  });

})();
