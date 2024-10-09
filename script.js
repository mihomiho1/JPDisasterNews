let isEEWPlaying = false;
let isTyphoonInfoVisible = false;
let lastTyphoonUpdate = 0;

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

async function fetchAndUpdateData() {
  try {
    // 最新の地震情報を取得
    await Promise.all([
      fetchEarthquakeData(),
      fetchSeismicIntensityData(),
      fetchHypocenterData(),
      fetchEarthquakeInfo(),
      fetchNewsData(),
    ]);

    // 台風情報を1分ごとにチェック
    const now = Date.now();
    if (now - lastTyphoonUpdate > 60000) {
      await fetchTyphoonData();
      lastTyphoonUpdate = now;
    }
  } catch (error) {
    console.error('データ更新エラー:', error);
  }
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
    const intensity = body.Intensity || {};
    const observation = intensity.Observation || {};
    const maxIntensity = observation.MaxInt || '不明';
    const tsunamiComment = body.Comments?.Observation || '情報なし'; //コメント

    // 震度分布のデータを取得
    let intensityDistribution = '';
    const prefs = observation.Pref || [];
    prefs.forEach((prefecture) => {
      const areas = prefecture.Area || [];
      areas.forEach((area) => {
        intensityDistribution += `<p>${prefecture.Name} - ${area.Name}: 震度 ${area.MaxInt}</p>`;
      });
    });

    document.getElementById('earthquake-data').innerHTML = `
        <div>
            <h3>${head.Title || '地震情報'}</h3>
            <p>${head.Headline || '情報がありません'}</p>
            <p>最大震度: ${maxIntensity}</p>
            <p>マグニチュード: ${earthquake.Magnitude || '不明'}</p>
            <p>震源: ${hypocenter.Name || '不明'}</p>
            <p>深さ: ${hypocenter.Depth ? hypocenter.Depth + ' km' : '不明'}</p>
            <p>${tsunamiComment}</p> <!-- 津波コメント -->
            <h4>各地の震度</h4>
            ${intensityDistribution} <!-- 各地の震度 -->
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

document.addEventListener('DOMContentLoaded', function () {
  // 地震情報を表示する部分
  const earthquakeContainer = document.getElementById('earthquake-info');

  earthquakeContainer.innerHTML = `
    <h1>${earthquakeData.time}に発生した地震</h1>
    <p>震源: ${earthquakeData.epicenter}</p>
    <p>震源の深さ: ${earthquakeData.depth}</p>
    <p>マグニチュード: ${earthquakeData.magnitude}</p>
    <p>最大震度: ${earthquakeData.intensity}</p>
    <h2>震度マップ(概況)</h2>
    <img src="${earthquakeData.detail}" alt="震度マップ 概況">
    <h2>震度マップ(拡大)</h2>
    <img src="${earthquakeData.local}" alt="震度マップ 拡大">
    <h2>震度マップ(広域)</h2>
    <img src="${earthquakeData.global}" alt="震度マップ 広域">
  `;
});

function fetchEarthquakeData() {
  return fetch('https://api.wolfx.jp/jma_eew.json')
    .then((response) => response.json())
    .then((data) => {
      const eewElement = document.getElementById('eew-data');
      let content = '';
      if (data.isCancel) {
        content = '緊急地震速報はキャンセルされました。';
        isEEWPlaying = false;
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
  return fetch(
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
    })
    .catch((error) => {
      console.error('震度速報データ取得エラー:', error);
    });
}

function fetchHypocenterData() {
  return fetch(
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
  return fetch('https://www3.nhk.or.jp/sokuho/news/sokuho_news.xml')
    .then((response) => response.text())
    .then((xmlText) => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const reports = xmlDoc.getElementsByTagName('report');
      const newsElement = document.getElementById('news-data');
      newsElement.innerHTML = '';

      Array.from(reports).forEach((report) => {
        const title = report.getElementsByTagName('title')[0].textContent;
        const area = report.getElementsByTagName('area')[0].textContent;
        const magnitude = report.getElementsByTagName('magnitude')[0].textContent;
        const intensity = report.getElementsByTagName('intensity')[0].textContent;
        newsElement.innerHTML += `
                    <div>
                        <h3>${title}</h3>
                        <p>${area} - マグニチュード: ${magnitude}, 震度: ${intensity}</p>
                    </div>`;
      });
    })
    .catch((error) => {
      console.error('ニュースデータ取得エラー:', error);
    });
}

function fetchTyphoonData() {
  return fetch('https://api.wolfx.jp/typhoon/json')
    .then((response) => response.json())
    .then((data) => {
      const typhoonElement = document.getElementById('typhoon-data');
      let content = '';
      if (data.length > 0) {
        content = '<ul>';
        data.forEach((typhoon) => {
          content += `<li>${typhoon.typhoonName} - ${typhoon.typhoonInfo}</li>`;
        });
        content += '</ul>';
        isTyphoonInfoVisible = true;
      } else {
        content = '現在台風の情報はありません。';
        isTyphoonInfoVisible = false;
      }
      typhoonElement.innerHTML = content;
    })
    .catch((error) => {
      console.error('台風データ取得エラー:', error);
    });
}

// 初回データ取得とその後の定期的な更新
fetchAndUpdateData();
setInterval(fetchAndUpdateData, 30000);
