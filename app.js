// app.js - 三首客語詩詞，整段連續朗讀評測

const poems = [
  {
    text: "想起連妹實在難，可比鯉魚上急灘；\n水清又驚人看著，水汶又怕網來攔。",
    pinyin: "xiong31 hi31 lien11 moi55 siid5 cai55 nan11 ko31 bi31 li24 ng11 song55 gib2 tan24 sui31 qin24 iu55 giang24 ngin11 kon55 do31 sui31 vun11 iu55 pa55 miong31 loi11 lan11"
  },
  {
    text: "千山鳥飛絕，萬徑人蹤滅；\n孤舟蓑笠翁，獨釣寒江雪。",
    pinyin: "qien24 san24 diau24 bi24 qied5 van55 gang55 ngin11 jiung24 mied5 ted2 gu24 son11 so24 lib2 vung24 tug5 diau55 hon11 gong24 xied2"
  },
  {
    text: "客路青山外，行舟綠水前。潮平兩岸闊，風正一帆懸。\n海日生殘夜，江春入舊年。鄉書何處達，歸雁洛陽邊。",
    pinyin: "hag2 lu55 qiang24 san24 ngoi55 hang11 son11 liug5 sui31 qien11 ceu11 piang11 liong31 ngan55 ka55 fad2 fung24 coi24 id2 fam11 diau55 hoi31 ngid2 sen24 can11 ia55 gong24 cun24 ngib5 kiu55 ngien11 hiong24 su24 ho11 cu31 tad5 gui24 ngien55 e31 log5 iong11 bien24"
  }
];

const accentId = "1"; // 四縣腔

function renderPoems() {
  const container = document.getElementById('poems-container');
  container.innerHTML = '';
  poems.forEach(poem => {
    const block = document.createElement('div');
    block.className = 'poem-block';
    block.innerHTML = `
      <div class="poem-text">${poem.text.replace(/\n/g, '<br>')}</div>
      <div class="poem-pinyin">拼音：${poem.pinyin}</div>
    `;
    container.appendChild(block);
  });
}

// 合併全部詩詞的文字與拼音，供整段送出評分
function getCombinedTextAndPinyin() {
  const combinedText = poems.map(p => p.text.replace(/\n/g, '')).join('');
  const combinedPinyin = poems.map(p => p.pinyin).join(' ');
  return { combinedText, combinedPinyin };
}

let audioContext;
let scriptProcessor;
let audioInput;
let recordedSamples = [];
let currentStream;
let recordingTimeout;

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    currentStream = stream;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioInput = audioContext.createMediaStreamSource(stream);
    scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    recordedSamples = [];

    scriptProcessor.onaudioprocess = (e) => {
      const channelData = e.inputBuffer.getChannelData(0);
      recordedSamples.push(new Float32Array(channelData));
    };

    audioInput.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    document.getElementById('btn-rec').disabled = true;
    document.getElementById('btn-stop').disabled = false;
    document.getElementById('score-badge').innerText = "錄音中...";
    document.getElementById('score-badge').className = "score-badge";

    // 一分鐘後自動停止錄音
    recordingTimeout = setTimeout(() => {
      if (!document.getElementById('btn-stop').disabled) {
        stopRecording();
      }
    }, 60000);
  } catch (err) {
    alert("無法開啟麥克風，請確認權限設定！");
  }
}

async function stopRecording() {
  clearTimeout(recordingTimeout);
  scriptProcessor.disconnect();
  audioInput.disconnect();
  currentStream.getTracks().forEach(track => track.stop());
  const inputSampleRate = audioContext.sampleRate;

  document.getElementById('btn-stop').disabled = true;
  document.getElementById('score-badge').innerText = "評分中...";

  const wavBlob = encodeWAV(recordedSamples, inputSampleRate, 16000);
  const { combinedText, combinedPinyin } = getCombinedTextAndPinyin();

  const score = await submitScore(wavBlob, combinedText, combinedPinyin);

  const badge = document.getElementById('score-badge');
  badge.innerText = `得分：${score} 分`;
  badge.className = `score-badge ${score >= 80 ? 'score-high' : 'score-low'}`;
  document.getElementById('btn-rec').disabled = false;

  document.getElementById('summary-box').style.display = 'block';
  document.getElementById('total-score').innerText = score;
}

async function submitScore(audioBlob, text, pinyin) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.wav');
  formData.append('pinyin', pinyin);
  formData.append('text', text);
  formData.append('accent_id', accentId);

  try {
    const res = await fetch('/api/assess-segment', { method: 'POST', body: formData });
    const data = await res.json();
    return data.score ?? 0;
  } catch (err) {
    console.error('評分失敗:', err);
    return 0;
  }
}

// WAV 編碼相關輔助函式（維持不變）
function encodeWAV(samplesArray, inputSampleRate, targetSampleRate) {
  let totalLength = 0;
  samplesArray.forEach(chunk => totalLength += chunk.length);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  samplesArray.forEach(chunk => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });

  const downsampled = downsampleBuffer(merged, inputSampleRate, targetSampleRate);
  const pcmData = floatTo16BitPCM(downsampled);
  return createWavBlob(pcmData, targetSampleRate);
}

function downsampleBuffer(buffer, inputSampleRate, targetSampleRate) {
  if (targetSampleRate === inputSampleRate) return buffer;
  const ratio = inputSampleRate / targetSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    result[i] = buffer[Math.floor(i * ratio)];
  }
  return result;
}

function floatTo16BitPCM(input) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

function createWavBlob(pcmData, sampleRate) {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmData.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < pcmData.length; i++, offset += 2) {
    view.setInt16(offset, pcmData[i], true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

// 初始化
renderPoems();
