(function () {
  if (window.companionRecognizeReceipt) return;

  let workerPromise = null;

  async function getWorker() {
    if (!workerPromise) {
      workerPromise = Tesseract.createWorker(['eng', 'rus', 'lav'], 1, {
        logger: function () {},
      });
    }
    return workerPromise;
  }

  window.companionRecognizeReceipt = async function (dataUrl) {
    const worker = await getWorker();
    const result = await worker.recognize(dataUrl);
    return (result && result.data && result.data.text) || '';
  };
})();
