let isSeismicAudioPlaying = false; // 音声再生中フラグ
let isEEWPlaying = false;

function playAudio(file, isPlayingFlag, callback) {
  if (!isPlayingFlag) {
    const audio = new Audio(file);
    audio
      .play()
      .then(() => {
        if (callback) callback();
        audio.addEventListener('ended', () => {
          isPlayingFlag = false;
        });
      })
      .catch((error) => {
        console.error(`${file}の音声再生エラー:`, error);
        alert('音声再生の許可が必要です。再度試してください。');
      });
  }
}

document.addEventListener('click', () => {
  playAudio('music/test.mp3', isSeismicAudioPlaying, () => {
    isSeismicAudioPlaying = true;
  });
  playAudio('music/test.mp3', isEEWPlaying, () => {
    isEEWPlaying = true;
  });
});
