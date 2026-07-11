# Currency Converter

A practical calculator that converts amounts between world currencies using real-time exchange rates.

## Features

- Live exchange rates via the [ExchangeRate API](https://github.com/haxqer/FreeExchangeRateApi) (no API key required)
- 30+ world currencies including NGN, USD, EUR, GBP, and more
- Instant conversion as you type
- Swap currencies with one click
- Accessible, mobile-friendly UI

## Getting Started

1. Open `index.html` in your browser, or serve the folder with a local server:

   ```bash
   npx serve .
   ```

2. Enter an amount, pick a source and target currency, and see the result update automatically.

## What You'll Learn

- **Asynchronous API calls** — `fetch()` with `async/await`, abort controllers, and error handling
- **Dropdown menus** — dynamically populated `<select>` elements bound to conversion logic
- **Dynamic UI updates** — debounced input, live result display, and loading/error feedback
- **Conversion math** — `converted = amount × exchange_rate`

## Tech Stack

- HTML5 (semantic markup, ARIA labels)
- CSS3 (responsive layout, focus states, reduced-motion support)
- Vanilla JavaScript (no frameworks)
