window.__ModuleLoader__.load({ id: "dsh-provider-accent", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
// dsh-provider-accent — browser half.
//
// Provider headings keep the shipped layout and receive a high-contrast color.
// Optional per-provider colors are configured through the devtools-safe global API
// and stored in localStorage, so the host and DSH settings stay untouched.

var STYLE_ID = "dsh-provider-accent-style";
var SOURCE = "dsh-provider-accent";
var STORAGE_KEY = "dsh-provider-accent.colors";
var LIGHT_COLOR = "#7c3aed";
var DARK_COLOR = "#a78bfa";
var HEADING_WEIGHT = 600;
var HEADING_SELECTORS = [
  'section[data-menu-group]:has(> [role="menuitemradio"]) > [data-menu-group-heading]',
  '[role="listbox"][aria-label^="/model"] section[data-menu-group] > [data-menu-group-heading]',
];
var GROUP_SELECTORS = HEADING_SELECTORS.join(",");
var config = loadConfig();
var observer = null;

function normalize(value) {
  return String(value == null ? "" : value).trim().toLowerCase().replace(/[\u2010-\u2015]/g, "-").replace(/\s+/g, " ");
}

function validColor(value) {
  return typeof value === "string" && /^(#[0-9a-f]{3,8}|rgb\(\s*[\d ]+%?\s*,\s*[\d ]+%?\s*,\s*[\d ]+%?\s*\)|rgba\(\s*[\d ]+%?\s*,\s*[\d ]+%?\s*,\s*[\d ]+%?\s*,\s*(?:0|1|0?\.\d+)\s*\))$/i.test(value.trim());
}

function cleanEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  var light = validColor(entry.light) ? entry.light.trim() : null;
  var dark = validColor(entry.dark) ? entry.dark.trim() : null;
  return light || dark ? { light: light || LIGHT_COLOR, dark: dark || DARK_COLOR } : null;
}

function cleanConfig(input) {
  var output = {};
  if (!input || typeof input !== "object") return output;
  Object.keys(input).forEach(function (key) {
    var entry = cleanEntry(input[key]);
    var normalized = normalize(key);
    if (normalized && entry) output[normalized] = entry;
  });
  return output;
}

function loadConfig() {
  try {
    if (typeof localStorage !== "undefined") return cleanConfig(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
  } catch (_) {}
  return {};
}

function saveConfig() {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (_) {}
}

function ruleFor(prefix, colorExpression) {
  return HEADING_SELECTORS.map(function (part) { return prefix + part; }).join(",") + "{color:" + colorExpression + ";font-weight:" + String(HEADING_WEIGHT) + "}";
}

var CSS = ruleFor("", "var(--dsh-provider-accent-light," + LIGHT_COLOR + ")") + ruleFor("body[data-ds-dark-theme] ", "var(--dsh-provider-accent-dark," + DARK_COLOR + ")");

function ensureStyle() {
  if (typeof document === "undefined") return null;
  var existing = document.getElementById(STYLE_ID);
  if (existing !== null) return existing;
  var element = document.createElement("style");
  element.id = STYLE_ID;
  element.setAttribute("data-plugin", SOURCE);
  element.textContent = CSS;
  if (document.head) document.head.appendChild(element);
  return element;
}

function providerConfig(heading) {
  var text = normalize(heading && (heading.textContent || heading.innerText));
  if (!text) return null;
  var direct = config[text];
  if (direct) return direct;
  var keys = Object.keys(config);
  for (var i = 0; i < keys.length; i += 1) {
    if (text === keys[i] || text.indexOf(keys[i] + " ") === 0) return config[keys[i]];
  }
  return null;
}

function refresh() {
  if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") return;
  var headings = document.querySelectorAll(GROUP_SELECTORS);
  for (var i = 0; i < headings.length; i += 1) {
    var heading = headings[i];
    var entry = providerConfig(heading);
    if (entry && heading.style && typeof heading.style.setProperty === "function") {
      heading.style.setProperty("--dsh-provider-accent-light", entry.light);
      heading.style.setProperty("--dsh-provider-accent-dark", entry.dark);
      heading.setAttribute("data-provider-accent", normalize(heading.textContent || heading.innerText));
    } else if (heading.style && typeof heading.style.removeProperty === "function") {
      heading.style.removeProperty("--dsh-provider-accent-light");
      heading.style.removeProperty("--dsh-provider-accent-dark");
      heading.removeAttribute("data-provider-accent");
    }
  }
}

function observe() {
  if (observer || typeof MutationObserver === "undefined" || typeof document === "undefined" || !document.body) return;
  observer = new MutationObserver(refresh);
  observer.observe(document.body, { childList: true, subtree: true });
}

function setProviderColor(provider, colors) {
  var key = normalize(provider);
  var entry = cleanEntry(colors);
  if (!key) throw new TypeError("provider must be a non-empty string");
  if (!entry) throw new TypeError("colors.light or colors.dark must be a hex/rgb color");
  config[key] = entry;
  saveConfig();
  refresh();
  return getColors();
}

function setColors(colors) {
  config = cleanConfig(colors);
  saveConfig();
  refresh();
  return getColors();
}

function getColors() {
  var copy = {};
  Object.keys(config).forEach(function (key) { copy[key] = { light: config[key].light, dark: config[key].dark }; });
  return copy;
}

function resetColors() {
  config = {};
  try { if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  refresh();
  return getColors();
}

function publishHook() {
  globalThis.__dshProviderAccent = {
    apply: ensureStyle,
    refresh: refresh,
    setProviderColor: setProviderColor,
    setColors: setColors,
    getColors: getColors,
    resetColors: resetColors,
    colors: { light: LIGHT_COLOR, dark: DARK_COLOR },
    selectors: HEADING_SELECTORS,
    storageKey: STORAGE_KEY,
  };
}

function apply(ctx) {
  if (typeof document === "undefined") return;
  if (typeof ctx === "object" && ctx !== null && typeof ctx.effect === "function") {
    ctx.effect(function () {
      var element = ensureStyle();
      refresh();
      observe();
      publishHook();
      return function () {
        if (observer) { observer.disconnect(); observer = null; }
        if (element !== null && element.parentNode !== null) element.remove();
      };
    }, SOURCE + ": provider headings");
  } else {
    ensureStyle();
    refresh();
    observe();
    publishHook();
  }
}

exports.apply = apply;
exports.inject = [];

return module.exports; } });
