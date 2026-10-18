const $ = selector => document.querySelector(selector);
let tripData;
const FEATURE_FLAGS = Object.freeze({ chat: false });

function safeSlug(value) { return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
function escapeAttr(value) { return String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function mapUrl(name) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name+', China')}`; }
function placeUrl(place) { return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`; }
function amapUrl(name, lat, lng) { return `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(name)}&coordinate=wgs84&src=china-trip-pages&callnative=0`; }
function placesFor(city, places) { return places.filter(place => place.city === city); }
function placeItem(place) { return `<li><a href="${placeUrl(place)}" target="_blank" rel="noreferrer"><b>${escapeAttr(place.name)}</b>${place.zh ? ` <span lang="zh">${escapeAttr(place.zh)}</span>` : ''}</a><a class="amap-link" href="${amapUrl(place.name, place.lat, place.lng)}" target="_blank" rel="noreferrer" aria-label="Open ${escapeAttr(place.name)} in Amap">Amap ↗</a><span class="place-day">${escapeAttr(place.day)}</span>${place.note ? `<span class="place-note">${escapeAttr(place.note)}</span>` : ''}</li>`; }
function initMap(data, setCity) {
  const element = $('#route-map');
  if (!element || !window.L) {
    if (element) element.textContent = 'The map could not load. Use the city links to open Google Maps.';
    return null;
  }
  const map = window.L.map(element, { scrollWheelZoom: false });
  window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  const route = data.cities.map(city => [city.lat, city.lng]);
  window.L.polyline(route, { color: '#b74b36', weight: 2.5, opacity: .7, dashArray: '6 6' }).addTo(map);
  data.places.forEach(place => {
    const popup = `<b>${escapeAttr(place.name)}</b><br>${escapeAttr(place.city)} · ${escapeAttr(place.day)}<br><a href="${amapUrl(place.name, place.lat, place.lng)}" target="_blank" rel="noreferrer">Open in Amap ↗</a>${place.note ? `<br>${escapeAttr(place.note)}` : ''}`;
    window.L.circleMarker([place.lat, place.lng], { radius: 4, color: '#737c59', weight: 1, fillColor: '#737c59', fillOpacity: .85 }).addTo(map).bindPopup(popup);
  });
  data.cities.forEach(city => {
    const marker = window.L.marker([city.lat, city.lng], {
      title: city.name,
      icon: window.L.divIcon({ className: 'city-pin', html: `<span>${escapeAttr(city.arrow)}</span>`, iconSize: [26, 26] })
    }).addTo(map);
    marker.bindTooltip(city.name, { direction: 'top', offset: [0, -12] });
    marker.on('click', () => { setCity(city.name); map.flyTo([city.lat, city.lng], 11, { duration: .6 }); });
  });
  map.fitBounds(window.L.latLngBounds(route).pad(.1));
  return map;
}
function photo(id) { return `assets/${id}.jpg`; }
function initPage(data) {
  tripData=data;
  const {cities,daySets,guides,tasks}=data;
  const routeList=$('#route-list');
  routeList.innerHTML = cities.map((city, index) => {
    const places = placesFor(city.name, data.places);
    const list = places.length ? `<details class="city-places"><summary>${places.length} ${places.length === 1 ? 'place' : 'places'} of interest</summary><a class="amap-link amap-city" href="${amapUrl(city.name, city.lat, city.lng)}" target="_blank" rel="noreferrer">Open ${escapeAttr(city.name)} in Amap ↗</a><ul>${places.map(placeItem).join('')}</ul></details>` : '';
    return `<div class="route-stop-wrap"><a class="route-stop${index === 0 ? ' active' : ''}" data-city="${escapeAttr(city.name)}" href="${mapUrl(city.name)}" target="_blank" rel="noreferrer"><span class="stop-num">${escapeAttr(city.arrow)}</span><span><span class="stop-name">${escapeAttr(city.name)}</span><span class="stop-region">${escapeAttr(city.region)}</span><span class="stop-transfer">${escapeAttr(city.transfer)}</span></span><span class="stop-arrow" aria-hidden="true">↗</span></a>${list}</div>`;
  }).join('');
  function setCity(name) { routeList.querySelectorAll('.route-stop').forEach(element => element.classList.toggle('active', element.dataset.city === name)); }
  let map;
  const focusCity = name => {
    setCity(name);
    const city = cities.find(item => item.name === name);
    if (map && city) map.flyTo([city.lat, city.lng], 11, { duration: .6 });
  };
  routeList.querySelectorAll('.route-stop').forEach(element => {
    element.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.button !== 0) return;
      event.preventDefault();
      focusCity(element.dataset.city);
      const details = element.parentElement.querySelector('details');
      if (details) details.open = !details.open;
    });
    element.addEventListener('mouseenter', () => setCity(element.dataset.city));
  });
  map = initMap(data, name => {
    setCity(name);
    const element = [...routeList.querySelectorAll('.route-stop')].find(item => item.dataset.city === name);
    if (element) {
      const details = element.parentElement.querySelector('details');
      if (details) details.open = true;
    }
  });

  const grid=$('#days-grid');
  function renderDays(key) {
    const group=daySets[key];
    grid.innerHTML=group.map((d,index)=>`<article class="day-card"><div class="day-photo" style="background-image:url('${photo(d[5].photo)}')"><span class="day-date">${d[0]} <span>·</span> ${d[4].toUpperCase()}</span></div><div class="day-copy"><span class="day-tag">${d[1]}</span><h3>${d[2]}</h3><p>${d[3]}</p></div></article>`).join('');
  }
  renderDays('1');
  document.querySelectorAll('.day-tab').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('.day-tab').forEach(t=>{t.classList.remove('active');t.setAttribute('aria-selected','false')});tab.classList.add('active');tab.setAttribute('aria-selected','true');renderDays(tab.dataset.range)}));

  $('#guide-grid').innerHTML=guides.map(g=>{const id=`guide-${safeSlug(g.place)}`;return `<article class="guide-card"><div class="guide-image" style="background-image:url('${photo(g.photo)}')"></div><div class="guide-copy"><p class="eyebrow">${g.place}</p><h3>${g.topic}</h3><p>${g.text}</p></div></article>`}).join('');
  const notes=data.tripNotes;
  const notesBox=document.createElement('div'); notesBox.className='trip-notes';
  const connectivity=notes.connectivity;
  const noteCards=[
    ['Travel basics',`Exchange rate: ${notes.exchangeRate}.`,`${notes.guide}.`],
    ['Vietnam entry',`${notes.vietnamArrival.due} <a href="${notes.vietnamArrival.formUrl}" target="_blank" rel="noreferrer">Complete the arrival form ↗</a>`,`Print the QR code after submitting the form.`],
    ['Stay connected',`Wi-Fi rental: ${connectivity.wifiRental}.`,`SIM choices: ${connectivity.simOptions.join('; ')}.`],
    ['Before departure',...notes.reminders],
  ];
  notesBox.innerHTML=noteCards.map(([title,...body])=>`<article class="trip-note"><h3>${title}</h3>${body.map(line=>`<p>${line}</p>`).join('')}</article>`).join('');
  $('#guide-grid').before(notesBox);
  const alert=document.createElement('aside'); alert.className='trip-note flight-alert'; alert.innerHTML=`<h3>Flight time to confirm</h3><p>The forwarded email lists ${notes.flightDiscrepancy.flight} as ${notes.flightDiscrepancy.email}; the tour document lists ${notes.flightDiscrepancy.tourDocument}. Please confirm with the organizer before relying on either time.</p>`;
  notesBox.append(alert);

  const list=$('#checklist-items'); let saved={};
  try { saved=JSON.parse(localStorage.getItem('china-trip-checklist')||'{}'); } catch {}
  let n=0;
  list.innerHTML=Object.entries(tasks).map(([group,items])=>`<div class="check-group">${group}</div>${items.map(item=>{const id=`task-${n++}`;const thread=`check-${safeSlug(item)}`;return `<div class="check-row"><label class="check-item${saved[item]?' done':''}"><input type="checkbox" data-item="${escapeAttr(item)}"${saved[item]?' checked':''}><span>${item}</span></label></div>`}).join('')}`).join('');
  function updateProgress(){const inputs=[...list.querySelectorAll('input')],done=inputs.filter(i=>i.checked).length;$('#progress-label').textContent=`${done} / ${inputs.length} DONE`;$('#progress-bar').style.width=`${done/inputs.length*100}%`;}
  let toastTimer; list.addEventListener('change',e=>{if(!e.target.matches('input'))return;const item=e.target.dataset.item;saved[item]=e.target.checked;try{localStorage.setItem('china-trip-checklist',JSON.stringify(saved))}catch{}e.target.closest('.check-item').classList.toggle('done',e.target.checked);updateProgress();const toast=$('#toast');toast.textContent=e.target.checked?'Saved to your checklist':'Removed from your checklist';toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),1500);});
  $('#reset-checklist').addEventListener('click',()=>{saved={};try{localStorage.removeItem('china-trip-checklist')}catch{}list.querySelectorAll('input').forEach(i=>{i.checked=false;i.closest('.check-item').classList.remove('done')});updateProgress();}); updateProgress();
  document.body.classList.add('ready');
}


if (FEATURE_FLAGS.chat) $('#chat-feature').hidden = false;

fetch('data.json').then(response=>{if(!response.ok)throw new Error('Trip guide data could not be loaded.');return response.json();}).then(initPage).catch(error=>{console.error(error);document.body.classList.add('ready');const message=document.createElement('p');message.className='load-error';message.textContent='The trip guide could not load. Check your connection and refresh the page.';document.querySelector('main').prepend(message);});
