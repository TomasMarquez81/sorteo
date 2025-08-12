// ======================
// Estado & Configuración
// ======================
const STORAGE_KEY = "raffleAppConfig.v1";

const defaultConfig = {
    title: "Aplicación de Sorteos",
    subtitle:
        "Sube tu lista de participantes y configura el sorteo para empezar.",
    logoDataUrl: null, // Data URL si el usuario sube imagen
    theme: {
        bgDark: "#0f172a",
        bgPanel: "#1e293b",
        border: "#3b82f6",
        textLight: "#cbd5e1",
        textAccent: "#93c5fd",
        gradA: "#3b82f6",
        gradB: "#60a5fa",
        radius: 12,
        font: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    },
    prefs: {
        showAnimation: true,
        showLogoInResult: true,
        weightedByTickets: true,
    },
};

let appState = {
    tickets: [], // array de tickets (nombres repetidos)
    uniqueParticipants: [], // nombres únicos
    counts: new Map(), // nombre -> nº participaciones
    config: loadConfig(),
};

function loadConfig() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return structuredClone(defaultConfig);
        const parsed = JSON.parse(raw);
        // merge superficial con defaults para compatibilidad
        return {
            ...structuredClone(defaultConfig),
            ...parsed,
            theme: { ...defaultConfig.theme, ...(parsed.theme || {}) },
            prefs: { ...defaultConfig.prefs, ...(parsed.prefs || {}) },
        };
    } catch (e) {
        console.warn("Config corrupta, usando defaults", e);
        return structuredClone(defaultConfig);
    }
}

function saveConfig(cfg = appState.config) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

function applyTheme(cfg = appState.config) {
    const r = document.documentElement.style;
    r.setProperty("--bg-dark", cfg.theme.bgDark);
    r.setProperty("--bg-panel", cfg.theme.bgPanel);
    r.setProperty("--border-color", cfg.theme.border);
    r.setProperty("--text-light", cfg.theme.textLight);
    r.setProperty("--text-accent", cfg.theme.textAccent);
    r.setProperty("--accent-gradient-start", cfg.theme.gradA);
    r.setProperty("--accent-gradient-end", cfg.theme.gradB);
    r.setProperty("--radius", cfg.theme.radius + "px");
    r.setProperty("--font-family", cfg.theme.font);

    document.getElementById("app-title").textContent =
        cfg.title || defaultConfig.title;
    document.getElementById("app-subtitle").textContent =
        cfg.subtitle || defaultConfig.subtitle;

    const logoContainer = document.getElementById("app-logo");
    logoContainer.innerHTML = "";
    if (cfg.logoDataUrl) {
        const img = document.createElement("img");
        img.src = cfg.logoDataUrl;
        img.alt = "logo";
        logoContainer.appendChild(img);
    } else {
        // SVG por defecto
        logoContainer.innerHTML = `
          <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>`;
    }
}

// ==========
// Utilidades
// ==========
function parseParticipantsText(text) {
    const tickets = [];
    const counts = new Map();
    const unique = new Set();

    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
    for (const line of lines) {
        const [rawName, rawCount] = line.split(/,|;|\t/); // soporta coma, punto y coma, tab
        if (!rawName) continue;
        const name = rawName.trim();
        let count = parseInt((rawCount || "1").trim(), 10);
        if (!Number.isFinite(count) || count < 1) count = 1;

        unique.add(name);
        counts.set(name, (counts.get(name) || 0) + count);
        for (let i = 0; i < count; i++) tickets.push(name);
    }
    return { tickets, uniqueParticipants: Array.from(unique), counts };
}

function download(filename, dataUrl) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(file);
    });
}

// ========================
// Elementos del documento
// ========================
const $ = (sel) => document.querySelector(sel);

const el = {
    file: $("#participants-file"),
    winners: $("#winners-count"),
    alternates: $("#alternates-count"),
    drawBtn: $("#draw-button"),
    clearBtn: $("#clear-button"),
    configPanel: $("#config-panel"),
    mainPanel: $("#main-draw-panel"),
    anim: $("#animation-area"),
    roulette: $("#roulette"),
    status: $("#status-text"),
    resultsPanel: $("#results-panel"),
    winnersList: $("#winners-list-container"),
    alternatesList: $("#alternates-list-container"),
    resultsImage: $("#results-image"),
    downloadBtn: $("#download-button"),
    restartBtn: $("#restart-button"),
    clonedLogoContainer: $("#cloned-logo-container"),

    // Drawer config
    drawer: $("#config-drawer"),
    openConfig: $("#open-config"),
    saveConfig: $("#save-config"),
    resetConfig: $("#reset-config"),
    exportConfig: $("#export-config"),
    importConfig: $("#import-config"),

    // Campos config
    title: $("#title-input"),
    subtitle: $("#subtitle-input"),
    logo: $("#logo-input"),
    cBgDark: $("#c-bg-dark"),
    cBgPanel: $("#c-bg-panel"),
    cBorder: $("#c-border"),
    cTextLight: $("#c-text-light"),
    cTextAccent: $("#c-text-accent"),
    cGradA: $("#c-grad-a"),
    cGradB: $("#c-grad-b"),
    radius: $("#radius-input"),
    font: $("#font-select"),
    pShowAnim: $("#show-animation"),
    pShowLogo: $("#show-logo-in-result"),
    pWeighted: $("#weighted-by-tickets"),
};

// =====================
// Inicialización UI
// =====================
applyTheme(appState.config);
hydrateConfigForm(appState.config);

function hydrateConfigForm(cfg) {
    el.title.value = cfg.title;
    el.subtitle.value = cfg.subtitle;
    el.cBgDark.value = cfg.theme.bgDark;
    el.cBgPanel.value = cfg.theme.bgPanel;
    el.cBorder.value = cfg.theme.border;
    el.cTextLight.value = cfg.theme.textLight;
    el.cTextAccent.value = cfg.theme.textAccent;
    el.cGradA.value = cfg.theme.gradA;
    el.cGradB.value = cfg.theme.gradB;
    el.radius.value = cfg.theme.radius;
    el.font.value = cfg.theme.font;
    el.pShowAnim.checked = cfg.prefs.showAnimation;
    el.pShowLogo.checked = cfg.prefs.showLogoInResult;
    el.pWeighted.checked = cfg.prefs.weightedByTickets;
}

function readConfigForm() {
    return {
        ...appState.config,
        title: el.title.value.trim() || defaultConfig.title,
        subtitle: el.subtitle.value.trim() || defaultConfig.subtitle,
        theme: {
            ...appState.config.theme,
            bgDark: el.cBgDark.value,
            bgPanel: el.cBgPanel.value,
            border: el.cBorder.value,
            textLight: el.cTextLight.value,
            textAccent: el.cTextAccent.value,
            gradA: el.cGradA.value,
            gradB: el.cGradB.value,
            radius: parseInt(el.radius.value, 10) || defaultConfig.theme.radius,
            font: el.font.value,
        },
        prefs: {
            ...appState.config.prefs,
            showAnimation: el.pShowAnim.checked,
            showLogoInResult: el.pShowLogo.checked,
            weightedByTickets: el.pWeighted.checked,
        },
    };
}

// Toggle drawer
el.openConfig.addEventListener("click", () => {
    el.drawer.classList.toggle("open");
    el.drawer.setAttribute(
        "aria-hidden",
        el.drawer.classList.contains("open") ? "false" : "true"
    );
});

// Guardar
el.saveConfig.addEventListener("click", async () => {
    const cfg = readConfigForm();
    // Logo (si se seleccionó ahora)
    if (el.logo.files && el.logo.files[0]) {
        try {
            cfg.logoDataUrl = await fileToDataUrl(el.logo.files[0]);
        } catch (e) {
            console.error("Error leyendo logo", e);
        }
    }
    appState.config = cfg;
    saveConfig(cfg);
    applyTheme(cfg);
});

// Restablecer
el.resetConfig.addEventListener("click", () => {
    if (!confirm("¿Restablecer configuración a valores por defecto?")) return;
    appState.config = structuredClone(defaultConfig);
    saveConfig(appState.config);
    hydrateConfigForm(appState.config);
    applyTheme(appState.config);
});

// Exportar JSON
el.exportConfig.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(appState.config, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    download("config-sorteos.json", url);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
});

// Importar JSON
el.importConfig.addEventListener("change", () => {
    const f = el.importConfig.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const parsed = JSON.parse(reader.result);
            appState.config = {
                ...structuredClone(defaultConfig),
                ...parsed,
                theme: { ...defaultConfig.theme, ...(parsed.theme || {}) },
                prefs: { ...defaultConfig.prefs, ...(parsed.prefs || {}) },
            };
            saveConfig(appState.config);
            hydrateConfigForm(appState.config);
            applyTheme(appState.config);
            alert("Configuración importada.");
        } catch (e) {
            alert("JSON inválido");
        }
    };
    reader.readAsText(f);
});

// =====================
// Carga de participantes
// =====================
el.file.addEventListener("change", (ev) => {
    const file = ev.target.files?.[0];
    if (!file) {
        el.drawBtn.disabled = true;
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const { tickets, uniqueParticipants, counts } =
                parseParticipantsText(String(e.target.result));
            appState.tickets = tickets;
            appState.uniqueParticipants = uniqueParticipants;
            appState.counts = counts;
            el.drawBtn.disabled = tickets.length === 0;
        } catch (err) {
            console.error(err);
            alert("Error al procesar el archivo.");
            el.drawBtn.disabled = true;
        }
    };
    reader.onerror = () => {
        alert("Error al leer el archivo.");
        el.drawBtn.disabled = true;
    };
    reader.readAsText(file);
});

// =====================
// Lógica del sorteo
// =====================
el.drawBtn.addEventListener("click", () => {
    const numWinners = parseInt(el.winners.value, 10);
    const numAlternates = parseInt(el.alternates.value, 10);
    if (!Number.isFinite(numWinners) || numWinners < 1) {
        alert("El número de ganadores debe ser al menos 1.");
        return;
    }
    if (numWinners + numAlternates > appState.uniqueParticipants.length) {
        alert(
            "Ganadores + suplentes no puede ser mayor que el número de participantes únicos."
        );
        return;
    }

    // Oculta config y muestra animación si procede
    el.configPanel.style.display = "none";
    el.mainPanel.style.display = "block";
    if (appState.config.prefs.showAnimation) el.anim.style.display = "block";

    runDrawSequence(numWinners, numAlternates);
});

el.clearBtn.addEventListener("click", () => {
    appState.tickets = [];
    appState.uniqueParticipants = [];
    appState.counts = new Map();
    el.file.value = "";
    el.drawBtn.disabled = true;
    alert("Datos limpiados.");
});

el.restartBtn.addEventListener("click", () => {
    // Vuelve al panel inicial
    el.resultsPanel.style.display = "none";
    el.configPanel.style.display = "block";
    el.mainPanel.style.display = "none";
    el.anim.style.display = "none";
});

async function runDrawSequence(numWinners, numAlternates) {
    const winners = [];
    const alternates = [];

    // Copias mutables
    let availableNames = new Set(appState.uniqueParticipants);
    let workingTickets = appState.config.prefs.weightedByTickets
        ? appState.tickets.slice() // ponderado
        : appState.uniqueParticipants.slice(); // no ponderado

    // helper para eliminar todas las ocurrencias de un nombre en workingTickets
    const pruneName = (name) => {
        if (Array.isArray(workingTickets)) {
            workingTickets = workingTickets.filter((n) => n !== name);
        } else {
            workingTickets = workingTickets.filter((n) => n !== name);
        }
        availableNames.delete(name);
    };

    // Selección genérica
    const pickOne = async (label, total) => {
        el.status.textContent = `${label} ${
            (label.includes("GANADOR") ? winners.length : alternates.length) + 1
        } de ${total}...`;
        let selected;

        if (appState.config.prefs.showAnimation) {
            selected = await animateAndPick(workingTickets);
        } else {
            // selección instantánea
            selected =
                workingTickets[
                    Math.floor(Math.random() * workingTickets.length)
                ];
        }

        // Garantiza que el nombre esté disponible (por si workingTickets tuviera restos)
        if (!availableNames.has(selected)) {
            // si cae en uno ya usado, forzar otro
            const pool = Array.from(availableNames);
            selected = pool[Math.floor(Math.random() * pool.length)];
        }
        pruneName(selected);
        return selected;
    };

    // Ganadores
    for (let i = 0; i < numWinners; i++) {
        winners.push(await pickOne("SELECCIONANDO GANADOR/A", numWinners));
    }
    // Suplentes
    for (let i = 0; i < numAlternates; i++) {
        alternates.push(await pickOne("SELECCIONANDO SUPLENTE", numAlternates));
    }

    displayResults(winners, alternates);
}

function animateAndPick(pool) {
    return new Promise((resolve) => {
        const animationDuration = 2800;
        const fastInterval = 45;
        const slowDownStart = animationDuration - 1400;

        const spin = setInterval(() => {
            el.roulette.textContent =
                pool[Math.floor(Math.random() * pool.length)] || "...";
        }, fastInterval);

        setTimeout(() => {
            clearInterval(spin);
            const selected = pool[Math.floor(Math.random() * pool.length)];
            const slowIntervals = [90, 160, 250, 380, 520];
            let idx = 0;
            (function slow() {
                el.roulette.textContent =
                    pool[Math.floor(Math.random() * pool.length)] || "...";
                if (idx < slowIntervals.length) {
                    setTimeout(slow, slowIntervals[idx++]);
                } else {
                    el.roulette.textContent = selected;
                    setTimeout(() => resolve(selected), 900);
                }
            })();
        }, slowDownStart);
    });
}

// =====================
// Resultados & Exportar
// =====================
function displayResults(winners, alternates) {
    el.mainPanel.style.display = "none";
    el.resultsPanel.style.display = "block";

    let wHtml = '<h3>🏆 GANADORES</h3><ul class="results-list">';
    winners.forEach(
        (n, i) =>
            (wHtml += `<li><span class="number">${i + 1}.</span> ${n}</li>`)
    );
    wHtml += "</ul>";
    el.winnersList.innerHTML = wHtml;

    if (alternates.length) {
        let aHtml = '<h3>✨ SUPLENTES</h3><ul class="results-list">';
        alternates.forEach(
            (n, i) =>
                (aHtml += `<li><span class="number">${i + 1}.</span> ${n}</li>`)
        );
        aHtml += "</ul>";
        el.alternatesList.innerHTML = aHtml;
    } else {
        el.alternatesList.innerHTML = "";
    }
}

el.downloadBtn.addEventListener("click", () => {
    // logo opcional dentro de la imagen
    const logoWrap = el.clonedLogoContainer;
    logoWrap.innerHTML = "";
    if (appState.config.prefs.showLogoInResult) {
        const original = document.getElementById("app-logo");
        const clone = original.cloneNode(true);
        clone.style.margin = "0 auto 12px";
        clone.style.display = "inline-block";
        logoWrap.appendChild(clone);
        logoWrap.style.display = "block";
    } else {
        logoWrap.style.display = "none";
    }

    const options = {
        scale: 2,
        useCORS: true,
        backgroundColor: getComputedStyle(document.documentElement)
            .getPropertyValue("--bg-panel")
            .trim(),
    };

    html2canvas(el.resultsImage, options)
        .then((canvas) => {
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                download("resultados-sorteo.png", url);
                URL.revokeObjectURL(url);
            });
            logoWrap.style.display = "none";
        })
        .catch((err) => {
            console.error("Error al generar la imagen", err);
            alert("Hubo un error al generar la imagen.");
            logoWrap.style.display = "none";
        });
});
