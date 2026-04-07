(function () {
  if (window.AgenticPulse) return;

  var DEFAULTS = {
    autoTrack: true,
    batchSize: 15,
    flushInterval: 3000,
    throttleMs: 400,
    dedupeWindowMs: 900,
    retryDelays: [1000, 3000, 5000],
    endpointBase: "",
  };

  var state = {
    config: null,
    sessionId: "ap_" + Math.random().toString(36).slice(2) + Date.now().toString(36),
    queue: [],
    signals: {
      rage_clicks: 0,
      dead_clicks: 0,
      error_loops: 0,
      hesitation: 0,
      drop_off: 0,
      form_struggle: 0,
      scroll_depth: 0,
      fast_scroll: 0,
    },
    sessionStartedAt: Date.now(),
    pageStartedAt: Date.now(),
    meaningfulAction: false,
    timer: null,
    clickTrail: [],
    lastActivityAt: Date.now(),
    feedbackTriggered: false,
    observer: null,
    pendingFetches: 0,
    lastMutationAt: Date.now(),
    lastEventAtByKey: {},
    retryTimer: null,
    pendingRetryBatches: [],
    currentFeedback: {
      step: 0,
      answers: {
        message: "",
        intent: "",
        severity: "",
      },
    },
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function endpoint(path) {
    if (state.config && state.config.endpointBase) {
      return state.config.endpointBase.replace(/\/+$/, "") + path;
    }
    return "/api" + path;
  }

  function queueEvent(type, payload) {
    var eventKey = [
      type,
      payload && payload.target ? String(payload.target).slice(0, 120) : "",
      payload && payload.value ? String(payload.value).slice(0, 120) : "",
    ].join("|");
    var now = Date.now();
    var lastEventAt = state.lastEventAtByKey[eventKey] || 0;

    if (now - lastEventAt < (state.config && state.config.throttleMs ? state.config.throttleMs : DEFAULTS.throttleMs)) {
      return;
    }

    state.lastEventAtByKey[eventKey] = now;
    state.queue.push({
      type: type,
      at: nowIso(),
      target: payload && payload.target ? String(payload.target).slice(0, 160) : null,
      value: payload && payload.value ? String(payload.value).slice(0, 240) : null,
      x: payload && payload.x ? payload.x : 0,
      y: payload && payload.y ? payload.y : 0,
      meta: payload && payload.meta ? payload.meta : {},
    });
    if (state.queue.length > 200) {
      state.queue = state.queue.slice(-200);
    }

    if (state.config && state.queue.length >= state.config.batchSize) {
      flush("threshold");
    }
  }

  function markMeaningful() {
    state.meaningfulAction = true;
    state.lastActivityAt = Date.now();
  }

  function frictionScore() {
    var score =
      state.signals.rage_clicks * 30 +
      state.signals.dead_clicks * 25 +
      state.signals.hesitation * 20 +
      state.signals.drop_off * 15 +
      state.signals.form_struggle * 10 +
      state.signals.error_loops * 18;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function sanitizeInputTarget(target) {
    if (!target) return "";
    var type = (target.type || "").toLowerCase();
    if (type === "password" || type === "email" || type === "tel") {
      return type + ":masked";
    }
    if (target.name) return target.name.slice(0, 80);
    if (target.id) return "#" + target.id.slice(0, 80);
    if (target.placeholder) return target.placeholder.slice(0, 80);
    return target.tagName ? target.tagName.toLowerCase() : "input";
  }

  function targetLabel(element) {
    if (!element) return "unknown";
    if (element.id) return "#" + element.id.slice(0, 80);
    if (element.name) return "[name=" + element.name.slice(0, 80) + "]";
    if (element.getAttribute) {
      var testId = element.getAttribute("data-testid") || element.getAttribute("aria-label");
      if (testId) return testId.slice(0, 120);
    }
    var text = (element.innerText || element.textContent || "").trim();
    if (text) return text.slice(0, 120);
    return (element.tagName || "unknown").toLowerCase();
  }

  function onClick(event) {
    var element = event.target;
    var label = targetLabel(element);
    var x = event.clientX || 0;
    var y = event.clientY || 0;
    var clickAt = Date.now();
    markMeaningful();
    queueEvent("click", { target: label, x: x, y: y });

    state.clickTrail.push({ x: x, y: y, at: clickAt, label: label });
    state.clickTrail = state.clickTrail.filter(function (item) {
      return clickAt - item.at < 1500;
    });

    var nearbyClicks = state.clickTrail.filter(function (item) {
      return Math.abs(item.x - x) < 24 && Math.abs(item.y - y) < 24;
    });

    if (nearbyClicks.length >= 3) {
      state.signals.rage_clicks += 1;
      queueEvent("rage_click", { target: label, x: x, y: y, meta: { cluster: nearbyClicks.length } });
      maybeTriggerFeedback("rage_click");
    }

    var beforeUrl = location.href;
    var beforeMutation = state.lastMutationAt;
    var beforeFetches = state.pendingFetches;
    setTimeout(function () {
      var domChanged = state.lastMutationAt > beforeMutation;
      var navigated = location.href !== beforeUrl;
      var networkChanged = state.pendingFetches !== beforeFetches;
      if (!domChanged && !navigated && !networkChanged) {
        state.signals.dead_clicks += 1;
        queueEvent("dead_click", { target: label, x: x, y: y });
        maybeTriggerFeedback("dead_click");
      }
    }, 1300);
  }

  function onScroll() {
    var doc = document.documentElement;
    var maxScroll = Math.max(1, (doc.scrollHeight || 1) - window.innerHeight);
    var depth = Math.round((window.scrollY / maxScroll) * 100);
    state.signals.scroll_depth = Math.max(state.signals.scroll_depth, Math.min(100, depth));
    if (Math.abs((window.__apLastScrollY || 0) - window.scrollY) > window.innerHeight * 0.9) {
      state.signals.fast_scroll += 1;
    }
    window.__apLastScrollY = window.scrollY;
    queueEvent("scroll", { value: String(depth), meta: { depth: depth } });
  }

  function onInput(event) {
    var target = event.target;
    if (!target || !target.form) return;
    markMeaningful();
    var label = sanitizeInputTarget(target);
    var previous = target.__apPrevValue || "";
    var next = String(target.value || "");
    if (previous && previous.length > next.length + 2) {
      state.signals.form_struggle += 1;
    }
    target.__apPrevValue = next;
    target.__apTouchedAt = target.__apTouchedAt || Date.now();
    queueEvent("form_input", { target: label, value: next ? "updated" : "empty" });
  }

  function onInvalid(event) {
    var target = event.target;
    state.signals.form_struggle += 1;
    queueEvent("validation_error", {
      target: sanitizeInputTarget(target),
      meta: { message: target && target.validationMessage ? target.validationMessage.slice(0, 120) : null },
    });
    maybeTriggerFeedback("form_struggle");
  }

  function onMouseOver(event) {
    var target = event.target;
    if (!target) return;
    target.__apHoverStart = Date.now();
  }

  function onMouseOut(event) {
    var target = event.target;
    if (!target || !target.__apHoverStart) return;
    var duration = Date.now() - target.__apHoverStart;
    if (duration > 2300) {
      state.signals.hesitation += 1;
      queueEvent("hesitation", {
        target: targetLabel(target),
        meta: { duration: duration },
      });
    }
    target.__apHoverStart = null;
  }

  function instrumentNetwork() {
    if (window.__apNetworkInstrumented) return;
    window.__apNetworkInstrumented = true;

    var originalFetch = window.fetch;
    if (typeof originalFetch === "function") {
      window.fetch = function () {
        state.pendingFetches += 1;
        return originalFetch.apply(this, arguments).finally(function () {
          state.pendingFetches = Math.max(0, state.pendingFetches - 1);
        });
      };
    }

    var OriginalXHR = window.XMLHttpRequest;
    if (OriginalXHR) {
      window.XMLHttpRequest = function () {
        var xhr = new OriginalXHR();
        var open = xhr.open;
        xhr.open = function () {
          xhr.addEventListener("loadstart", function () {
            state.pendingFetches += 1;
          });
          xhr.addEventListener("loadend", function () {
            state.pendingFetches = Math.max(0, state.pendingFetches - 1);
          });
          return open.apply(xhr, arguments);
        };
        return xhr;
      };
    }
  }

  function observeDom() {
    if (state.observer || !window.MutationObserver) return;
    state.observer = new MutationObserver(function () {
      state.lastMutationAt = Date.now();
    });
    state.observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  }

  function ensureWidget() {
    if (document.getElementById("agenticpulse-widget")) {
      return;
    }

    var root = document.createElement("div");
    root.id = "agenticpulse-widget";
    root.innerHTML =
      '<button id="ap-widget-trigger" style="position:fixed;right:18px;bottom:18px;z-index:2147483646;border:1px solid rgba(15,23,42,.12);background:#111827;color:#fff;border-radius:999px;padding:12px 16px;font:600 13px system-ui;box-shadow:0 10px 24px rgba(15,23,42,.18);cursor:pointer;">Feedback</button>' +
      '<div id="ap-widget-panel" style="display:none;position:fixed;right:18px;bottom:74px;z-index:2147483646;width:min(360px,calc(100vw - 24px));border:1px solid rgba(15,23,42,.12);background:#fff;color:#0f172a;border-radius:20px;overflow:hidden;box-shadow:0 18px 42px rgba(15,23,42,.18);font:14px system-ui;">' +
      '<div style="padding:14px 16px;border-bottom:1px solid rgba(15,23,42,.08);display:flex;align-items:center;justify-content:space-between;"><div><div style="font-weight:700;">AgenticPulse</div><div style="font-size:12px;opacity:.65;">Behavior feedback</div></div><button id="ap-widget-close" style="border:0;background:transparent;font-size:18px;cursor:pointer;color:#475569;">×</button></div>' +
      '<div style="padding:16px;"><div id="ap-widget-question" style="font-weight:600;line-height:1.5;"></div><textarea id="ap-widget-input" rows="4" style="margin-top:12px;width:100%;border:1px solid rgba(15,23,42,.12);border-radius:14px;padding:12px;resize:none;font:14px system-ui;"></textarea><button id="ap-widget-next" style="margin-top:12px;width:100%;border:0;background:#111827;color:#fff;border-radius:14px;padding:12px 14px;font:600 14px system-ui;cursor:pointer;">Next</button><div id="ap-widget-status" style="margin-top:10px;font-size:12px;opacity:.65;"></div></div></div>';
    document.body.appendChild(root);

    var trigger = document.getElementById("ap-widget-trigger");
    var panel = document.getElementById("ap-widget-panel");
    var close = document.getElementById("ap-widget-close");
    var question = document.getElementById("ap-widget-question");
    var input = document.getElementById("ap-widget-input");
    var next = document.getElementById("ap-widget-next");
    var status = document.getElementById("ap-widget-status");
    var prompts = [
      "We noticed something didn’t work. What happened?",
      "What were you trying to do?",
      "How important is this issue?",
    ];

    function renderStep() {
      question.textContent = prompts[state.currentFeedback.step];
      input.value =
        state.currentFeedback.step === 0
          ? state.currentFeedback.answers.message
          : state.currentFeedback.step === 1
            ? state.currentFeedback.answers.intent
            : state.currentFeedback.answers.severity;
      next.textContent = state.currentFeedback.step === 2 ? "Send feedback" : "Next";
    }

    function openPanel() {
      panel.style.display = "block";
      renderStep();
      input.focus();
    }

    function closePanel() {
      panel.style.display = "none";
    }

    trigger.addEventListener("click", openPanel);
    close.addEventListener("click", closePanel);
    next.addEventListener("click", function () {
      var value = input.value.trim();
      if (!value) return;
      if (state.currentFeedback.step === 0) state.currentFeedback.answers.message = value;
      if (state.currentFeedback.step === 1) state.currentFeedback.answers.intent = value;
      if (state.currentFeedback.step === 2) state.currentFeedback.answers.severity = value;

      if (state.currentFeedback.step < 2) {
        state.currentFeedback.step += 1;
        renderStep();
        return;
      }

      status.textContent = "Sending feedback...";
      sendFeedback(function () {
        status.textContent = "Thanks — feedback captured.";
        state.currentFeedback = {
          step: 0,
          answers: { message: "", intent: "", severity: "" },
        };
        setTimeout(function () {
          closePanel();
          status.textContent = "";
        }, 1200);
      });
    });
  }

  function maybeTriggerFeedback(reason) {
    if (state.feedbackTriggered) return;
    if (reason === "manual" || reason === "rage_click" || frictionScore() >= 55) {
      state.feedbackTriggered = true;
      ensureWidget();
      var trigger = document.getElementById("ap-widget-trigger");
      if (trigger) {
        trigger.click();
      }
    }
  }

  function sendWithBeacon(url, body) {
    if (!navigator.sendBeacon) return false;
    try {
      return navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    } catch (_error) {
      return false;
    }
  }

  function buildBatchPayload(reason, options) {
    var payloadEvents = state.queue.splice(0, state.queue.length);
    var includeFeedback = Boolean(options && options.forceFeedback);

    if (includeFeedback && payloadEvents.length === 0) {
      payloadEvents.push({
        type: "feedback_submission",
        at: nowIso(),
        target: location.pathname,
        value: null,
        x: 0,
        y: 0,
        meta: {},
      });
    }

    if (payloadEvents.length === 0) {
      return null;
    }

    return {
      project_id: state.config.projectId,
      user_id: state.config.userId || null,
      session_id: state.sessionId,
      page: location.pathname,
      url: location.href,
      timestamp: nowIso(),
      events: payloadEvents,
      friction_score: frictionScore(),
      signals: state.signals,
      feedback: includeFeedback || state.currentFeedback.answers.message ? state.currentFeedback.answers : {},
      metadata: {
        reason: reason,
        session_duration_ms: Date.now() - state.sessionStartedAt,
        time_on_page_ms: Date.now() - state.pageStartedAt,
      },
      userAgent: navigator.userAgent,
    };
  }

  function sendBatchRequest(batch, attempt) {
    var body = JSON.stringify({
      batches: [batch],
      batch_id: batch.metadata && batch.metadata.batch_id ? batch.metadata.batch_id : null,
    });

    return fetch(endpoint("/sdk/events/batch"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Product-Pulse-Key": state.config.projectId,
      },
      body: body,
      keepalive: true,
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("batch_failed");
      }
      return response;
    }).catch(function (error) {
      var retryDelays = (state.config && state.config.retryDelays) || DEFAULTS.retryDelays;
      if (attempt < retryDelays.length) {
        state.pendingRetryBatches.unshift(batch);
        if (state.retryTimer) clearTimeout(state.retryTimer);
        state.retryTimer = setTimeout(function () {
          state.retryTimer = null;
          retryPendingBatches();
        }, retryDelays[attempt]);
      }
      throw error;
    });
  }

  function retryPendingBatches() {
    if (!state.pendingRetryBatches.length || !state.config) return;
    var nextBatch = state.pendingRetryBatches.shift();
    if (!nextBatch) return;
    sendBatchRequest(nextBatch, 1).catch(function () {});
  }

  function sendFeedback(done) {
    flush("feedback", { forceFeedback: true })
      .then(function () {
        if (done) done();
      })
      .catch(function () {
        if (done) done();
      });
  }

  function flush(reason, options) {
    if (!state.config) return Promise.resolve(false);
    var payload = buildBatchPayload(reason, options);
    if (!payload) return Promise.resolve(false);

    var body = JSON.stringify({
      batches: [payload],
    });
    var url = endpoint("/sdk/events/batch");
    var sent = reason === "unload" ? sendWithBeacon(url, body) : false;
    if (sent) {
      return Promise.resolve(true);
    }

    return sendBatchRequest(payload, 0).then(function () {
      return true;
    }).catch(function () {
      return false;
    });
  }

  function scheduleFlush() {
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(function () {
      if (state.queue.length > 0) {
        flush("interval");
      }
    }, state.config.flushInterval || DEFAULTS.flushInterval);
  }

  function trackNavigation() {
    queueEvent("navigation", { value: location.pathname, meta: { href: location.href } });
    markMeaningful();
  }

  function instrumentHistory() {
    if (window.__apHistoryInstrumented) return;
    window.__apHistoryInstrumented = true;
    ["pushState", "replaceState"].forEach(function (key) {
      var original = history[key];
      history[key] = function () {
        var result = original.apply(history, arguments);
        trackNavigation();
        return result;
      };
    });
    window.addEventListener("popstate", trackNavigation);
  }

  function detectDropOff() {
    if (state.meaningfulAction) return;
    if (Date.now() - state.pageStartedAt < 8000) return;
    state.signals.drop_off += 1;
    queueEvent("drop_off", { value: location.pathname });
  }

  function init(config) {
    state.config = {
      projectId: config && (config.projectId || config.apiKey),
      userId: config && config.userId ? config.userId : null,
      autoTrack: config && config.autoTrack !== false,
      endpointBase: config && config.endpointBase ? config.endpointBase : DEFAULTS.endpointBase,
      batchSize: config && config.batchSize ? config.batchSize : DEFAULTS.batchSize,
      flushInterval: config && (config.flushInterval || config.batchInterval) ? (config.flushInterval || config.batchInterval) : DEFAULTS.flushInterval,
      throttleMs: config && config.throttleMs ? config.throttleMs : DEFAULTS.throttleMs,
      dedupeWindowMs: config && config.dedupeWindowMs ? config.dedupeWindowMs : DEFAULTS.dedupeWindowMs,
      retryDelays: config && Array.isArray(config.retryDelays) && config.retryDelays.length ? config.retryDelays : DEFAULTS.retryDelays,
    };

    if (!state.config.projectId) {
      return;
    }

    instrumentNetwork();
    observeDom();
    instrumentHistory();
    ensureWidget();
    scheduleFlush();
    trackNavigation();

    if (state.config.autoTrack) {
      document.addEventListener("click", onClick, true);
      document.addEventListener("input", onInput, true);
      document.addEventListener("invalid", onInvalid, true);
      document.addEventListener("mouseover", onMouseOver, true);
      document.addEventListener("mouseout", onMouseOut, true);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("beforeunload", function () {
        detectDropOff();
        flush("unload");
      });
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") {
          detectDropOff();
          flush("hidden");
        }
      });
    }
  }

  window.AgenticPulse = {
    init: init,
    track: function (eventName, data) {
      markMeaningful();
      queueEvent(String(eventName || "custom_event"), {
        target: eventName,
        meta: data || {},
      });
    },
    feedback: function (payload) {
      state.currentFeedback.answers = {
        message: String((payload && payload.message) || "").trim(),
        intent: String((payload && payload.intent) || "").trim(),
        severity: String((payload && payload.severity) || "").trim(),
      };
      maybeTriggerFeedback("manual");
    },
    flush: function () {
      flush("manual");
    },
  };
})();
