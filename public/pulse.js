(function (window, document) {
  var config = {
    apiKey: "",
    apiBase: "",
  };
  var widgetReady = false;
  var modalOpen = false;
  var pending = false;
  var elements = {};

  function getScriptOrigin() {
    var currentScript = document.currentScript;
    if (!currentScript) {
      var scripts = document.getElementsByTagName("script");
      currentScript = scripts[scripts.length - 1];
    }
    try {
      return new URL(currentScript.src, window.location.href).origin;
    } catch {
      return window.location.origin;
    }
  }

  function getDefaultApiBase() {
    var origin = getScriptOrigin();
    if (origin.indexOf("localhost:3000") !== -1) {
      return "http://localhost:8000/api/sdk";
    }
    return origin.replace(/\/$/, "") + "/api/sdk";
  }

  function request(path, payload) {
    if (!config.apiKey) {
      return Promise.reject(new Error("Product Pulse SDK is not initialized."));
    }

    return fetch(config.apiBase + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Product-Pulse-Key": config.apiKey,
      },
      credentials: "omit",
      keepalive: true,
      body: JSON.stringify(payload),
    }).then(function (response) {
      if (!response.ok) {
        return response
          .json()
          .catch(function () {
            return { error: "Request failed." };
          })
          .then(function (data) {
            throw new Error(data.error || "Request failed.");
          });
      }

      return response.json().catch(function () {
        return { success: true };
      });
    });
  }

  function injectStyles() {
    if (document.getElementById("product-pulse-sdk-styles")) {
      return;
    }

    var style = document.createElement("style");
    style.id = "product-pulse-sdk-styles";
    style.textContent =
      "#product-pulse-trigger{position:fixed;right:20px;bottom:20px;z-index:2147483000;border:0;border-radius:999px;padding:12px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font:600 14px/1.1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 14px 32px rgba(79,70,229,.35);cursor:pointer}" +
      "#product-pulse-modal{position:fixed;right:20px;bottom:78px;z-index:2147483001;width:min(360px,calc(100vw - 32px));border-radius:18px;background:#0f172a;color:#e2e8f0;box-shadow:0 24px 60px rgba(15,23,42,.45);border:1px solid rgba(148,163,184,.16);padding:16px;display:none}" +
      "#product-pulse-modal.pp-open{display:block;animation:ppFadeIn .16s ease-out}" +
      "#product-pulse-modal h3{margin:0 0 6px;font:700 16px/1.2 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}" +
      "#product-pulse-modal p{margin:0 0 12px;color:#94a3b8;font:400 13px/1.45 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}" +
      "#product-pulse-modal textarea{width:100%;min-height:110px;resize:vertical;border-radius:14px;border:1px solid rgba(148,163,184,.18);background:#020617;color:#e2e8f0;padding:12px;font:400 14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;outline:none}" +
      "#product-pulse-modal textarea:focus{border-color:rgba(99,102,241,.6);box-shadow:0 0 0 3px rgba(99,102,241,.12)}" +
      "#product-pulse-modal .pp-row{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-top:12px}" +
      "#product-pulse-modal .pp-status{font:400 12px/1.3 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#94a3b8;min-height:16px}" +
      "#product-pulse-modal button{border:0;border-radius:12px;padding:10px 14px;font:600 13px/1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;cursor:pointer}" +
      "#product-pulse-cancel{background:#1e293b;color:#cbd5e1}" +
      "#product-pulse-submit{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}" +
      "#product-pulse-submit[disabled]{opacity:.7;cursor:wait}" +
      "@keyframes ppFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}";
    document.head.appendChild(style);
  }

  function setStatus(message, tone) {
    if (!elements.status) return;
    elements.status.textContent = message || "";
    elements.status.style.color =
      tone === "success"
        ? "#86efac"
        : tone === "error"
          ? "#fda4af"
          : "#94a3b8";
  }

  function toggleModal(forceState) {
    if (!elements.modal) return;
    modalOpen = typeof forceState === "boolean" ? forceState : !modalOpen;
    if (modalOpen) {
      elements.modal.classList.add("pp-open");
      elements.textarea.focus();
    } else {
      elements.modal.classList.remove("pp-open");
      setStatus("");
    }
  }

  function submitFeedback() {
    if (pending || !elements.textarea) return;
    var message = elements.textarea.value.trim();
    if (!message) {
      setStatus("Add a short message before sending.", "error");
      return;
    }

    pending = true;
    elements.submit.disabled = true;
    setStatus("Sending feedback...", "info");

    ProductPulse.feedback({ message: message })
      .then(function () {
        elements.textarea.value = "";
        setStatus("Thanks. Your feedback was sent to Product Pulse.", "success");
        window.setTimeout(function () {
          toggleModal(false);
        }, 900);
      })
      .catch(function () {
        setStatus("We couldn't send feedback right now. Please try again.", "error");
      })
      .finally(function () {
        pending = false;
        elements.submit.disabled = false;
      });
  }

  function mountWidget() {
    if (widgetReady || !document.body) return;
    widgetReady = true;
    injectStyles();

    var trigger = document.createElement("button");
    trigger.id = "product-pulse-trigger";
    trigger.type = "button";
    trigger.textContent = "Feedback";
    trigger.addEventListener("click", function () {
      toggleModal();
    });

    var modal = document.createElement("div");
    modal.id = "product-pulse-modal";
    modal.innerHTML =
      '<h3>Share feedback</h3><p>Tell the team what happened on this page.</p><textarea placeholder="What went wrong, what felt confusing, or what should improve?"></textarea><div class="pp-row"><span class="pp-status"></span><div style="display:flex;gap:8px"><button id="product-pulse-cancel" type="button">Close</button><button id="product-pulse-submit" type="button">Send</button></div></div>';

    document.body.appendChild(trigger);
    document.body.appendChild(modal);

    elements.trigger = trigger;
    elements.modal = modal;
    elements.textarea = modal.getElementsByTagName("textarea")[0];
    elements.status = modal.querySelector(".pp-status");
    elements.submit = document.getElementById("product-pulse-submit");
    elements.cancel = document.getElementById("product-pulse-cancel");

    elements.cancel.addEventListener("click", function () {
      toggleModal(false);
    });
    elements.submit.addEventListener("click", submitFeedback);
  }

  function installGlobalErrorHandler() {
    if (window.__productPulseErrorHandlerInstalled) return;
    window.__productPulseErrorHandlerInstalled = true;

    window.addEventListener("error", function (event) {
      if (!config.apiKey) return;
      request("/error", {
        error_message: event.message || "Unknown browser error",
        stack: event.error && event.error.stack ? String(event.error.stack) : "",
        filename: event.filename || "",
        lineno: event.lineno || null,
        colno: event.colno || null,
        url: window.location.href,
        userAgent: window.navigator.userAgent,
        timestamp: new Date().toISOString(),
      }).catch(function () {});
    });
  }

  var ProductPulse = {
    init: function (options) {
      config.apiKey = options && options.apiKey ? String(options.apiKey) : "";
      config.apiBase = options && options.apiBase ? String(options.apiBase).replace(/\/$/, "") : getDefaultApiBase();

      if (!config.apiKey) {
        throw new Error("ProductPulse.init requires an apiKey.");
      }

      mountWidget();
      installGlobalErrorHandler();
      return ProductPulse;
    },

    track: function (eventName, data) {
      return request("/event", {
        event: eventName,
        data: data || {},
        url: window.location.href,
        userAgent: window.navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    },

    feedback: function (payload) {
      return request("/feedback", {
        message: payload && payload.message ? String(payload.message) : "",
        url: window.location.href,
        userAgent: window.navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    },
  };

  window.ProductPulse = ProductPulse;
})(window, document);
