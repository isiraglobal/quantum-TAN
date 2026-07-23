(function () {
  var hero = document.querySelector("[data-hero]");
  var canvas = document.querySelector("[data-hero-canvas]");
  var header = document.querySelector("[data-header]");
  var menuToggle = document.querySelector("[data-menu-toggle]");
  var nav = document.querySelector("[data-nav]");
  var frameCount = 291;
  var images = [];
  var currentFrame = -1;
  var lastScrollY = window.scrollY;
  var headerHideThreshold = 80;

  function framePath(index) {
    return "assets/animation/hero/" + String(index).padStart(4, "0") + ".jpg";
  }

  function drawFrame(index) {
    if (!canvas || window.matchMedia("(max-width: 900px)").matches) {
      return;
    }

    var img = images[index];
    if (!img || !img.complete) {
      return;
    }

    var context = canvas.getContext("2d");
    var scale = Math.max(canvas.width / img.width, canvas.height / img.height);
    var width = img.width * scale;
    var height = img.height * scale;
    var x = (canvas.width - width) / 2;
    var y = (canvas.height - height) / 2;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, x, y, width, height);
  }

  function loadFrame(index, drawWhenLoaded) {
    if (images[index]) {
      if (drawWhenLoaded) {
        drawFrame(index);
      }
      return;
    }

    var img = new Image();
    img.src = framePath(index);
    if (drawWhenLoaded) {
      img.onload = function () {
        drawFrame(index);
      };
    }
    images[index] = img;
  }

  function resizeHeroCanvas() {
    if (!canvas || window.matchMedia("(max-width: 900px)").matches) {
      return;
    }

    var pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    var width = Math.round(window.innerWidth * pixelRatio);
    var height = Math.round(window.innerHeight * pixelRatio);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      drawFrame(currentFrame);
    }
  }

  function preloadHero() {
    if (!hero || !canvas || window.matchMedia("(max-width: 900px)").matches) {
      return;
    }

    resizeHeroCanvas();
    loadFrame(0, true);

    var index = 1;
    var preloadBatch = function () {
      var limit = Math.min(index + 8, frameCount);
      for (; index < limit; index += 1) {
        loadFrame(index, false);
      }
      if (index < frameCount) {
        window.setTimeout(preloadBatch, 90);
      }
    };
    preloadBatch();
  }

  function updateHero() {
    if (!hero || !canvas || window.matchMedia("(max-width: 900px)").matches) {
      return;
    }

    resizeHeroCanvas();

    var rect = hero.getBoundingClientRect();
    var scrollable = hero.offsetHeight - window.innerHeight;
    var progress = Math.min(1, Math.max(0, -rect.top / scrollable));
    var frame = Math.min(frameCount - 1, Math.round(progress * (frameCount - 1)));

    if (frame !== currentFrame) {
      currentFrame = frame;
      loadFrame(frame, true);
    }
  }

  function updateHeader() {
    if (!header) {
      return;
    }

    var currentScrollY = Math.max(0, window.scrollY);
    var isScrollingDown = currentScrollY > lastScrollY;
    var isMenuOpen = nav && nav.classList.contains("is-open");
    var shouldHide = isScrollingDown && currentScrollY > headerHideThreshold && !isMenuOpen;

    header.classList.toggle("is-hidden", shouldHide);
    header.classList.toggle("is-solid", currentScrollY > window.innerHeight * 0.85);
    lastScrollY = currentScrollY;
  }

  function initMenu() {
    if (!menuToggle || !nav) {
      return;
    }

    menuToggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // ====== Toast Notifications ======
  function showToast(msg, type) {
    var container = document.getElementById("toastContainer");
    if (!container) return;
    var el = document.createElement("div");
    el.className = "toast toast-" + (type || "success");
    el.textContent = msg;
    container.appendChild(el);
    window.setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 4000);
  }

  // ====== Legal Modals ======
  function showModal(id) {
    var el = document.getElementById(id);
    if (el) {
      el.style.display = "block";
      document.body.style.overflow = "hidden";
    }
  }
  window.showModal = showModal;

  function closeModal(id) {
    var el = document.getElementById(id);
    if (el) {
      el.style.display = "none";
      document.body.style.overflow = "";
    }
  }
  window.closeModal = closeModal;

  function initLegalModals() {
    var privacyLink = document.getElementById("privacyLink");
    var termsLink = document.getElementById("termsLink");

    if (privacyLink) {
      privacyLink.addEventListener("click", function (e) {
        e.preventDefault();
        showModal("privacyModal");
      });
    }

    if (termsLink) {
      termsLink.addEventListener("click", function (e) {
        e.preventDefault();
        showModal("termsModal");
      });
    }

    document.querySelectorAll(".modal-overlay").forEach(function (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeModal(overlay.id);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        document.querySelectorAll(".modal-overlay").forEach(function (m) {
          if (m.style.display === "block") closeModal(m.id);
        });
      }
    });
  }

  // ====== Interactive Map (Leaflet) ======
  var map = null;
  var userMarker = null;
  var userCircle = null;
  var currentTool = "pin";

  function loadLeaflet(cb) {
    if (window.L) {
      cb();
      return;
    }
    var script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = cb;
    document.body.appendChild(script);
  }

  function saveUserPin(latlng) {
    try {
      localStorage.setItem("qaf_user_pin", JSON.stringify({ lat: latlng.lat, lng: latlng.lng }));
    } catch (e) {}
  }

  function placeUserPin(latlng) {
    if (!map || !window.L) return;

    if (userMarker) {
      userMarker.setLatLng(latlng);
    } else {
      userMarker = L.marker(latlng, { draggable: true }).addTo(map);
      userMarker.bindPopup("<b>Your Forage Spot</b><br>Drag to adjust.");
      userMarker.on("dragend", function () {
        var pos = userMarker.getLatLng();
        if (userCircle) userCircle.setLatLng(pos);
        saveUserPin(pos);
        showToast("Pin location updated!", "success");
      });
    }

    var radiusMeters = 25 * 1609.34;
    if (userCircle) {
      userCircle.setLatLng(latlng);
      userCircle.setRadius(radiusMeters);
    } else {
      userCircle = L.circle(latlng, {
        radius: radiusMeters,
        color: "#a98349",
        fillColor: "rgba(169, 131, 73, 0.15)",
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.2
      }).addTo(map);
    }

    map.setView(latlng, Math.max(map.getZoom(), 9));
    saveUserPin(latlng);

    var removeBtn = document.getElementById("removeMapPin");
    if (removeBtn) removeBtn.style.display = "inline-block";
  }

  function loadUserPin() {
    try {
      var raw = localStorage.getItem("qaf_user_pin");
      if (raw) {
        var data = JSON.parse(raw);
        if (data.lat && data.lng && window.L) {
          placeUserPin(L.latLng(data.lat, data.lng));
        }
      }
    } catch (e) {}
  }

  function removeUserPin() {
    if (userMarker) {
      map.removeLayer(userMarker);
      userMarker = null;
    }
    if (userCircle) {
      map.removeLayer(userCircle);
      userCircle = null;
    }
    try {
      localStorage.removeItem("qaf_user_pin");
    } catch (e) {}
    var removeBtn = document.getElementById("removeMapPin");
    if (removeBtn) removeBtn.style.display = "none";
    showToast("Pin removed.", "success");
  }

  function initMap() {
    var container = document.getElementById("map");
    if (!container || map) return;

    loadLeaflet(function () {
      map = L.map("map", {
        center: [40.5, -74.5],
        zoom: 7,
        zoomControl: true
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      map.on("click", function (e) {
        if (currentTool === "pin") {
          placeUserPin(e.latlng);
          showToast("Pin dropped!", "success");
        }
      });

      var pinBtn = document.getElementById("pinTool");
      var radiusBtn = document.getElementById("radiusTool");
      var removeBtn = document.getElementById("removeMapPin");
      var exportBtn = document.getElementById("exportMap");

      if (pinBtn) {
        pinBtn.addEventListener("click", function () {
          currentTool = "pin";
          pinBtn.classList.add("active");
          if (radiusBtn) radiusBtn.classList.remove("active");
        });
      }

      if (radiusBtn) {
        radiusBtn.addEventListener("click", function () {
          currentTool = "radius";
          radiusBtn.classList.add("active");
          if (pinBtn) pinBtn.classList.remove("active");
          showToast("Click on map or adjust pin to set range circle.", "success");
        });
      }

      if (removeBtn) {
        removeBtn.addEventListener("click", function () {
          removeUserPin();
        });
      }

      if (exportBtn) {
        exportBtn.addEventListener("click", function () {
          if (!userMarker) {
            showToast("Drop a pin on the map first!", "error");
            return;
          }
          var latlng = userMarker.getLatLng();
          var gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="QuantumAggForage" xmlns="http://www.topografix.com/GPX/1/1">\n  <wpt lat="' + latlng.lat + '" lon="' + latlng.lng + '">\n    <name>My Forage Spot</name>\n  </wpt>\n</gpx>';
          var blob = new Blob([gpx.trim()], { type: "application/gpx+xml" });
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = "my-forage-spot.gpx";
          a.click();
          URL.revokeObjectURL(url);
          showToast("GPX file downloaded successfully!", "success");
        });
      }

      loadUserPin();
      window.setTimeout(function () { map.invalidateSize(); }, 300);
    });
  }

  // Google Apps Script Form Submission Logic
  var GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby6kcPiiVogv0eW28pp8-FDfIoNsv7QdPfJGjUqasz4YO8oFdcml55CxktgKHPqcJdUxg/exec";

  function initForms() {
    var contactForm = document.getElementById("contactForm");
    if (contactForm) {
      contactForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var btn = document.getElementById("contactSubmitBtn");
        var feedback = document.getElementById("contactFeedback");
        var btnText = btn ? btn.querySelector(".btn-text") : null;
        var btnSpinner = btn ? btn.querySelector(".btn-spinner") : null;

        if (btn) btn.disabled = true;
        if (btnText) btnText.textContent = "SENDING...";
        if (btnSpinner) btnSpinner.style.display = "inline-block";
        if (feedback) feedback.style.display = "none";

        var formData = new FormData(contactForm);
        var inquiryVal = formData.get("inquiryType") || "general";
        var payload = {
          formType: inquiryVal === "join" ? "join-club" : "contact",
          name: formData.get("name") || "",
          email: formData.get("email") || "",
          phone: formData.get("phone") || "",
          location: formData.get("location") || "",
          inquiryType: inquiryVal,
          message: formData.get("message") || "",
          goals: formData.get("message") || ""
        };

        fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(payload)
        })
          .then(function (res) { return res.json(); })
          .then(function (result) {
            if (btn) btn.disabled = false;
            if (btnText) btnText.textContent = "SUBMIT";
            if (btnSpinner) btnSpinner.style.display = "none";
            if (feedback) {
              feedback.style.display = "block";
              feedback.className = "form-feedback success";
              feedback.textContent = result.message || "Thank you! Your message has been sent successfully.";
            }
            contactForm.reset();
          })
          .catch(function () {
            if (btn) btn.disabled = false;
            if (btnText) btnText.textContent = "SUBMIT";
            if (btnSpinner) btnSpinner.style.display = "none";
            if (feedback) {
              feedback.style.display = "block";
              feedback.className = "form-feedback success";
              feedback.textContent = "Thank you! Your submission has been received.";
            }
            contactForm.reset();
          });
      });
    }

    var newsletterForm = document.getElementById("newsletterForm");
    if (newsletterForm) {
      newsletterForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var emailInput = document.getElementById("newsletterEmail");
        var btn = document.getElementById("newsletterSubmitBtn");
        var feedback = document.getElementById("newsletterFeedback");

        if (btn) btn.disabled = true;
        var payload = {
          formType: "newsletter",
          email: emailInput ? emailInput.value : ""
        };

        fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(payload)
        })
          .then(function () {
            if (btn) btn.disabled = false;
            if (feedback) {
              feedback.style.display = "block";
              feedback.className = "form-feedback success";
              feedback.textContent = "Subscribed successfully!";
            }
            newsletterForm.reset();
          })
          .catch(function () {
            if (btn) btn.disabled = false;
            if (feedback) {
              feedback.style.display = "block";
              feedback.className = "form-feedback success";
              feedback.textContent = "Subscribed successfully!";
            }
            newsletterForm.reset();
          });
      });
    }

    var footerYear = document.getElementById("footerYear");
    if (footerYear) footerYear.textContent = new Date().getFullYear();
  }

  function initVisitorModal() {
    var modal = document.getElementById("leadModal");
    var closeBtn = document.getElementById("leadCloseBtn");
    var form = document.getElementById("leadModalForm");

    if (!modal) return;

    function showModal() {
      modal.classList.add("is-visible");
    }

    function hideModal() {
      modal.classList.remove("is-visible");
    }

    // Trigger popup within 1 second (600ms) on site load or reload
    window.setTimeout(showModal, 600);

    if (closeBtn) closeBtn.addEventListener("click", hideModal);

    modal.addEventListener("click", function (e) {
      if (e.target === modal) hideModal();
    });

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var submitBtn = document.getElementById("leadSubmitBtn");
        if (submitBtn) submitBtn.disabled = true;

        var formData = new FormData(form);
        var payload = {
          formType: "visitor-lead",
          name: formData.get("name") || "",
          email: formData.get("email") || "",
          phone: formData.get("phone") || "",
          page: window.location.pathname
        };

        fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(payload)
        })
          .then(function () {
            hideModal();
            form.reset();
            if (submitBtn) submitBtn.disabled = false;
          })
          .catch(function () {
            hideModal();
            form.reset();
            if (submitBtn) submitBtn.disabled = false;
          });
      });
    }
  }

  window.addEventListener("scroll", function () {
    window.requestAnimationFrame(function () {
      updateHero();
      updateHeader();
    });
  });

  window.addEventListener("resize", function () {
    resizeHeroCanvas();
    updateHero();
  });

  preloadHero();
  updateHero();
  updateHeader();
  initMenu();
  initLegalModals();
  initForms();
  initVisitorModal();

  if ("IntersectionObserver" in window) {
    var mapObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          initMap();
          mapObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    var mapSection = document.getElementById("map-section");
    if (mapSection) mapObserver.observe(mapSection);
  } else {
    initMap();
  }
})();

