import WebSocket from 'ws';
import { config } from '../config';

type TranscriptCallback = (text: string, isFinal: boolean) => void;

export class DeepgramClient {
  private ws: WebSocket | null = null;
  private callback: TranscriptCallback;
  private reconnecting = false;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private static readonly MAX_RECONNECT_ATTEMPTS = 5;

  constructor(callback: TranscriptCallback) {
    this.callback = callback;
  }

  connect(): void {
    const params = new URLSearchParams({
      model: config.deepgram.model,
      sample_rate: config.deepgram.sampleRate.toString(),
      channels: config.deepgram.channels.toString(),
      encoding: config.deepgram.encoding,
      interim_results: config.deepgram.interimResults.toString(),
      utterance_end_ms: config.deepgram.utteranceEndMs.toString(),
      vad_events: config.deepgram.vadEvents.toString(),
      punctuate: config.deepgram.punctuate.toString(),
      smart_format: config.deepgram.smartFormat.toString(),
    });

    const url = `wss://api.deepgram.com/v1/listen?${params}`;

    this.ws = new WebSocket(url, {
      headers: {
        Authorization: `Token ${config.deepgramApiKey}`,
      },
    });

    this.ws.on('open', () => {
      console.log('Deepgram connection opened');
      this.reconnectAttempts = 0;
      this.startKeepAlive();
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const response = JSON.parse(data.toString());

        if (response.type === 'Results') {
          const transcript = response.channel?.alternatives?.[0]?.transcript;
          if (transcript) {
            const isFinal = response.is_final === true;
            this.callback(transcript, isFinal);
          }
        }
      } catch (err) {
        console.error('Error parsing Deepgram response:', err);
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`Deepgram connection closed: ${code} ${reason}`);
      this.stopKeepAlive();
      if (!this.reconnecting) {
        this.reconnect();
      }
    });

    this.ws.on('error', (err) => {
      console.error('Deepgram WebSocket error:', err.message);
    });
  }

  sendAudio(pcmData: Buffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(pcmData);
    }
  }

  disconnect(): void {
    this.reconnecting = true;
    this.stopKeepAlive();
    if (this.ws) {
      // Send close signal to Deepgram
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'CloseStream' }));
      }
      this.ws.close();
      this.ws = null;
    }
  }

  private reconnect(): void {
    this.reconnectAttempts++;
    if (this.reconnectAttempts > DeepgramClient.MAX_RECONNECT_ATTEMPTS) {
      console.error(`Deepgram reconnect failed after ${DeepgramClient.MAX_RECONNECT_ATTEMPTS} attempts, giving up`);
      return;
    }

    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts - 1), 16000);
    this.reconnecting = true;
    console.log(`Reconnecting to Deepgram in ${delay}ms (attempt ${this.reconnectAttempts}/${DeepgramClient.MAX_RECONNECT_ATTEMPTS})...`);
    setTimeout(() => {
      this.reconnecting = false;
      this.connect();
    }, delay);
  }

  private startKeepAlive(): void {
    this.keepAliveInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'KeepAlive' }));
      }
    }, 10000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }
}
