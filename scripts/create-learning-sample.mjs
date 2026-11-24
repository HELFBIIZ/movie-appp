// Rebuild the original sample on Windows with an installed English SAPI voice.
// Nothing is downloaded; no film footage or third-party dialogue is used.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { sampleLines } from '../tests/fixtures/lesson.ts';

if (process.platform !== 'win32')
  throw new Error(
    'Sample generation needs Windows SAPI; the generated assets are already committed.',
  );
const audioDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scenechain-audio-'));
const outputDir = path.resolve('tests/fixtures');
fs.mkdirSync(outputDir, { recursive: true });
execFileSync(
  'powershell.exe',
  [
    '-NoProfile',
    '-Command',
    `
  Add-Type -AssemblyName System.Speech
  $data = [Console]::In.ReadToEnd() | ConvertFrom-Json
  $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $speaker.SelectVoice('Microsoft Zira Desktop')
  $speaker.Rate = -1
  for ($i = 0; $i -lt $data.lines.Count; $i++) {
    $speaker.SetOutputToWaveFile((Join-Path $data.dir ($i.ToString() + '.wav')))
    $speaker.Speak($data.lines[$i])
  }
  $speaker.Dispose()
`,
  ],
  { input: JSON.stringify({ dir: audioDir, lines: sampleLines.map((line) => line.en) }) },
);
const audio = sampleLines.map((_, i) =>
  fs.readFileSync(path.join(audioDir, `${i}.wav`)).toString('base64'),
);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.SCENECHAIN_CHROMIUM_PATH || undefined,
  args: ['--autoplay-policy=no-user-gesture-required'],
});
try {
  const page = await browser.newPage();
  const result = await page.evaluate(
    async ({ audio, lines }) => {
      const canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 540;
      const ctx = canvas.getContext('2d');
      const audioContext = new AudioContext();
      await audioContext.resume();
      const destination = audioContext.createMediaStreamDestination();
      const buffers = await Promise.all(
        audio.map((encoded) =>
          audioContext.decodeAudioData(
            Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)).buffer,
          ),
        ),
      );
      if (buffers.some((buffer) => buffer.duration > 5.7))
        throw new Error('Narration exceeds a scene slot');
      const stream = canvas.captureStream(15);
      destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 650000,
      });
      const chunks = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      const finished = new Promise((resolve) => {
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        };
      });
      const timings = buffers.map((buffer, index) => ({
        start: 1 + index * 6,
        end: 1 + index * 6 + buffer.duration,
      }));
      const audioStart = audioContext.currentTime;
      buffers.forEach((buffer, index) => {
        const sound = audioContext.createBufferSource();
        sound.buffer = buffer;
        sound.connect(destination);
        sound.start(audioStart + timings[index].start);
      });
      function draw() {
        const t = audioContext.currentTime - audioStart;
        const scene = Math.min(5, Math.max(0, Math.floor((t - 1) / 6)));
        const gradient = ctx.createLinearGradient(0, 0, 960, 540);
        gradient.addColorStop(0, '#111e35');
        gradient.addColorStop(1, '#050b17');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 960, 540);
        ctx.fillStyle = '#c9a227';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('VXNTA / SCENECHAIN ORIGINAL', 45, 43);
        ctx.fillStyle = '#e9e2d3';
        ctx.font = 'bold 34px Arial';
        ctx.fillText('THE LAST TRAIN', 45, 92);
        ctx.fillStyle = '#64748b';
        ctx.font = '16px Arial';
        ctx.fillText('A short story about helping someone', 45, 120);
        // Station / departure board.
        ctx.fillStyle = '#182a40';
        ctx.fillRect(45, 156, 870, 205);
        ctx.fillStyle = '#c9a227';
        ctx.fillRect(45, 348, 870, 5);
        ctx.fillStyle = '#0a1220';
        ctx.fillRect(70, 175, 250, 65);
        ctx.fillStyle = '#dfc268';
        ctx.font = 'bold 19px monospace';
        ctx.fillText('LAST TRAIN   22:10', 85, 203);
        ctx.font = '14px monospace';
        ctx.fillText('PLATFORM 02', 85, 226);
        // Train departs only once both characters have boarded.
        const shift = scene === 5 ? Math.max(0, (t - 33) * 90) : 0;
        ctx.fillStyle = '#334b69';
        ctx.fillRect(365 + shift, 195, 460, 135);
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = '#8aa5b8';
          ctx.fillRect(385 + shift + i * 80, 212, 52, 47);
        }
        ctx.fillStyle = '#c9a227';
        ctx.fillRect(365 + shift, 282, 460, 5);
        ctx.fillStyle = '#0b101c';
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(415 + shift + i * 110, 335, 14, 0, Math.PI * 2);
          ctx.fill();
        }
        // Bench, bag and the ticket revealed in scene five.
        ctx.fillStyle = '#6c5636';
        ctx.fillRect(95, 303, 190, 12);
        ctx.fillRect(105, 314, 8, 32);
        ctx.fillRect(267, 314, 8, 32);
        const bagX = scene >= 4 ? 200 : 152;
        ctx.fillStyle = '#bb8c53';
        ctx.fillRect(bagX, 267, 40, 36);
        if (scene === 4) {
          ctx.fillStyle = '#f5e7bb';
          ctx.fillRect(150, 292, 40, 10);
        }
        function person(x, color, name) {
          ctx.fillStyle = '#d2ad8a';
          ctx.beginPath();
          ctx.arc(x, 274, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = color;
          ctx.fillRect(x - 10, 288, 20, 40);
          ctx.fillStyle = '#a9b7c6';
          ctx.fillRect(x - 9, 328, 6, 20);
          ctx.fillRect(x + 3, 328, 6, 20);
          ctx.font = '14px Arial';
          ctx.fillText(name, x - 16, 374);
        }
        if (scene < 5) {
          person(scene > 1 ? 320 : 350, '#dfb951', 'Mira');
          person(275, '#6e9cb8', 'Leo');
        }
        ctx.fillStyle = '#0c1525';
        ctx.fillRect(45, 405, 870, 90);
        ctx.fillStyle = '#e9e2d3';
        ctx.font = '24px Arial';
        const speaking = timings.findIndex((cue) => t >= cue.start && t < cue.end);
        ctx.fillText(
          speaking >= 0
            ? lines[speaking].en
            : scene === 5
              ? 'A small act of kindness. A journey together.'
              : 'Watch what happens next.',
          65,
          454,
        );
        ctx.fillStyle = '#66788f';
        ctx.font = '13px Arial';
        ctx.fillText('ORIGINAL ANIMATION · SYNTHETIC NARRATION · LEARNING SAMPLE', 45, 520);
      }
      draw();
      recorder.start();
      const timer = setInterval(draw, 1000 / 15);
      setTimeout(() => {
        clearInterval(timer);
        recorder.stop();
      }, 38000);
      const video = await finished;
      await audioContext.close();
      return { video, timings };
    },
    { audio, lines: sampleLines },
  );
  const rawVideo = path.join(audioDir, 'recording.webm');
  fs.writeFileSync(rawVideo, Buffer.from(result.video, 'base64'));
  const browserCache = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
  const ffmpegFolder = fs.readdirSync(browserCache).find((name) => name.startsWith('ffmpeg-'));
  const ffmpeg =
    process.env.SCENECHAIN_FFMPEG_PATH || path.join(browserCache, ffmpegFolder, 'ffmpeg-win64.exe');
  // Remux the MediaRecorder stream to include duration and seek metadata.
  execFileSync(
    ffmpeg,
    ['-y', '-i', rawVideo, '-c', 'copy', path.join(outputDir, 'last-train.webm')],
    { stdio: 'pipe' },
  );
  const stamp = (seconds) => {
    const ms = Math.round(seconds * 1000);
    return `00:${Math.floor(ms / 60000)
      .toString()
      .padStart(2, '0')}:${Math.floor((ms / 1000) % 60)
      .toString()
      .padStart(2, '0')}.${(ms % 1000).toString().padStart(3, '0')}`;
  };
  for (const language of ['en', 'mn']) {
    const vtt =
      'WEBVTT\n\n' +
      sampleLines
        .map(
          (line, index) =>
            `${index + 1}\n${stamp(result.timings[index].start)} --> ${stamp(result.timings[index].end)}\n${line[language]}\n`,
        )
        .join('\n');
    fs.writeFileSync(path.join(outputDir, `last-train.${language}.vtt`), vtt);
  }
  fs.writeFileSync(
    path.join(outputDir, 'timings.json'),
    JSON.stringify(
      { duration: 38, narration: 'Microsoft Zira Desktop synthetic speech', cues: result.timings },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `Created original sample: ${fs.statSync(path.join(outputDir, 'last-train.webm')).size} bytes, ${result.timings.length} narrated cues.`,
  );
} finally {
  await browser.close();
}
