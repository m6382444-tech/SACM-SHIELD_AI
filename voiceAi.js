/**
 * Voice AI Narrator & Audio Engine
 * Provides Multilingual Text-to-Speech (TTS), Audio Equalizer Visualizer,
 * Web Audio Alarm Chimes, and Speech-to-Text (STT) voice input.
 */

class VoiceAiEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.currentLanguage = 'en';
    this.isMuted = false;
    this.isAutoNarrateEnabled = true;
    this.isSpeaking = false;
    this.audioContext = null;
    this.animFrameId = null;
    this.canvas = null;
    this.canvasCtx = null;

    this.initVoices();
    if (this.synth && this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.initVoices();
    }
  }

  initVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  setLanguage(langCode) {
    this.currentLanguage = langCode || 'en';
  }

  setCanvas(canvasElement) {
    this.canvas = canvasElement;
    if (this.canvas) {
      this.canvasCtx = this.canvas.getContext('2d');
    }
  }

  /**
   * Finds the best voice for the given language
   */
  getBestVoice(langCode) {
    if (!this.voices || this.voices.length === 0) {
      this.initVoices();
    }

    const langPrefixMap = {
      en: ['en-US', 'en-GB', 'en-IN', 'en'],
      hi: ['hi-IN', 'hi'],
      es: ['es-ES', 'es-MX', 'es'],
      fr: ['fr-FR', 'fr'],
      ar: ['ar-SA', 'ar-EG', 'ar'],
      de: ['de-DE', 'de']
    };

    const targetPrefixes = langPrefixMap[langCode] || ['en'];

    for (const prefix of targetPrefixes) {
      const match = this.voices.find(v => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith(prefix.toLowerCase()));
      if (match) return match;
    }

    return this.voices[0] || null;
  }

  /**
   * Plays a synthesized alert sound using Web Audio API
   * @param {string} type - 'scam' or 'safe'
   */
  playChime(type = 'scam') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;

      if (type === 'scam') {
        // Urgent 2-tone dissonant alert chime
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'square';

        osc1.frequency.setValueAtTime(440, now);
        osc1.frequency.setValueAtTime(370, now + 0.12);
        osc1.frequency.setValueAtTime(330, now + 0.24);

        osc2.frequency.setValueAtTime(880, now);
        osc2.frequency.setValueAtTime(740, now + 0.12);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioContext.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.45);
        osc2.stop(now + 0.45);
      } else {
        // Smooth positive major triad chime
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        freqs.forEach((freq, idx) => {
          const osc = this.audioContext.createOscillator();
          const gain = this.audioContext.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + (idx * 0.08));

          gain.gain.setValueAtTime(0.15, now + (idx * 0.08));
          gain.gain.exponentialRampToValueAtTime(0.001, now + (idx * 0.08) + 0.35);

          osc.connect(gain);
          gain.connect(this.audioContext.destination);

          osc.start(now + (idx * 0.08));
          osc.stop(now + (idx * 0.08) + 0.35);
        });
      }
    } catch (e) {
      console.warn('Audio chime playback error:', e);
    }
  }

  /**
   * Narrates text out loud using Text-To-Speech
   */
  speak(text, onStart, onEnd) {
    if (!this.synth || this.isMuted || !text) return;

    this.stop(); // Stop any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.getBestVoice(this.currentLanguage);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = this.currentLanguage;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.startVisualizer();
      if (typeof onStart === 'function') onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.stopVisualizer();
      if (typeof onEnd === 'function') onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('Speech error:', e);
      this.isSpeaking = false;
      this.stopVisualizer();
      if (typeof onEnd === 'function') onEnd();
    };

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
    this.isSpeaking = false;
    this.stopVisualizer();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stop();
    }
    return this.isMuted;
  }

  toggleAutoNarrate() {
    this.isAutoNarrateEnabled = !this.isAutoNarrateEnabled;
    return this.isAutoNarrateEnabled;
  }

  /**
   * Audio wave visualizer animation on canvas
   */
  startVisualizer() {
    if (!this.canvas || !this.canvasCtx) return;
    const ctx = this.canvasCtx;
    const canvas = this.canvas;
    let step = 0;

    const render = () => {
      if (!this.isSpeaking) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 18;
      const barWidth = 4;
      const spacing = 3;
      const totalWidth = bars * (barWidth + spacing);
      const startX = (canvas.width - totalWidth) / 2;

      for (let i = 0; i < bars; i++) {
        const height = Math.abs(Math.sin(step + i * 0.45)) * (canvas.height * 0.8) + 4;
        const x = startX + i * (barWidth + spacing);
        const y = (canvas.height - height) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + height);
        gradient.addColorStop(0, '#00f2fe');
        gradient.addColorStop(1, '#4facfe');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, barWidth, height, 2) : ctx.rect(x, y, barWidth, height);
        ctx.fill();
      }

      step += 0.18;
      this.animFrameId = requestAnimationFrame(render);
    };

    render();
  }

  stopVisualizer() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.canvas && this.canvasCtx) {
      this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Speech-to-Text helper for voice input
   */
  startVoiceInput(onResult, onStatusChange) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported on this browser. Please use Chrome, Edge, or Safari.');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    const langMap = {
      en: 'en-US',
      hi: 'hi-IN',
      es: 'es-ES',
      fr: 'fr-FR',
      ar: 'ar-SA',
      de: 'de-DE'
    };
    recognition.lang = langMap[this.currentLanguage] || 'en-US';

    recognition.onstart = () => {
      if (onStatusChange) onStatusChange('LISTENING');
    };

    recognition.onresult = (event) => {
      if (event.results && event.results[0] && event.results[0][0]) {
        const transcript = event.results[0][0].transcript;
        if (onResult) onResult(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (onStatusChange) onStatusChange('ERROR');
    };

    recognition.onend = () => {
      if (onStatusChange) onStatusChange('IDLE');
    };

    recognition.start();
    return recognition;
  }
}

window.VoiceAiEngine = VoiceAiEngine;
