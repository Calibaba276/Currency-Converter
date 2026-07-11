/**
 * Currency Converter
 * Fetches live rates via ExchangeRate API and updates the UI dynamically.
 */

const API_BASE = 'https://api.exchangerate.fun/latest';
const THEME_STORAGE_KEY = 'theme';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
];

const currencyMap = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));

const elements = {
  amount: document.getElementById('amount'),
  fromCurrency: document.getElementById('from-currency'),
  toCurrency: document.getElementById('to-currency'),
  swapBtn: document.getElementById('swap-btn'),
  copyBtn: document.getElementById('copy-btn'),
  themeToggle: document.getElementById('theme-toggle'),
  resultValue: document.getElementById('result-value'),
  rateInfo: document.getElementById('rate-info'),
  status: document.getElementById('status'),
  lastUpdated: document.getElementById('last-updated'),
  result: document.querySelector('.result'),
  toast: document.getElementById('toast'),
};

let debounceTimer = null;
let abortController = null;
let toastTimer = null;

function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

function setTheme(theme, persist = false) {
  document.documentElement.setAttribute('data-theme', theme);
  if (persist) {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
  elements.themeToggle.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
  );
}

function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark', true);
}

function initTheme() {
  elements.themeToggle.setAttribute(
    'aria-label',
    getTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
  );
}

function setCopyEnabled(enabled) {
  elements.copyBtn.disabled = !enabled;
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  elements.toast.classList.add('toast--visible');

  toastTimer = setTimeout(() => {
    elements.toast.classList.remove('toast--visible');
    toastTimer = setTimeout(() => {
      elements.toast.hidden = true;
    }, 200);
  }, 2000);
}

async function copyResult() {
  const text = elements.resultValue.textContent.trim();
  if (!text || text === '—') return;

  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied!');
  } catch {
    showToast('Could not copy');
  }
}

function updateResultDisplay(valueText, rateText, canCopy) {
  elements.resultValue.textContent = valueText;
  elements.rateInfo.textContent = rateText;
  setCopyEnabled(canCopy);
}

function populateDropdowns() {
  const options = CURRENCIES.map(
    (c) => `<option value="${c.code}">${c.code} — ${c.name}</option>`
  ).join('');

  elements.fromCurrency.innerHTML = options;
  elements.toCurrency.innerHTML = options;

  elements.fromCurrency.value = 'USD';
  elements.toCurrency.value = 'NGN';
}

function formatAmount(value, currencyCode) {
  const currency = currencyMap[currencyCode];
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: currencyCode === 'JPY' || currencyCode === 'KRW' ? 0 : 2,
    }).format(value);
  } catch {
    const symbol = currency?.symbol ?? currencyCode;
    return `${symbol} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

function setStatus(message, type = '') {
  if (!message) {
    elements.status.hidden = true;
    elements.status.textContent = '';
    elements.status.className = 'status';
    return;
  }

  elements.status.hidden = false;
  elements.status.textContent = message;
  elements.status.className = `status status--${type}`;
}

function setLoading(isLoading) {
  elements.result.classList.toggle('result--loading', isLoading);
  if (isLoading) {
    setCopyEnabled(false);
    setStatus('Fetching latest rates…', 'loading');
  } else {
    setStatus('');
  }
}

/**
 * Core conversion formula:
 * converted = amount × rate
 * We fetch rates with `from` as the base currency, so the API
 * returns how many units of `to` equal 1 unit of `from`.
 */
async function fetchConversionRate(from, to, amount) {
  if (from === to) {
    return { rate: 1, result: amount, date: new Date().toISOString().split('T')[0] };
  }

  if (abortController) {
    abortController.abort();
  }
  abortController = new AbortController();

  const url = `${API_BASE}?base=${from}`;

  const response = await fetch(url, { signal: abortController.signal });

  if (!response.ok) {
    throw new Error(`Unable to fetch rates (${response.status})`);
  }

  const data = await response.json();
  const rate = data.rates[to];

  if (rate === undefined) {
    throw new Error(`Rate not available for ${to}`);
  }

  const result = amount * rate;

  return {
    rate,
    result,
    date: new Date(data.timestamp * 1000).toISOString().split('T')[0],
  };
}

async function convert() {
  const amount = parseFloat(elements.amount.value);
  const from = elements.fromCurrency.value;
  const to = elements.toCurrency.value;

  if (isNaN(amount) || amount < 0) {
    updateResultDisplay('—', '', false);
    setStatus('Please enter a valid positive number.', 'error');
    return;
  }

  if (amount === 0) {
    updateResultDisplay(formatAmount(0, to), `1 ${from} = 0.00 ${to}`, true);
    setStatus('');
    return;
  }

  setLoading(true);

  try {
    const { rate, result, date } = await fetchConversionRate(from, to, amount);

    updateResultDisplay(
      formatAmount(result, to),
      `1 ${from} = ${rate.toFixed(4)} ${to}`,
      true
    );

    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    elements.lastUpdated.textContent = `Rates as of ${formattedDate}`;

    setStatus('');
  } catch (error) {
    if (error.name === 'AbortError') return;

    updateResultDisplay('—', '', false);
    setStatus('Could not load exchange rates. Check your connection and try again.', 'error');
  } finally {
    setLoading(false);
  }
}

function debouncedConvert() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(convert, 350);
}

function swapCurrencies() {
  const temp = elements.fromCurrency.value;
  elements.fromCurrency.value = elements.toCurrency.value;
  elements.toCurrency.value = temp;
  convert();
}

function init() {
  initTheme();
  populateDropdowns();

  elements.amount.addEventListener('input', debouncedConvert);
  elements.fromCurrency.addEventListener('change', convert);
  elements.toCurrency.addEventListener('change', convert);
  elements.swapBtn.addEventListener('click', swapCurrencies);
  elements.copyBtn.addEventListener('click', copyResult);
  elements.themeToggle.addEventListener('click', toggleTheme);

  convert();
}

init();
