/* Thu ảnh và âm thanh thật cho hội thoại Ticket trong prototype. */
(() => {
  'use strict';

  const maxBytes = 1024 * 1024;
  const imageType = /^image\/(jpeg|png|webp|gif|avif)$/i;
  const stopTracks = (stream) => stream?.getTracks().forEach((track) => track.stop());
  const readData = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

  function encodePhoto(source, width, height) {
    const scale = Math.min(1, 960 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  async function readPhoto(file) {
    if (!imageType.test(file.type) || !file.size || file.size > 12 * maxBytes || (file.type === 'image/gif' && file.size > maxBytes)) {
      throw new Error('Chọn ảnh JPEG, PNG, WebP hoặc AVIF tối đa 12 MB. GIF tối đa 1 MB.');
    }
    if (file.size <= maxBytes) return { imageUrl: await readData(file), imageName: file.name };
    // Thu nhỏ ảnh từ camera điện thoại trước khi lưu chung vào bộ nhớ trình duyệt.
    const bitmap = await createImageBitmap(file);
    try {
      return { imageUrl: encodePhoto(bitmap, bitmap.width, bitmap.height), imageName: file.name.replace(/\.[^.]+$/, '') + '.jpg' };
    } finally {
      bitmap.close();
    }
  }

  async function capturePhoto(signal) {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera cần HTTPS hoặc localhost.');
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    const video = document.createElement('video');
    const stop = () => stopTracks(stream);
    signal.addEventListener('abort', stop, { once: true });
    try {
      signal.throwIfAborted();
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      const frame = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Camera chưa có hình.')), 5000);
        const ready = () => { clearTimeout(timer); resolve(); };
        video.addEventListener('loadeddata', ready, { once: true });
        signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
        video.play().catch((error) => { clearTimeout(timer); reject(error); });
      });
      await frame;
      signal.throwIfAborted();
      if (!video.videoWidth || !video.videoHeight) throw new Error('Camera chưa có hình.');
      return { imageUrl: encodePhoto(video, video.videoWidth, video.videoHeight), imageName: 'anh-khan-cap.jpg' };
    } finally {
      signal.removeEventListener('abort', stop);
      video.srcObject = null;
      stop();
    }
  }

  async function recordVoice(signal, onResult, onError) {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Trình duyệt không hỗ trợ ghi âm ở trang này.');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    let recorder;
    let timer;
    const cancel = () => { clearTimeout(timer); stopTracks(stream); };
    try {
      signal.throwIfAborted();
      recorder = new MediaRecorder(stream, { audioBitsPerSecond: 48000 });
      const chunks = [];
      const started = performance.now();
      recorder.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
      recorder.onerror = () => {
        cancel();
        if (!signal.aborted) onError(new Error('Không ghi được âm thanh.'));
      };
      recorder.onstop = async () => {
        cancel();
        signal.removeEventListener('abort', cancel);
        if (signal.aborted) return;
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          if (!blob.size || blob.size > maxBytes) throw new Error('Ghi âm bị rỗng hoặc vượt quá 1 MB.');
          const elapsed = Math.max(1, Math.round((performance.now() - started) / 1000));
          const audioUrl = await readData(blob);
          if (!signal.aborted) onResult(audioUrl, `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`);
        } catch (error) {
          if (!signal.aborted) onError(error);
        }
      };
      const stop = () => { if (recorder.state !== 'inactive') recorder.stop(); };
      signal.addEventListener('abort', cancel, { once: true });
      recorder.start();
      timer = setTimeout(stop, 60000);
      return stop;
    } catch (error) {
      cancel();
      throw error;
    }
  }

  window.FleetTicketMedia = { readPhoto, capturePhoto, recordVoice };
})();
