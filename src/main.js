const META_PIXEL_ID = "3582001838623518";
const CAPI_ENDPOINT =
  "https://quiz-47segundos-ninho.vercel.app/.netlify/functions/meta-capi";
const ANALYTICS_ENDPOINT =
  "https://quiz-47segundos-ninho.vercel.app/api/analytics";
const CHECKOUT_BASE_URL =
  "https://pay.hotmart.com/E105986955S?checkoutMode=2";
const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
  "ttclid",
  "wbraid",
  "gbraid",
];

function randomId(prefix) {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}${id}`;
}

function getOrCreateId(storage, key, prefix) {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const value = randomId(prefix);
  storage.setItem(key, value);
  return value;
}

function getAttribution() {
  const params = new URLSearchParams(window.location.search);
  const stored = JSON.parse(sessionStorage.getItem("ninho_checkout_attribution") || "{}");
  const current = {};

  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(key);
    if (value) current[key] = value;
  }

  const attribution = { ...stored, ...current };
  sessionStorage.setItem("ninho_checkout_attribution", JSON.stringify(attribution));
  return attribution;
}

function checkoutUrl() {
  const url = new URL(CHECKOUT_BASE_URL);
  const attribution = getAttribution();

  for (const [key, value] of Object.entries(attribution)) {
    url.searchParams.set(key, value);
  }

  url.searchParams.set(
    "checkout_session_id",
    getOrCreateId(sessionStorage, "ninho_checkout_session_id", ""),
  );
  return url.toString();
}

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries({
      source: "checkout_vendedor",
      ...getAttribution(),
      ...params,
    }).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

function initMetaPixel() {
  if (window.__ninhoCheckoutPixelReady) return;
  window.__ninhoCheckoutPixelReady = true;

  if (!window.fbq) {
    const fbq = function (...args) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    };
    window.fbq = fbq;
    window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  window.fbq("init", META_PIXEL_ID);
  trackMeta("PageView", {
    landing_path: window.location.pathname,
    referrer: document.referrer || "",
  });
}

function trackMeta(eventName, params = {}, standard = false) {
  const eventId = randomId(`ninho_${eventName}_`);
  const customData = cleanParams(params);
  window.fbq?.(standard ? "track" : "trackCustom", eventName, customData, {
    eventID: eventId,
  });

  const body = JSON.stringify({
    event_name: eventName,
    event_id: eventId,
    event_source_url: window.location.href,
    custom_data: customData,
  });

  fetch(CAPI_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

function analyticsPayload(eventName, properties = {}) {
  const attribution = getAttribution();
  const width = window.innerWidth;
  const deviceType = width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";
  let referrerHost = "";

  try {
    referrerHost = document.referrer ? new URL(document.referrer).host : "";
  } catch {
    referrerHost = "";
  }

  return {
    events: [
      {
        event_id: randomId("checkout_"),
        event_name: eventName,
        occurred_at: new Date().toISOString(),
        visitor_id: getOrCreateId(localStorage, "ninho_visitor_id", ""),
        session_id: getOrCreateId(sessionStorage, "ninho_checkout_session_id", ""),
        funnel_id: "checkout_vendedor",
        funnel_version: "v1",
        screen_id: "checkout_page",
        screen_index: 0,
        screen_type: "checkout",
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        utm_content: attribution.utm_content,
        utm_term: attribution.utm_term,
        fbclid_present: Boolean(attribution.fbclid),
        device_type: deviceType,
        viewport_width: width,
        referrer_host: referrerHost,
        path: window.location.pathname,
        properties,
      },
    ],
  };
}

function trackAnalytics(eventName, properties = {}) {
  fetch(ANALYTICS_ENDPOINT, {
    method: "POST",
    mode: "no-cors",
    headers: { "content-type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(analyticsPayload(eventName, properties)),
    keepalive: true,
  }).catch(() => undefined);
}

function prepareCheckoutButton() {
  const button = document.querySelector("[data-checkout-button]");
  if (!button) return;

  button.href = checkoutUrl();
  button.addEventListener("click", () => {
    trackMeta(
      "InitiateCheckout",
      {
        content_ids: "E105986955S",
        content_name: "Metodo dos 47 Segundos",
        currency: "BRL",
        value: 19.9,
      },
      true,
    );
    trackMeta("CheckoutSellerClick", {
      checkout_provider: "hotmart",
      product_id: "E105986955S",
    });
    trackAnalytics("checkout_click", {
      checkout_provider: "hotmart",
      product_id: "E105986955S",
    });
  });
}

function observeCheckout() {
  const checkout = document.querySelector("#checkout");
  if (!checkout) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      trackMeta("CheckoutSellerView", { section: "checkout" });
      trackAnalytics("checkout_view", { section: "checkout" });
      observer.disconnect();
    },
    { threshold: 0.35 },
  );

  observer.observe(checkout);
}

initMetaPixel();
trackAnalytics("session_start", { page_type: "checkout_vendedor" });
prepareCheckoutButton();
observeCheckout();
