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
      fetchNewsData()
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
  return fetch('https://dev.narikakun.net/webapi/earthquake/last/%E9%9C%87%E5%BA%A6%E9%80%9F%E5%A0%B1.json')
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
  return fetch('https://dev.narikakun.net/webapi/earthquake/last/%E9%9C%87%E6%BA%90%E3%81%AB%E9%96%A2%E3%81%99%E3%82%8B%E6%83%85%E5%A0%B1.json')
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
  return fetch('https://www3.nhk.or.jp/sokuho/news/sokuho_news.xml') // ニュースデータのAPIエンドポイントに置き換えてください
    .then((response) => response.text())
    .then((xmlText) => {
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

async function fetchTyphoonData() {
  try {
    const response = await fetch('https://www.nhk.or.jp/weather-data/v1/wx/typhoon_web/?akey=18cce8ec1fb2982a4e11dd6b1b3efa36');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const responseData = await response.json();
    const typhoonTabsElement = document.getElementById('typhoon-tabs');
    const typhoonInfoElement = document.getElementById('typhoon-info');
    let tabsContent = '';
    let typhoonContent = '';

    if (responseData.data && Array.isArray(responseData.data) && responseData.data.length > 0) {
      responseData.data.forEach((typhoon, index) => {
        tabsContent += `<button class="${index === 0 ? 'active' : ''}" onclick="showTyphoonInfo(${index})">${typhoon.title}</button>`;
        typhoonContent += generateTyphoonContent(typhoon, index === 0);
      });
    } else {
      typhoonInfoElement.innerHTML = '<p>台風情報はありません。</p>';
    }

    typhoonTabsElement.innerHTML = tabsContent;
    typhoonInfoElement.innerHTML = typhoonContent;
  } catch (error) {
    console.error('台風データ取得エラー:', error);
    const typhoonInfoElement = document.getElementById('typhoon-info');
    typhoonInfoElement.innerHTML = `
      <p>データを取得中にエラーが発生しました。</p>
      <p>詳細は<a href="https://www.nhk.or.jp/kishou-saigai/typhoon/" target="_blank" rel="noopener">NHK気象災害サイト</a>よりご覧ください。</p>
    `;
  }
}

function generateTyphoonContent(typhoon, isActive) {
  return `
    <div class="typhoon-info" style="display: ${isActive ? 'block' : 'none'};">
      <p>中心気圧: ${typhoon.center_press || '不明'} ${typhoon.center_press_unit || ''}</p>
      <p>最大瞬間風速: ${typhoon.max_inst_wind || '不明'} ${typhoon.max_inst_wind_unit || ''}</p>
      <p>最大風速: ${typhoon.max_wind || '不明'} ${typhoon.max_wind_unit || ''}</p>
      <p>位置: ${typhoon.existance_area_text || '不明'}</p>
      <p>進行方向: ${typhoon.direction || '不明'}</p>
      <p>移動速度: ${typhoon.speed || '不明'} ${typhoon.speed_unit || ''}</p>
      <div class="image-selection">
        <label for="image-${typhoon.typh_no}-current">現在位置</label>
        <input type="radio" id="image-${typhoon.typh_no}-current" name="typhoon-image-${
    typhoon.typh_no
  }" value="${typhoon.img_current}" checked>
        <img src="${typhoon.img_current}" alt="Current Image" width="500">

        <label for="image-${typhoon.typh_no}-fcst3">三日間予測</label>
        <input type="radio" id="image-${typhoon.typh_no}-fcst3" name="typhoon-image-${
    typhoon.typh_no
  }" value="${typhoon.img_fcst3}">
        <img src="${typhoon.img_fcst3}" alt="3 Day Forecast Image" width="500">

        <label for="image-${typhoon.typh_no}-fcst5">五日間予測</label>
        <input type="radio" id="image-${typhoon.typh_no}-fcst5" name="typhoon-image-${
    typhoon.typh_no
  }" value="${typhoon.img_fcst5}">
        <img src="${typhoon.img_fcst5}" alt="5 Day Forecast Image" width="500">
      </div>
    </div>
  `;
}

function showTyphoonInfo(index) {
  const typhoonInfos = document.querySelectorAll('.typhoon-info');
  const tabs = document.querySelectorAll('#typhoon-tabs button');

  typhoonInfos.forEach((info, idx) => {
    info.style.display = idx === index ? 'block' : 'none';
  });

  tabs.forEach((tab, idx) => {
    tab.classList.toggle('active', idx === index);
  });
}

function toggleTyphoonInfo() {
  const typhoonInfoElement = document.getElementById('typhoon-info');
  isTyphoonInfoVisible = !isTyphoonInfoVisible;
  typhoonInfoElement.style.display = isTyphoonInfoVisible ? 'block' : 'none';
  document.getElementById('toggle-button').textContent = isTyphoonInfoVisible ? '閉じる' : '展開';
}

document.getElementById('toggle-button').addEventListener('click', toggleTyphoonInfo);

function init() {
  updateTime();
  fetchAndUpdateData(); // 初回のデータ取得
  setInterval(fetchAndUpdateData, 60000); // 1分ごとにデータ更新
}

document.addEventListener('DOMContentLoaded', init);
