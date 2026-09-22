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
const themeSelect = document.getElementById("theme");
const btnDownloadTxt = document.getElementById("btn-download-txt");
const btnDownloadPng = document.getElementById("btn-download-png");
const btnChange = document.getElementById("btn-change");
const asciiWrap = document.getElementById("ascii-wrap");

let sourceImage = null;
let asciiText = "";

function asciiFromImage(img, numCols, charSet) {
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

  const lines = [];
  for (let i = 0; i < numRows; i++) {
    const rowStart = Math.floor(i * cellHeight);
    const rowEnd = Math.min(Math.floor((i + 1) * cellHeight), height);
    let line = "";
    for (let j = 0; j < numCols; j++) {
      const colStart = Math.floor(j * cellWidth);
      const colEnd = Math.min(Math.floor((j + 1) * cellWidth), width);
      let sum = 0;
      let count = 0;
      for (let y = rowStart; y < rowEnd; y++) {
        for (let x = colStart; x < colEnd; x++) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          const alpha = a / 255;
          sum += (0.299 * r + 0.587 * g + 0.114 * b) * alpha + 255 * (1 - alpha);
          count++;
        }
      }
      const mean = count > 0 ? sum / count : 0;
      const charIdx = Math.min(Math.floor((mean / 255) * numChars), numChars - 1);
      line += charSet[charIdx];
    }
    lines.push(line);
  }
  return lines.join("\n");
}

function renderPreview() {
  const theme = THEMES[themeSelect.value];
  asciiPre.style.color = theme.color || "";
  asciiPre.style.backgroundColor = theme.background || "";
  const px = parseInt(fontSizeInput.value, 10);
  asciiPre.style.fontSize = `${px}px`;
  asciiPre.style.lineHeight = `${px * 2}px`;
  asciiPre.textContent = asciiText;
}

function compute() {
  const charSet = CHAR_SETS[modeSelect.value];
  const numCols = parseInt(numColsInput.value, 10);
  asciiText = asciiFromImage(sourceImage, numCols, charSet);
  if (invertInput.checked) {
    asciiText = invertText(asciiText, charSet);
  }
  renderPreview();
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
  matchPreviewSize();
  compute();
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
  originalImg.src = "";
  asciiPre.textContent = "";
  asciiWrap.style.width = "";
  asciiWrap.style.height = "";
  btnDownloadTxt.disabled = true;
  btnDownloadPng.disabled = true;
  fileInput.value = "";
}

function renderToCanvas(bg) {
  const numCols = parseInt(numColsInput.value, 10);
  const text = asciiText;
  const cellWidth = sourceImage.naturalWidth / numCols;
  const charWidth = cellWidth * 2;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const font = `${charWidth}px "DejaVu Sans Mono", "Cascadia Mono", Consolas, Menlo, monospace`;
  ctx.font = font;
  const metrics = ctx.measureText("M");
  const actualWidth = metrics.width || charWidth;

  const lines = text.split("\n");
  const outWidth = Math.ceil(actualWidth * numCols);
  const outHeight = Math.ceil(charWidth * 2 * lines.length);

  canvas.width = outWidth;
  canvas.height = outHeight;
  if (bg === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.font = font;
  ctx.fillStyle = bg === "white" ? "#000000" : "#ffffff";
  ctx.textBaseline = "top";
  lines.forEach((line, i) => {
    ctx.fillText(line, 0, i * charWidth * 2 + charWidth * 0.35);
  });
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
  if (sourceImage) renderPreview();
});
themeSelect.addEventListener("change", () => {
  if (sourceImage) renderPreview();
});
invertInput.addEventListener("change", compute);
window.addEventListener("resize", () => {
  if (sourceImage) matchPreviewSize();
});

btnChange.addEventListener("click", resetToUpload);

btnDownloadTxt.addEventListener("click", () => {
  const blob = new Blob([asciiText], { type: "text/plain;charset=utf-8" });
  const base = (sourceImage.src.split("/").pop() || "image").split(".")[0];
  downloadBlob(blob, `${base}.txt`);
});

btnDownloadPng.addEventListener("click", () => {
  const bg = themeSelect.value === "light" ? "white" : "black";
  const canvas = renderToCanvas(bg);
  const base = (sourceImage.src.split("/").pop() || "image").split(".")[0];
  canvas.toBlob((blob) => downloadBlob(blob, `${base}-ascii.png`), "image/png");
});

const defaultImage = new Image();
defaultImage.onload = () => activateImage(defaultImage);
defaultImage.src = "demo/input.jpg";