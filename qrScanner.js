/**
 * QR Code Scanner & Image Decoder
 * Handles local camera feed and image file upload using jsQR
 */

class QrScannerManager {
  constructor(videoElement, canvasElement, onDecoded) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    this.onDecoded = onDecoded;
    this.stream = null;
    this.scanning = false;
    this.animationId = null;
  }

  /**
   * Decodes a QR code from an uploaded image file
   */
  decodeImageFile(file, callback) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let code = null;

        if (typeof jsQR !== 'undefined') {
          code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });
        }

        if (code && code.data) {
          callback(null, code.data);
        } else {
          // Try with inversion
          if (typeof jsQR !== 'undefined') {
            code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth'
            });
          }
          if (code && code.data) {
            callback(null, code.data);
          } else {
            callback(new Error('No QR code detected in this image. Please ensure the QR is clear and well lit.'));
          }
        }
      };
      img.onerror = () => callback(new Error('Failed to load image file'));
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Starts live camera QR scanning
   */
  async startCamera(onStatus) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Camera access is not supported in this browser.');
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      this.video.srcObject = this.stream;
      this.video.setAttribute('playsinline', true);
      await this.video.play();
      this.scanning = true;
      if (onStatus) onStatus('SCANNING');

      this.tick();
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      if (onStatus) onStatus('ERROR', err.message);
    }
  }

  tick() {
    if (!this.scanning) return;

    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      this.canvas.height = this.video.videoHeight;
      this.canvas.width = this.video.videoWidth;
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      if (typeof jsQR !== 'undefined') {
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          this.stopCamera();
          if (this.onDecoded) {
            this.onDecoded(code.data);
          }
          return;
        }
      }
    }

    this.animationId = requestAnimationFrame(() => this.tick());
  }

  stopCamera() {
    this.scanning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }
}

window.QrScannerManager = QrScannerManager;
