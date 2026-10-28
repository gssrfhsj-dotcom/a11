// ===================== COSMOS Space Dashboard =====================
const NASA_KEY = "DEMO_KEY"; // الأفضل تعمل key مجاني من api.nasa.gov
const APOD_URL = "https://api.nasa.gov/planetary/apod";
const LAUNCHES_URL = "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10";
const PLANETS_URL =
  "https://api.le-systeme-solaire.net/rest/bodies?filter[]=isPlanet,eq,true";
const AU_KM = 149597870.7;

const $ = (id) => document.getElementById(id);

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// ===================== Navigation =====================
const ACTIVE_NAV = ["bg-blue-500/10", "text-blue-400"];
const INACTIVE_NAV = ["text-slate-300", "hover:bg-slate-800"];

function showSection(name) {
  document.querySelectorAll(".app-section").forEach((s) => {
    s.classList.toggle("hidden", s.dataset.section !== name);
  });
  document.querySelectorAll(".nav-link").forEach((link) => {
    const active = link.dataset.section === name;
    link.classList.remove(...ACTIVE_NAV, ...INACTIVE_NAV);
    link.classList.add(...(active ? ACTIVE_NAV : INACTIVE_NAV));
  });
  $("sidebar")?.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initNav() {
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showSection(link.dataset.section);
    });
  });
  $("sidebar-toggle")?.addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
  });
}

// ===================== 1) Today in Space (APOD) =====================
const longDate = (str) =>
  new Date(str + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
const shortDate = (str) =>
  new Date(str + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

async function loadApod(date) {
  const loading = $("apod-loading");
  const img = $("apod-image");
  loading.classList.remove("hidden");
  img.classList.add("hidden");
  $("apod-video")?.remove();

  try {
    const url = `${APOD_URL}?api_key=${NASA_KEY}${date ? `&date=${date}` : ""}`;
    const d = await getJSON(url);

    if (d.media_type === "video") {
      const iframe = document.createElement("iframe");
      iframe.id = "apod-video";
      iframe.src = d.url;
      iframe.allowFullscreen = true;
      iframe.className = "w-full h-full";
      $("apod-image-container").appendChild(iframe);
    } else {
      img.src = d.url;
      img.alt = d.title;
      img.classList.remove("hidden");
    }

    $("apod-date").textContent = `Astronomy Picture of the Day - ${longDate(d.date)}`;
    $("apod-title").textContent = d.title;
    $("apod-date-detail").innerHTML = `<i class="far fa-calendar mr-2"></i>${d.date}`;
    $("apod-explanation").textContent = d.explanation;
    $("apod-copyright").innerHTML = d.copyright
      ? `&copy; ${d.copyright.replace(/\n/g, " ").trim()}`
      : "Public Domain / NASA";
    $("apod-date-info").textContent = d.date;
    $("apod-media-type").textContent =
      d.media_type.charAt(0).toUpperCase() + d.media_type.slice(1);

    $("apod-date-input").value = d.date;
    const label = document.querySelector(".date-input-wrapper span");
    if (label) label.textContent = shortDate(d.date);

    // زرار View Full Resolution
    const fullBtn = $("apod-image-container").querySelector("button");
    if (fullBtn) {
      fullBtn.onclick = () => window.open(d.hdurl || d.url, "_blank");
    }
  } catch (e) {
    console.error(e);
    img.classList.add("hidden");
    $("apod-title").textContent = "Unable to load image";
    $("apod-explanation").textContent =
      "حصلت مشكلة في تحميل صورة اليوم (ممكن يكون وصلت للحد الأقصى للطلبات أو التاريخ غير صالح). حاول مرة أخرى بعد شوية.";
    $("apod-copyright").textContent = "";
  } finally {
    loading.classList.add("hidden");
  }
}

function initApod() {
  const input = $("apod-date-input");
  const today = new Date().toISOString().slice(0, 10);
  input.max = today;
  input.value = today;

  $("load-date-btn").addEventListener("click", () => {
    if (input.value) loadApod(input.value);
  });
  $("today-apod-btn").addEventListener("click", () => {
    input.value = today;
    loadApod();
  });
  input.addEventListener("change", () => {
    const label = document.querySelector(".date-input-wrapper span");
    if (label && input.value) label.textContent = shortDate(input.value);
  });

  loadApod();
}

// ===================== 2) Launches =====================
const utcDate = (iso, long = false) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: long ? "long" : "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
const utcTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }) + " UTC";

function statusColor(abbrev) {
  const map = {
    Go: "green",
    TBC: "yellow",
    TBD: "blue",
    Success: "green",
    Failure: "red",
    Hold: "orange",
  };
  return map[abbrev] || "slate";
}

function launchCard(l) {
  const abbrev = l.status?.abbrev || l.status?.name || "N/A";
  const color = statusColor(abbrev);
  return `
    <div class="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all group cursor-pointer">
      <div class="relative h-48 bg-slate-900/50 flex items-center justify-center">
        ${
          l.image
            ? `<img src="${l.image}" alt="${l.name}" class="w-full h-full object-cover" />`
            : `<i class="fas fa-rocket text-5xl text-slate-700"></i>`
        }
        <div class="absolute top-3 right-3">
          <span class="px-3 py-1 bg-${color}-500/90 text-white backdrop-blur-sm rounded-full text-xs font-semibold">${abbrev}</span>
        </div>
      </div>
      <div class="p-5">
        <div class="mb-3">
          <h4 class="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">${l.name}</h4>
          <p class="text-sm text-slate-400 flex items-center gap-2">
            <i class="fas fa-building text-xs"></i>${l.launch_service_provider?.name ?? "Unknown"}
          </p>
        </div>
        <div class="space-y-2 mb-4">
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-calendar text-slate-500 w-4"></i>
            <span class="text-slate-300">${l.net ? utcDate(l.net) : "TBD"}</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-clock text-slate-500 w-4"></i>
            <span class="text-slate-300">${l.net ? utcTime(l.net) : "TBD"}</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-rocket text-slate-500 w-4"></i>
            <span class="text-slate-300">${l.rocket?.configuration?.name ?? "N/A"}</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-map-marker-alt text-slate-500 w-4"></i>
            <span class="text-slate-300 line-clamp-1">${l.pad?.location?.name ?? l.pad?.name ?? "N/A"}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 pt-4 border-t border-slate-700">
          <button class="flex-1 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-sm font-semibold">Details</button>
          <button class="px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"><i class="far fa-heart"></i></button>
        </div>
      </div>
    </div>`;
}

function featuredLaunch(l) {
  const abbrev = l.status?.abbrev || l.status?.name || "N/A";
  const color = statusColor(abbrev);
  const days = l.net
    ? Math.max(0, Math.ceil((new Date(l.net) - Date.now()) / 86400000))
    : "-";
  const desc =
    l.mission?.description || "No description available for this launch yet.";
  return `
    <div class="relative bg-slate-800/30 border border-slate-700 rounded-3xl overflow-hidden group hover:border-blue-500/50 transition-all">
      <div class="absolute inset-0 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div class="relative grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
        <div class="flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-3 mb-4">
              <span class="px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold flex items-center gap-2">
                <i class="fas fa-star"></i>Featured Launch
              </span>
              <span class="px-4 py-1.5 bg-${color}-500/20 text-${color}-400 rounded-full text-sm font-semibold">${abbrev}</span>
            </div>
            <h3 class="text-3xl font-bold mb-3 leading-tight">${l.name}</h3>
            <div class="flex flex-col xl:flex-row xl:items-center gap-4 mb-6 text-slate-400">
              <div class="flex items-center gap-2"><i class="fas fa-building"></i><span>${l.launch_service_provider?.name ?? "Unknown"}</span></div>
              <div class="flex items-center gap-2"><i class="fas fa-rocket"></i><span>${l.rocket?.configuration?.name ?? "N/A"}</span></div>
            </div>
            <div class="inline-flex items-center gap-3 px-6 py-3 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-xl mb-6">
              <i class="fas fa-clock text-2xl text-blue-400"></i>
              <div>
                <p class="text-2xl font-bold text-blue-400">${days}</p>
                <p class="text-xs text-slate-400">Days Until Launch</p>
              </div>
            </div>
            <div class="grid xl:grid-cols-2 gap-4 mb-6">
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-calendar"></i>Launch Date</p>
                <p class="font-semibold">${l.net ? utcDate(l.net, true) : "TBD"}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-clock"></i>Launch Time</p>
                <p class="font-semibold">${l.net ? utcTime(l.net) : "TBD"}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-map-marker-alt"></i>Location</p>
                <p class="font-semibold text-sm">${l.pad?.location?.name ?? l.pad?.name ?? "N/A"}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-globe"></i>Country</p>
                <p class="font-semibold">${l.pad?.location?.country_code ?? "N/A"}</p>
              </div>
            </div>
            <p class="text-slate-300 leading-relaxed mb-6">${desc}</p>
          </div>
          <div class="flex flex-col md:flex-row gap-3">
            <button class="flex-1 self-start md:self-center px-6 py-3 bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors font-semibold flex items-center justify-center gap-2">
              <i class="fas fa-info-circle"></i>View Full Details
            </button>
            <div class="icons self-end md:self-center">
              <button class="px-4 py-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors"><i class="far fa-heart"></i></button>
              <button class="px-4 py-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors"><i class="fas fa-bell"></i></button>
            </div>
          </div>
        </div>
        <div class="relative">
          <div class="relative h-full min-h-[400px] rounded-2xl overflow-hidden bg-slate-900/50">
            ${
              l.image
                ? `<img src="${l.image}" alt="${l.name}" class="absolute inset-0 w-full h-full object-cover" />`
                : `<div class="flex items-center justify-center h-full min-h-[400px] bg-slate-800"><i class="fas fa-rocket text-9xl text-slate-700/50"></i></div>`
            }
            <div class="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent"></div>
          </div>
        </div>
      </div>
    </div>`;
}

async function loadLaunches() {
  const grid = $("launches-grid");
  const featured = $("featured-launch");
  grid.innerHTML = `<p class="text-slate-400 animate-pulse col-span-full">Loading launches...</p>`;
  try {
    const { results } = await getJSON(LAUNCHES_URL);
    if (!results?.length) throw new Error("No launches");

    $("launches-count").textContent = `${results.length} Launches`;
    $("launches-count-mobile").textContent = results.length;

    featured.innerHTML = featuredLaunch(results[0]);
    grid.innerHTML = results.slice(1).map(launchCard).join("");
  } catch (e) {
    console.error(e);
    featured.innerHTML = "";
    grid.innerHTML = `<p class="text-red-400 col-span-full">تعذر تحميل الرحلات (ممكن تكون وصلت للحد الأقصى للطلبات، جرب بعد شوية).</p>`;
  }
}

// ===================== 3) Planets =====================
const PLANET_META = {
  mercury: { color: "#eab308", type: "Terrestrial", badge: "bg-orange-500/50 text-orange-200",
    desc: "Mercury is the smallest planet in the Solar System and the closest to the Sun. It has almost no atmosphere, so its surface swings between scorching days and freezing nights." },
  venus: { color: "#f97316", type: "Terrestrial", badge: "bg-orange-500/50 text-orange-200",
    desc: "Venus is the hottest planet in the Solar System, wrapped in a thick carbon dioxide atmosphere that traps heat. It spins backwards compared to most planets." },
  earth: { color: "#3b82f6", type: "Terrestrial", badge: "bg-blue-500/50 text-blue-200",
    desc: "Earth is the third planet from the Sun and the only astronomical object known to harbor life. About 71% of its surface is covered with water, mostly oceans." },
  mars: { color: "#ef4444", type: "Terrestrial", badge: "bg-red-500/50 text-red-200",
    desc: "Mars is a cold, dusty desert world with the tallest volcano in the Solar System, Olympus Mons. Evidence shows it once had liquid water on its surface." },
  jupiter: { color: "#fb923c", type: "Gas Giant", badge: "bg-purple-500/50 text-purple-200",
    desc: "Jupiter is the largest planet in the Solar System, a gas giant with a Great Red Spot storm bigger than Earth that has raged for centuries." },
  saturn: { color: "#facc15", type: "Gas Giant", badge: "bg-yellow-500/50 text-yellow-200",
    desc: "Saturn is a gas giant famous for its spectacular system of icy rings. It is the least dense planet in the Solar System, lighter than water." },
  uranus: { color: "#06b6d4", type: "Ice Giant", badge: "bg-cyan-500/50 text-cyan-200",
    desc: "Uranus is an ice giant that rotates on its side, with an axial tilt of about 98 degrees. Its blue-green color comes from methane in its atmosphere." },
  neptune: { color: "#2563eb", type: "Ice Giant", badge: "bg-blue-500/50 text-blue-200",
    desc: "Neptune is the farthest known planet from the Sun, a cold, dark ice giant with the fastest winds in the Solar System." },
};

let planetsData = {}; // englishName.toLowerCase() -> body

const SUP = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
const sup = (n) => String(n).split("").map((c) => SUP[c] ?? c).join("");
const num = (n, d = 0) =>
  n == null ? "N/A" : Number(n).toLocaleString("en-US", { maximumFractionDigits: d });
const sci = (o, vKey, eKey, unit) =>
  o ? `${Number(o[vKey]).toFixed(2)} × 10${sup(o[eKey])} ${unit}` : "N/A";
const millionKm = (km) => (km == null ? "N/A" : `${(km / 1e6).toFixed(1)}M km`);

function period(days) {
  if (days == null) return "N/A";
  return days >= 700 ? `${(days / 365.25).toFixed(1)} years` : `${num(days, 1)} days`;
}

function buildFacts(p) {
  const facts = [];
  facts.push(`Orbits the Sun every ${period(p.sideralOrbit)}`);
  facts.push(`Has ${p.moons ? p.moons.length : 0} known moon${p.moons?.length === 1 ? "" : "s"}`);
  if (p.gravity != null) facts.push(`Surface gravity is ${num(p.gravity, 2)} m/s²`);
  if (p.avgTemp != null) facts.push(`Average temperature is ${Math.round(p.avgTemp - 273.15)}°C`);
  if (p.axialTilt != null) facts.push(`Axial tilt of ${num(p.axialTilt, 2)}°`);
  return facts
    .map(
      (f) => `<li class="flex items-start">
        <i class="fas fa-check text-green-400 mt-1 mr-2"></i>
        <span class="text-slate-300">${f}</span></li>`
    )
    .join("");
}

function showPlanet(id) {
  const p = planetsData[id] ?? FALLBACK[id];
  const meta = PLANET_META[id];
  if (!p || !meta) return;

  $("planet-detail-image").src = `/${id}.png`;
  $("planet-detail-image").alt = p.englishName;
  $("planet-detail-name").textContent = p.englishName;
  $("planet-detail-description").textContent = meta.desc;

  $("planet-distance").textContent = millionKm(p.semimajorAxis);
  $("planet-radius").textContent = `${num(p.meanRadius, 1)} km`;
  $("planet-mass").textContent = sci(p.mass, "massValue", "massExponent", "kg");
  $("planet-density").textContent = p.density != null ? `${num(p.density, 2)} g/cm³` : "N/A";
  $("planet-orbital-period").textContent = period(p.sideralOrbit);
  $("planet-rotation").textContent =
    p.sideralRotation != null ? `${num(Math.abs(p.sideralRotation), 2)} hours` : "N/A";
  $("planet-moons").textContent = p.moons ? p.moons.length : 0;
  $("planet-gravity").textContent = p.gravity != null ? `${num(p.gravity, 2)} m/s²` : "N/A";

  $("planet-discoverer").textContent = p.discoveredBy || "Known since antiquity";
  $("planet-discovery-date").textContent = p.discoveryDate || "Ancient";
  $("planet-body-type").textContent = p.bodyType || "Planet";
  $("planet-volume").textContent = sci(p.vol, "volValue", "volExponent", "km³");

  $("planet-facts").innerHTML = buildFacts(p);

  $("planet-perihelion").textContent = millionKm(p.perihelion);
  $("planet-aphelion").textContent = millionKm(p.aphelion);
  $("planet-eccentricity").textContent = p.eccentricity != null ? num(p.eccentricity, 4) : "N/A";
  $("planet-inclination").textContent = p.inclination != null ? `${num(p.inclination, 2)}°` : "N/A";
  $("planet-axial-tilt").textContent = p.axialTilt != null ? `${num(p.axialTilt, 2)}°` : "N/A";
  $("planet-temp").textContent = p.avgTemp != null ? `${Math.round(p.avgTemp - 273.15)}°C` : "N/A";
  $("planet-escape").textContent = p.escape != null ? `${(p.escape / 1000).toFixed(1)} km/s` : "N/A";

  // تمييز الكارت المختار
  document.querySelectorAll(".planet-card").forEach((card) => {
    const active = card.dataset.planetId === id;
    card.style.boxShadow = active ? `0 0 0 2px ${meta.color}` : "none";
  });
}

function renderComparison() {
  const earthMass = planetsData.earth?.mass
    ? planetsData.earth.mass.massValue * 10 ** planetsData.earth.mass.massExponent
    : null;

  const order = Object.keys(PLANET_META);
  $("planet-comparison-tbody").innerHTML = order
    .filter((id) => planetsData[id])
    .map((id) => {
      const p = planetsData[id];
      const m = PLANET_META[id];
      const rel =
        earthMass && p.mass
          ? ((p.mass.massValue * 10 ** p.mass.massExponent) / earthMass).toFixed(3)
          : "N/A";
      const td = `class="px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap"`;
      return `
        <tr class="hover:bg-slate-800/30 transition-colors ${id === "earth" ? "bg-blue-500/5" : ""}">
          <td class="px-4 md:px-6 py-3 md:py-4 sticky left-0 bg-slate-800 z-10">
            <div class="flex items-center space-x-2 md:space-x-3">
              <div class="w-6 h-6 md:w-8 md:h-8 rounded-full flex-shrink-0" style="background-color: ${m.color}"></div>
              <span class="font-semibold text-sm md:text-base whitespace-nowrap">${p.englishName}</span>
            </div>
          </td>
          <td ${td}>${(p.semimajorAxis / AU_KM).toFixed(2)}</td>
          <td ${td}>${num(p.meanRadius * 2)}</td>
          <td ${td}>${rel}</td>
          <td ${td}>${period(p.sideralOrbit)}</td>
          <td ${td}>${p.moons ? p.moons.length : 0}</td>
          <td class="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
            <span class="px-2 py-1 rounded text-xs ${m.badge}">${m.type}</span>
          </td>
        </tr>`;
    })
    .join("");
}

// بيانات احتياطية (تُستخدم فقط لو الـ API وقع أو اتحجب)
const moonsArr = (n) => Array.from({ length: n }, () => ({}));
const mk = (englishName, a, r, mv, me, dens, orb, rot, moons, g, by, dd, vv, ve, peri, aph, ecc, inc, tilt, temp, esc) => ({
  englishName, semimajorAxis: a, meanRadius: r,
  mass: { massValue: mv, massExponent: me }, density: dens,
  sideralOrbit: orb, sideralRotation: rot, moons: moonsArr(moons), gravity: g,
  discoveredBy: by, discoveryDate: dd, bodyType: "Planet",
  vol: { volValue: vv, volExponent: ve },
  perihelion: peri, aphelion: aph, eccentricity: ecc, inclination: inc,
  axialTilt: tilt, avgTemp: temp, escape: esc,
});
const FALLBACK_BODIES = [
  mk("Mercury", 57909050, 2439.7, 3.30, 23, 5.427, 87.97, 1407.6, 0, 3.7, "", "", 6.083, 10, 46001200, 69816900, 0.2056, 7.0, 0.03, 440, 4250),
  mk("Venus", 108208000, 6051.8, 4.87, 24, 5.243, 224.7, -5832.5, 0, 8.87, "", "", 9.28, 11, 107476000, 108942000, 0.0068, 3.39, 177.4, 737, 10360),
  mk("Earth", 149598023, 6371.0, 5.97, 24, 5.514, 365.256, 23.9345, 1, 9.8, "", "", 1.08, 12, 147095000, 152100000, 0.0167, 0, 23.44, 288, 11190),
  mk("Mars", 227939366, 3389.5, 6.42, 23, 3.933, 686.98, 24.62, 2, 3.71, "", "", 1.6318, 11, 206650000, 249261000, 0.0935, 1.85, 25.19, 210, 5030),
  mk("Jupiter", 778340821, 69911, 1.898, 27, 1.326, 4332.59, 9.925, 95, 24.79, "", "", 1.4313, 15, 740595000, 816363000, 0.0489, 1.304, 3.13, 165, 59500),
  mk("Saturn", 1426666422, 58232, 5.68, 26, 0.687, 10759.22, 10.656, 146, 10.44, "", "", 8.2713, 14, 1357554000, 1506527000, 0.0565, 2.485, 26.73, 134, 35500),
  mk("Uranus", 2870658186, 25362, 8.68, 25, 1.27, 30688.5, -17.24, 28, 8.87, "William Herschel", "13/03/1781", 6.833, 13, 2732696000, 3001390000, 0.0457, 0.772, 97.77, 76, 21300),
  mk("Neptune", 4498396441, 24622, 1.02, 26, 1.638, 60182, 16.11, 16, 11.15, "Urbain Le Verrier, Johann Gottfried Galle", "23/09/1846", 6.254, 13, 4471050000, 4558857000, 0.0113, 1.767, 28.32, 72, 23500),
];
const FALLBACK = Object.fromEntries(
  FALLBACK_BODIES.map((b) => [b.englishName.toLowerCase(), b])
);

async function fetchPlanets() {
  // المحاولة 1: كل الكواكب في طلب واحد
  try {
    const { bodies } = await getJSON(PLANETS_URL);
    if (bodies?.length) return bodies;
  } catch (e) {
    console.warn("Planets list request failed, trying one by one...", e);
  }
  // المحاولة 2: كل كوكب لوحده (الـ ids بالفرنسي في الـ API)
  const ids = ["mercure", "venus", "terre", "mars", "jupiter", "saturne", "uranus", "neptune"];
  const results = await Promise.allSettled(
    ids.map((id) => getJSON(`https://api.le-systeme-solaire.net/rest/bodies/${id}`))
  );
  const ok = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  if (ok.length) return ok;
  throw new Error("Planets API unavailable");
}

async function loadPlanets() {
  // الـ click listeners الأول عشان الكروت تشتغل في كل الحالات
  document.querySelectorAll(".planet-card").forEach((card) => {
    card.addEventListener("click", () => showPlanet(card.dataset.planetId));
  });

  let bodies;
  try {
    bodies = await fetchPlanets();
  } catch (e) {
    console.error(e);
    bodies = FALLBACK_BODIES; // الـ API مش شغال، نعرض البيانات الاحتياطية
  }

  planetsData = {};
  bodies.forEach((b) => {
    planetsData[b.englishName.toLowerCase()] = b;
  });

  try {
    renderComparison();
    showPlanet("earth");
  } catch (e) {
    console.error("Render error:", e);
  }
}

// ===================== Init =====================
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initApod();
  loadLaunches();
  loadPlanets();
});