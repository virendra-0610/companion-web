(function () {
  if (window.companionRecognizeReceipt) return;

  let workerPromise = null;

  async function getWorker() {
    if (!workerPromise) {
      workerPromise = (async function () {
        const worker = await Tesseract.createWorker(['eng', 'rus', 'lav'], 1, {
          logger: function () {},
        });
        await worker.setParameters({
          preserve_interword_spaces: '1',
          user_defined_dpi: '300',
        });
        return worker;
      })();
    }
    return workerPromise;
  }

  function loadImage(dataUrl) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  function canvasVariant(img, mode) {
    const sourceWidth = img.naturalWidth || img.width;
    const sourceHeight = img.naturalHeight || img.height;
    // Tesseract performs substantially better when small receipt text is
    // presented at a sensible DPI. Keep memory bounded for phone cameras.
    const targetWidth = Math.min(2200, Math.max(1400, sourceWidth));
    const scale = targetWidth / sourceWidth;
    const width = Math.round(sourceWidth * scale);
    const height = Math.round(sourceHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, width, height);

    const image = ctx.getImageData(0, 0, width, height);
    const data = image.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray = (0.299 * data[i]) + (0.587 * data[i + 1]) + (0.114 * data[i + 2]);
      if (mode === 'threshold') {
        const v = gray > 175 ? 255 : 0;
        data[i] = v; data[i + 1] = v; data[i + 2] = v;
      } else if (mode === 'contrast') {
        const v = Math.max(0, Math.min(255, ((gray - 128) * 1.55) + 128));
        data[i] = v; data[i + 1] = v; data[i + 2] = v;
      } else {
        data[i] = gray; data[i + 1] = gray; data[i + 2] = gray;
      }
    }
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.94);
  }

  function receiptScore(text) {
    const value = text || '';
    let score = 0;
    if (/total|amount|subtotal|tax|gst|receipt|bill|коп|итого|всего|оплат|сумма|kop|summa|apmaks/i.test(value)) score += 5;
    if (/₹|rs\.?|inr|\$|usd|€|eur|₽|rub|руб/i.test(value)) score += 5;
    if (/\d+[.,]\d{2}/.test(value)) score += 4;
    if (/\d{1,2}[./ -]\d{1,2}[./ -]\d{2,4}/.test(value)) score += 2;
    score += Math.min(5, value.split(/\n/).length / 8);
    return score;
  }

  async function recognizeVariant(worker, image, psm) {
    await worker.setParameters({
      tessedit_pageseg_mode: String(psm),
      preserve_interword_spaces: '1',
    });
    const result = await worker.recognize(image);
    return (result && result.data && result.data.text) || '';
  }

  window.companionRecognizeReceipt = async function (dataUrl) {
    const worker = await getWorker();
    const img = await loadImage(dataUrl);

    const variants = [
      { image: dataUrl, psm: 6 },
      { image: canvasVariant(img, 'gray'), psm: 6 },
      { image: canvasVariant(img, 'contrast'), psm: 6 },
      { image: canvasVariant(img, 'threshold'), psm: 11 },
    ];

    let bestText = '';
    let bestScore = -1;

    for (const variant of variants) {
      try {
        const text = await recognizeVariant(worker, variant.image, variant.psm);
        const score = receiptScore(text);
        if (score > bestScore) {
          bestScore = score;
          bestText = text;
        }
      } catch (_) {
        // Continue with another preprocessing strategy.
      }
    }

    return bestText.trim();
  };
})();
