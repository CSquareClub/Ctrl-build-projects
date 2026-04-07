# @smosm/agenticpulse

AgenticPulse behavior intelligence SDK for browser-based tracking, friction detection, and smart feedback collection.

## Install

```bash
npm install @smosm/agenticpulse
```

## Usage

```js
import AgenticPulse from "@smosm/agenticpulse";

AgenticPulse.init({
  projectId: "YOUR_PROJECT_ID",
  userId: "optional_user",
  autoTrack: true,
});
```

## API

### `init(config)`

```js
AgenticPulse.init({
  projectId: "YOUR_PROJECT_ID",
  userId: "optional_user",
  autoTrack: true,
  batchInterval: 5000,
  endpointBase: "https://your-api.com/api",
});
```

### `track(eventName, data)`

```js
AgenticPulse.track("checkout_clicked", {
  step: "pricing",
  plan: "pro",
});
```

### `feedback(payload)`

```js
AgenticPulse.feedback({
  message: "Checkout did not complete",
  intent: "purchase",
  severity: "high",
});
```

### `flush()`

```js
AgenticPulse.flush();
```

## Browser-only

This package is intended for browser execution. If you use Next.js, initialize it from a client component or inside a browser-only effect.

## Syncing from the app repo

This package mirrors the hosted SDK in `public/agenticpulse.js`.

From the repo root:

```bash
npm run sdk:sync
```
