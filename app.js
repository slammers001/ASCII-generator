const CHAR_SETS = {
  simple: "@%#*+=-:. ",
  complex: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. "
};

const THEMES = {
  dark: { color: "#ffffff", background: "#010409" },
  light: { color: "#000000", background: "#ffffff" },
  none: { color: "", background: "" }
};

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const originalImg = document.getElementById("original");
const asciiPre = document.getElementById("ascii");
const workspace = document.getElementById("workspace");
const modeSelect = document.getElementById("mode");
const numColsInput = document.getElementById("num-cols");
const numColsValue = document.getElementById("num-cols-value");
const fontSizeInput = document.getElementById("font-size");
const fontSizeValue = document.getElementById("font-size-value");
const invertInput = document.getElementById("invert");
const colorInput = document.getElementById("color");
const fitInput = document.getElementById("fit");
const themeSelect = document.getElementById("theme");
const btnDownloadTxt = document.getElementById("btn-download-txt");
const btnDownloadPng = document.getElementById("btn-download-png");
const btnChange = document.getElementById("btn-change");
const asciiWrap = document.getElementById("ascii-wrap");

let sourceImage = null;
let asciiText = "";
let asciiRows = [];

function analyzeImage(img, numCols, charSet) {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const numChars = charSet.length;
  const cellWidth = width / numCols;
  const cellHeight = 2 * cellWidth;
  const numRows = Math.max(1, Math.floor(height / cellHeight));

  const rows = [];
  for (let i = 0; i < numRows; i++) {
    const rowStart = Math.floor(i * cellHeight);
    const rowEnd = Math.min(Math.floor((i + 1) * cellHeight), height);
    const row = [];
    for (let j = 0; j < numCols; j++) {
      const colStart = Math.floor(j * cellWidth);
      const colEnd = Math.min(Math.floor((j + 1) * cellWidth), width);
      let sum = 0;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;
      for (let y = rowStart; y < rowEnd; y++) {
        for (let x = colStart; x < colEnd; x++) {
          const idx = (y * width + x) * 4;
          const a = data[idx + 3] / 255;
          const r = data[idx] * a + 255 * (1 - a);
          const g = data[idx + 1] * a + 255 * (1 - a);
          const b = data[idx + 2] * a + 255 * (1 - a);
          sum += 0.299 * r + 0.587 * g + 0.114 * b;
          rSum += r;
          gSum += g;
          bSum += b;
          count++;
        }
      }
      const mean = count > 0 ? sum / count : 0;
      const charIdx = Math.min(Math.floor((mean / 255) * numChars), numChars - 1);
      const color =
        count > 0
          ? { r: Math.round(rSum / count), g: Math.round(gSum / count), b: Math.round(bSum / count) }
          : { r: 255, g: 255, b: 255 };
      row.push({ char: charSet[charIdx], color });
    }
    rows.push(row);
  }
  return rows;
}

function rowsToText(rows) {
  return rows.map((row) => row.map((cell) => cell.char).join("")).join("\n");
}

function invertColor({ r, g, b }) {
  return { r: 255 - r, g: 255 - g, b: 255 - b };
}

function escapeHtml(ch) {
  if (ch === "&") return "&amp;";
  if (ch === "<") return "&lt;";
  if (ch === ">") return "&gt;";
  if (ch === '"') return "&quot;";
  if (ch === "'") return "&#39;";
  return ch;
}

function renderPreview(colored) {
  const theme = THEMES[themeSelect.value];
  asciiPre.style.backgroundColor = theme.background || "";
  const px = parseInt(fontSizeInput.value, 10);
  asciiPre.style.fontSize = `${px}px`;
  asciiPre.style.lineHeight = `${px * 2}px`;

  if (colored) {
    asciiPre.style.color = "";
    asciiPre.innerHTML = asciiRows
      .map((row) =>
        row
          .map((cell) => {
            const color = invertInput.checked ? invertColor(cell.color) : cell.color;
            return `<span style="color:rgb(${color.r},${color.g},${color.b})">${escapeHtml(cell.char)}</span>`;
          })
          .join("")
      )
      .join("\n");
  } else {
    asciiPre.style.color = theme.color || "";
    asciiPre.textContent = asciiText;
  }
  applyFit();
}

function applyFit() {
  if (fitInput.checked) {
    asciiWrap.style.overflow = "hidden";
    autofit();
  } else {
    asciiWrap.style.overflow = "auto";
    asciiPre.style.transform = "none";
  }
}

function autofit() {
  const natWidth = asciiPre.offsetWidth;
  const natHeight = asciiPre.offsetHeight;
  if (natWidth === 0 || natHeight === 0) return;
  const availWidth = asciiWrap.clientWidth;
  const availHeight = asciiWrap.clientHeight;
  if (availWidth === 0 || availHeight === 0) return;
  const scale = Math.min(availWidth / natWidth, availHeight / natHeight, 1);
  asciiPre.style.transform = `scale(${scale})`;
}

function compute() {
  const charSet = CHAR_SETS[modeSelect.value];
  const numCols = parseInt(numColsInput.value, 10);
  const colored = colorInput.checked;
  asciiRows = analyzeImage(sourceImage, numCols, charSet);
  asciiText = rowsToText(asciiRows);
  if (!colored && invertInput.checked) {
    asciiText = invertText(asciiText, charSet);
  }
  renderPreview(colored);
  btnDownloadTxt.disabled = false;
  btnDownloadPng.disabled = false;
}

function invertText(text, charSet) {
  const last = charSet.length - 1;
  return text
    .split("")
    .map((ch) => (ch === "\n" ? ch : charSet[last - charSet.indexOf(ch)]))
    .join("");
}

function activateImage(img) {
  sourceImage = img;
  originalImg.src = img.src;
  workspace.classList.remove("hidden");
  dropzone.classList.add("hidden");
  compute();
  requestAnimationFrame(() => {
    matchPreviewSize();
    autofit();
  });
}

function matchPreviewSize() {
  const rect = originalImg.getBoundingClientRect();
  asciiWrap.style.width = `${rect.width}px`;
  asciiWrap.style.height = `${rect.height}px`;
}

function loadImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => activateImage(img);
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function resetToUpload() {
  workspace.classList.add("hidden");
  dropzone.classList.remove("hidden");
  sourceImage = null;
  asciiText = "";
  asciiRows = [];
  originalImg.src = "";
  asciiPre.textContent = "";
  asciiWrap.style.width = "";
  asciiWrap.style.height = "";
  btnDownloadTxt.disabled = true;
  btnDownloadPng.disabled = true;
  fileInput.value = "";
}

function renderToCanvas(bg, colored) {
  const numCols = parseInt(numColsInput.value, 10);
  const cellWidth = sourceImage.naturalWidth / numCols;
  const charWidth = cellWidth * 2;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const font = `${charWidth}px "DejaVu Sans Mono", "Cascadia Mono", Consolas, Menlo, monospace`;
  ctx.font = font;
  const metrics = ctx.measureText("M");
  const actualWidth = metrics.width || charWidth;

  const lineCount = colored ? asciiRows.length : asciiText.split("\n").length;
  const outWidth = Math.ceil(actualWidth * numCols);
  const outHeight = Math.ceil(charWidth * 2 * lineCount);

  canvas.width = outWidth;
  canvas.height = outHeight;
  if (bg === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.font = font;
  ctx.textBaseline = "top";
  const textYOffset = charWidth * 0.35;
  if (colored) {
    asciiRows.forEach((row, i) => {
      row.forEach((cell, j) => {
        const color = invertInput.checked ? invertColor(cell.color) : cell.color;
        ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
        ctx.fillText(cell.char, j * actualWidth, i * charWidth * 2 + textYOffset);
      });
    });
  } else {
    ctx.fillStyle = bg === "white" ? "#000000" : "#ffffff";
    asciiText.split("\n").forEach((line, i) => {
      ctx.fillText(line, 0, i * charWidth * 2 + textYOffset);
    });
  }
  return canvas;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});
dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) loadImageFromFile(file);
});

fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) loadImageFromFile(fileInput.files[0]);
});

modeSelect.addEventListener("change", compute);
numColsInput.addEventListener("input", () => {
  numColsValue.textContent = numColsInput.value;
  compute();
});
fontSizeInput.addEventListener("input", () => {
  fontSizeValue.textContent = fontSizeInput.value;
  if (sourceImage) renderPreview(colorInput.checked);
});
themeSelect.addEventListener("change", () => {
  if (sourceImage) renderPreview(colorInput.checked);
});
invertInput.addEventListener("change", compute);
colorInput.addEventListener("change", compute);
fitInput.addEventListener("change", () => {
  if (sourceImage) applyFit();
});
window.addEventListener("resize", () => {
  if (sourceImage) {
    matchPreviewSize();
    requestAnimationFrame(applyFit);
  }
});

btnChange.addEventListener("click", resetToUpload);

btnDownloadTxt.addEventListener("click", () => {
  const blob = new Blob([asciiText], { type: "text/plain;charset=utf-8" });
  const base = (sourceImage.src.split("/").pop() || "image").split(".")[0];
  downloadBlob(blob, `${base}.txt`);
});

btnDownloadPng.addEventListener("click", () => {
  const bg = themeSelect.value === "light" ? "white" : "black";
  const canvas = renderToCanvas(bg, colorInput.checked);
  const base = (sourceImage.src.split("/").pop() || "image").split(".")[0];
  canvas.toBlob((blob) => downloadBlob(blob, `${base}-ascii.png`), "image/png");
});

const defaultImage = new Image();
defaultImage.onload = () => activateImage(defaultImage);
defaultImage.src = "demo/input.jpg";