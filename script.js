let isEEWPlaying = false;

function updateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  document.getElementById('current-time').textContent = timeString;
}

// 1秒ごとに時刻を更新
setInterval(updateTime, 1000);

function fetchEarthquakeData() {
  fetch('https://api.wolfx.jp/jma_eew.json')
    .then((response) => response.json())
    .then((data) => {
      const eewElement = document.getElementById('eew-data');
      let content = '';
      if (data.isCancel) {
        content = '緊急地震速報はキャンセルされました。';
        isEEWPlaying = false; // キャンセルの場合は音声再生フラグをリセット
      } else {
        const status = data.isWarn ? '緊急地震速報警報' : '緊急地震速報予報';
        let title = `第${data.Serial}報`;
        if (data.isFinal) {
          title = '最終報';
        }
        content = `
                    <div class="${data.isWarn ? 'warn' : 'forecast'}">
                        ${status} ${title}<br>
                        予測最大震度: ${data.MaxIntensity || '不明'}<br>
                        マグニチュード: ${data.Magunitude || '不明'}<br>
                        深さ: ${data.Depth || '不明'}<br>
                        震源: ${data.Hypocenter || '不明'}<br>
                    </div>`;
      }
      eewElement.innerHTML = content;
    })
    .catch((error) => {
      console.error('データ取得エラー:', error);
    });
}

function fetchSeismicIntensityData() {
  fetch(
    'https://dev.narikakun.net/webapi/earthquake/last/%E9%9C%87%E5%BA%A6%E9%80%9F%E5%A0%B1.json',
  )
    .then((response) => response.json())
    .then((data) => {
      const seismicElement = document.getElementById('seismic-data');
      const infoKind = data.Head.InfoKind;
      const headline = data.Head.Headline;
      let content = `<h3>${infoKind}</h3><p>${headline}</p>`;
      data.Body.Intensity.Observation.Pref.forEach((prefecture) => {
        prefecture.Area.forEach((area) => {
          content += `<p>${area.Name}, 最大震度: ${area.MaxInt}</p>`;
        });
      });
      seismicElement.innerHTML = content;

      // 音声再生処理
      playAudio('music/sindsokuhou.mp3', isSeismicAudioPlaying, () => {
        isSeismicAudioPlaying = true;
      });
    })
    .catch((error) => {
      console.error('震度速報データ取得エラー:', error);
    });
}

function fetchHypocenterData() {
  fetch(
    'https://dev.narikakun.net/webapi/earthquake/last/%E9%9C%87%E6%BA%90%E3%81%AB%E9%96%A2%E3%81%99%E3%82%8B%E6%83%85%E5%A0%B1.json',
  )
    .then((response) => response.json())
    .then((data) => {
      const head = data.Head;
      const body = data.Body;
      const title = head.Title || '震源に関する情報';
      const headline = head.Headline || '情報がありません';
      const depth =
        body.Earthquake && body.Earthquake.Hypocenter ? body.Earthquake.Hypocenter.Depth : '不明';
      const magnitudeDescription = body.Earthquake ? body.Earthquake.Magnitude_description : '不明';
      const observation =
        body.Comments && body.Comments.Observation
          ? body.Comments.Observation
          : 'コメントはありません';
      const hypocenterElement = document.getElementById('hypocenter-data');
      hypocenterElement.innerHTML = `
                  <div>
                      <h3>${title}</h3>
                      <p>${headline}</p>
                      <p>震源の深さ: ${depth} km</p>
                      <p>マグニチュード: ${magnitudeDescription}</p>
                      <p>${observation}</p>
                  </div>`;
    })
    .catch((error) => {
      console.error('震源データ取得エラー:', error);
      const hypocenterElement = document.getElementById('hypocenter-data');
      hypocenterElement.innerHTML = `
                  <div>
                      <h3>震源に関する情報</h3>
                      <p>データを取得中にエラーが発生しました。</p>
                  </div>`;
    });
}

function fetchNewsData() {
  fetch('https://www3.nhk.or.jp/sokuho/news/sokuho_news.xml') // ニュースデータのAPIエンドポイントに置き換えてください
    .then((response) => response.text()) // XMLをテキストとして取得
    .then((xmlText) => {
      // XMLをパースするためのコード
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const newsItems = xmlDoc.getElementsByTagName('item');
      const newsElement = document.getElementById('news-data');

      if (newsItems.length > 0) {
        let content = '<h3>ニュース速報</h3>';
        Array.from(newsItems).forEach((item) => {
          const title = item.getElementsByTagName('title')[0].textContent;
          const description = item.getElementsByTagName('description')[0].textContent;
          content += `<p>${title}: ${description}</p>`;
        });
        newsElement.innerHTML = content;
      } else {
        newsElement.innerHTML = '<h3>ニュース速報</h3><p>現在ニュース速報を受信していません。</p>';
      }
    })
    .catch((error) => {
      console.error('ニュースデータ取得エラー:', error);
      const newsElement = document.getElementById('news-data');
      newsElement.innerHTML =
        '<h3>ニュース速報</h3><p>ニュースデータを取得中にエラーが発生しました。</p>';
    });
}

async function fetchEarthquakeInfo() {
  try {
    const response = await fetch('https://dev.narikakun.net/webapi/earthquake/post_data.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const head = data.Head || {};
    const body = data.Body || {};
    const earthquake = body.Earthquake || {};
    const hypocenter = earthquake.Hypocenter || {};

    document.getElementById('earthquake-data').innerHTML = `
        <div>
            <h3>${head.Title || '地震情報'}</h3>
            <p>${head.Headline || '情報がありません'}</p>
            <p>震源: ${hypocenter.Name || '不明'}</p>
            <p>深さ: ${hypocenter.Depth || '不明'}</p>
            <p>マグニチュード: ${earthquake.Magnitude || '不明'}</p>
        </div>`;
  } catch (error) {
    console.error('地震情報取得エラー:', error);
    document.getElementById('earthquake-data').innerHTML = `
        <div>
            <h3>地震情報</h3>
            <p>データを取得中にエラーが発生しました。</p>
        </div>`;
  }
}

function init() {
  updateTime();
  fetchEarthquakeData();
  fetchSeismicIntensityData();
  fetchHypocenterData();
  fetchEarthquakeInfo();
  fetchNewsData();
}

document.addEventListener('DOMContentLoaded', init);
