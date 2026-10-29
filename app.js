// Default location: Boca Raton, FL
const DEFAULT = { name: "Boca Raton", lat: 26.3683, lon: -80.1289 };

// WMO weather codes -> [description, icon]
const CODES = {
  0: ["Clear", "☀️"], 1: ["Mostly Clear", "🌤️"], 2: ["Partly Cloudy", "⛅"], 3: ["Cloudy", "☁️"],
  45: ["Fog", "🌫️"], 48: ["Fog", "🌫️"],
  51: ["Light Drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy Drizzle", "🌧️"],
  61: ["Light Rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy Rain", "🌧️"],
  71: ["Light Snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy Snow", "❄️"],
  80: ["Showers", "🌦️"], 81: ["Showers", "🌧️"], 82: ["Heavy Showers", "⛈️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm", "⛈️"], 99: ["Thunderstorm", "⛈️"],
};
const info = (code) => CODES[code] || ["—", "🌡️"];
const $ = (id) => document.getElementById(id);

async function loadWeather({ name, lat, lon }) {
  $("place").textContent = name;
  $("desc").textContent = "Loading…";

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
    `&hourly=temperature_2m,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    render(await res.json());
  } catch {
    $("desc").textContent = "Couldn't load weather";
  }
}

function render(data) {
  const c = data.current;
  const d = data.daily;
  const [desc] = info(c.weather_code);

  $("temp").textContent = `${Math.round(c.temperature_2m)}°`;
  $("desc").textContent = desc;
  $("hilo").textContent = `H:${Math.round(d.temperature_2m_max[0])}°  L:${Math.round(d.temperature_2m_min[0])}°`;
  $("feels").textContent = `${Math.round(c.apparent_temperature)}°`;
  $("humidity").textContent = `${c.relative_humidity_2m}%`;
  $("wind").textContent = `${Math.round(c.wind_speed_10m)} mph`;
  $("uv").textContent = Math.round(d.uv_index_max[0]);

  // Next 24 hours, starting from the current hour
  const start = data.hourly.time.findIndex((t) => t >= c.time.slice(0, 13));
  $("hourly").innerHTML = data.hourly.time
    .slice(start, start + 24)
    .map((t, i) => {
      const idx = start + i;
      const hr = new Date(t).getHours();
      const label = i === 0 ? "Now" : `${hr % 12 || 12}${hr < 12 ? "am" : "pm"}`;
      return `<div class="hour"><span>${label}</span>
        <span class="icon">${info(data.hourly.weather_code[idx])[1]}</span>
        <span>${Math.round(data.hourly.temperature_2m[idx])}°</span></div>`;
    })
    .join("");

  // 7-day list with temperature range bars
  const min = Math.min(...d.temperature_2m_min);
  const max = Math.max(...d.temperature_2m_max);
  const pct = (v) => ((v - min) / (max - min || 1)) * 100;
  $("daily").innerHTML = d.time
    .map((t, i) => {
      const day = i === 0 ? "Today" : new Date(t + "T12:00").toLocaleDateString("en-US", { weekday: "short" });
      const lo = d.temperature_2m_min[i];
      const hi = d.temperature_2m_max[i];
      return `<div class="day"><span>${day}</span>
        <span class="icon">${info(d.weather_code[i])[1]}</span>
        <div class="range"><span class="lo">${Math.round(lo)}°</span>
          <div class="bar"><span style="left:${pct(lo)}%;right:${100 - pct(hi)}%"></span></div>
          <span class="hi">${Math.round(hi)}°</span></div></div>`;
    })
    .join("");
}

// City search via Open-Meteo geocoding
$("search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("city").value.trim();
  if (!q) return;
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`);
    const { results } = await res.json();
    if (!results) return alert("City not found");
    const r = results[0];
    loadWeather({ name: r.name, lat: r.latitude, lon: r.longitude });
    $("city").value = "";
  } catch {
    alert("Search failed");
  }
});

// Greeting based on time of day
const NAME = "Sami";
const h = new Date().getHours();
const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
$("greeting").textContent = `${part}, ${NAME}`;

// Theme switcher: light / dark / system (saved in the browser)
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll(".themes button").forEach((b) =>
    b.classList.toggle("active", b.dataset.theme === theme)
  );
  try { localStorage.setItem("theme", theme); } catch {}
}
document.querySelectorAll(".themes button").forEach((b) =>
  b.addEventListener("click", () => setTheme(b.dataset.theme))
);
setTheme(document.documentElement.dataset.theme || "system");

loadWeather(DEFAULT);
