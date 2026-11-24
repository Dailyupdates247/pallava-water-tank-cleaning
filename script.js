/* =========================================================
   PALLAVA WATER TANK CLEANING SERVICE - website JavaScript
   menu, header, progress bar, scroll effects, register form
========================================================= */

/* =========================================================
   REGISTER NOW FORM - GOOGLE APPS SCRIPT CONNECTION
   The endpoint must be the real deployed Google Apps Script Web App URL.
   Do not use a made-up URL. After deployment, paste the URL ending in /exec
   between the quotes below. Until then, the form intentionally shows an error
   instead of pretending that a customer enquiry was saved.
========================================================= */
const REGISTER_ENDPOINT = "https://script.google.com/macros/s/AKfycbwOvFntgL-faOP_P4JD8sLxpyHESifxUEpCOpu-1Uc4fv4MYbE1cj1Li0CSsdhhb0Totw/exec"; // deployed PALLAVA registration endpoint


document.addEventListener("DOMContentLoaded", function () {

    "use strict";

    const $  = function (sel, root) { return (root || document).querySelector(sel); };
    const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };


    /* ---------- header look + reading progress bar ---------- */

    const header = $("#header");
    const bar    = $(".scroll-progress");

    function onScroll() {
        const y = window.scrollY || window.pageYOffset || 0;
        if (header) { header.classList.toggle("is-scrolled", y > 20); }
        if (bar) {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
        }
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);


    /* ---------- mobile menu ---------- */

    const menuButton = $("#menuButton");
    const navigation = $("#navigation");

    function setMenu(open) {
        if (!menuButton || !navigation) { return; }
        navigation.classList.toggle("active", open);
        menuButton.setAttribute("aria-expanded", open ? "true" : "false");
    }

    if (menuButton && navigation) {
        menuButton.addEventListener("click", function (event) {
            event.stopPropagation();
            setMenu(!navigation.classList.contains("active"));
        });
        navigation.addEventListener("click", function (event) {
            if (event.target.closest("a")) { setMenu(false); }
        });
        document.addEventListener("click", function (event) {
            if (!event.target.closest(".nav-wrap")) { setMenu(false); }
        });
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") { setMenu(false); }
        });
        window.addEventListener("resize", function () {
            if (window.innerWidth > 980) { setMenu(false); }
        });
    }


    /* ---------- highlight the current section in the menu ---------- */

    const links = $$(".navigation a.nav-link").filter(function (a) {
        return (a.getAttribute("href") || "").charAt(0) === "#";
    });

    if (links.length && "IntersectionObserver" in window) {
        const map = {};
        links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });

        const spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) { return; }
                links.forEach(function (a) { a.classList.remove("is-current"); });
                const a = map[entry.target.id];
                if (a) { a.classList.add("is-current"); }
            });
        }, { rootMargin: "-45% 0px -50% 0px" });

        Object.keys(map).forEach(function (id) {
            const section = document.getElementById(id);
            if (section) { spy.observe(section); }
        });
    }


    /* ---------- reveal-on-scroll (cards come in one after another) ---------- */

    $$("[data-stagger]").forEach(function (group) {
        Array.prototype.slice.call(group.children).forEach(function (child, i) {
            child.classList.add("reveal");
            child.style.setProperty("--d", (i * 0.09) + "s");
        });
    });

    const items = $$(".reveal");

    if (items.length && "IntersectionObserver" in window) {
        const io = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) { return; }
                const el = entry.target;
                el.classList.add("is-visible");
                obs.unobserve(el);
                /* when the effect is over, hand control back to normal hover styles */
                window.setTimeout(function () {
                    el.classList.remove("reveal", "is-visible");
                    el.style.removeProperty("--d");
                }, 1300);
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
        items.forEach(function (el) { io.observe(el); });
    } else {
        items.forEach(function (el) { el.classList.remove("reveal"); });
    }


    /* ---------- clicking a service card pre-selects it in the form ---------- */

    $$(".svc-card[data-service]").forEach(function (card) {
        card.addEventListener("click", function () {
            const select = $("#regService");
            if (select) { select.value = card.getAttribute("data-service"); }
        });
    });


    /* ---------- gallery: photo lightbox + one video playing at a time ---------- */

    const lightbox = $("#lightbox");
    if (lightbox) {
        const lbImg = $("img", lightbox);
        const closeLb = function () { lightbox.hidden = true; lbImg.removeAttribute("src"); };
        $$(".gal-item img").forEach(function (img) {
            img.addEventListener("click", function () { lbImg.src = img.src; lbImg.alt = img.alt; lightbox.hidden = false; });
        });
        lightbox.addEventListener("click", closeLb);
        document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !lightbox.hidden) { closeLb(); } });
    }
    const galVideos = $$(".gal-item video");
    galVideos.forEach(function (v) {
        v.addEventListener("play", function () { galVideos.forEach(function (o) { if (o !== v) { o.pause(); } }); });
    });


    /* =====================================================
       REGISTER NOW FORM
       Saves the details to your Google Sheet (and emails you).
       The visitor stays on the page and sees the thank-you message.
    ===================================================== */

    const form = $("#registerForm");
    if (!form) { return; }

    const done   = $("#registerDone");
    const failed = $("#registerError");
    const button = $(".register-submit", form);
    const languageNames = { en: "English", kn: "Kannada", hi: "Hindi" };

    /* the date picker should not allow past days */
    const dateField = $("#regDate");
    if (dateField) {
        const now = new Date();
        const pad = function (n) { return String(n).padStart(2, "0"); };
        dateField.min = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
    }

    function value(id) {
        const el = document.getElementById(id);
        return el ? el.value.trim() : "";
    }

    function setBusy(isBusy) {
        if (!button) { return; }
        button.disabled = isBusy;
    }

    function show(box) {
        if (done)   { done.hidden = true; }
        if (failed) { failed.hidden = true; }
        if (box) {
            box.hidden = false;
            box.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }

    form.addEventListener("submit", function (event) {

        /* never let the browser leave the page */
        event.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (!REGISTER_ENDPOINT) {
            console.warn("PALLAVA registration form is not connected yet. Check the deployed Google Apps Script endpoint in script.js.");
            show(failed);
            return;
        }

        const body = new URLSearchParams();
        body.set("name",     value("regName"));
        body.set("phone",    value("regPhone"));
        body.set("service",  value("regService"));
        body.set("area",     value("regArea"));
        body.set("date",     value("regDate"));
        body.set("message",  value("regMessage"));
        body.set("language", languageNames[document.documentElement.lang] || "English");
        body.set("website",  form.elements["website"] ? form.elements["website"].value : "");

        const controller = new AbortController();
        const timer = window.setTimeout(function () { controller.abort(); }, 20000);

        setBusy(true);
        show(null);

        /* "no-cors": the browser sends it and we cannot read Google's reply, so a
           finished request is treated as success; a network failure shows the error box */
        fetch(REGISTER_ENDPOINT, { method: "POST", mode: "no-cors", body: body, signal: controller.signal })
            .then(function () {
                form.reset();
                show(done);
            })
            .catch(function () {
                show(failed);
            })
            .finally(function () {
                window.clearTimeout(timer);
                setBusy(false);
            });
    });

});