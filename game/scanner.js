export function barcodeSupported() {
  return "BarcodeDetector" in window;
}

export function extractTrackId(text) {
  if (!text) return null;
  text = text.trim();
  let m = text.match(/spotify:track:([A-Za-z0-9]+)/);
  if (m) return m[1];
  m = text.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/([A-Za-z0-9]+)/);
  if (m) return m[1];
  return null;
}

export async function startCamera(videoEl, onResult, onError) {
  if (!barcodeSupported()) {
    onError?.(new Error("nosupport"));
    return () => {};
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
  } catch (e) {
    onError?.(new Error("camera"));
    return () => {};
  }

  videoEl.srcObject = stream;
  await videoEl.play();

  const detector = new BarcodeDetector({ formats: ["qr_code"] });
  let running = true;

  const stop = () => {
    running = false;
    stream.getTracks().forEach((t) => t.stop());
    videoEl.srcObject = null;
  };

  const scan = async () => {
    if (!running) return;
    try {
      const codes = await detector.detect(videoEl);
      if (codes.length > 0) {
        onResult(codes[0].rawValue);
        return;
      }
    } catch {}
    if (running) requestAnimationFrame(scan);
  };
  requestAnimationFrame(scan);

  return stop;
}
