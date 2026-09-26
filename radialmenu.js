// 🌿 radialmenu.js — радиальное меню Soundfield (перенос из radial-v8_4.html)
// Геометрия, физика, размеры и вся логика уровней — ДОСЛОВНО из референса.
// Интеграционные края (не трогают геометрию/физику):
//   • весь код в IIFE + initRadialMenu() — изоляция от глобалов приложения (GAP, modeParams);
//   • isUI() расширяется СРАЗУ и безусловно — чтобы холст (touchstart preventDefault в scripts.js
//     строка ~1052) не глушил касания по меню ещё до инициализации;
//   • init на мобильном (<=768px) поднимается надёжно: load-time / DOMContentLoaded / load / mq-change;
//   • grip дублируется touchend-обработчиком (тот же toggle, что в референсе) — открытие на тач
//     не зависит от того, дожил ли синтетический click; на десктопе работает штатный click;
//   • демо-леса референса (.dots, .viz) не переносятся; закрытие по .viz → закрытие по тапу вне меню.

(function(){
  // --- isUI: холст игнорирует касания по меню (синхронно, до любого тапа) ---
  if (typeof window.isUI === 'function' && !window.isUI.__radialWrapped) {
    var _origIsUI = window.isUI;
    window.isUI = function(e){
      return _origIsUI(e) || (e.target && e.target.closest && !!e.target.closest('#radialMenu'));
    };
    window.isUI.__radialWrapped = true;
  }

  var _mq = window.matchMedia('(max-width:768px)');
  var _inited = false;

  function initRadialMenu(){
    if (_inited) return;
    if (!document.getElementById('ringContainer')) return;
    _inited = true;

    // === Геометрия ===
    var W_RING = 390;
    var H_RING = 400;
    var Y_OFFSET = 20;
    var CX = W_RING / 2;
    var CY = H_RING + Y_OFFSET;

    var GAP = 10;
    var THICKNESS = 60;

    var LVL1 = {
        R_IN: 100,
        R_OUT: 160,
        R_MID: 130,
        SCALE_X: 1.15,
        SECTOR_ANGLE: Math.PI * 0.24,
        VISIBLE_SWEEP: 5 * Math.PI * 0.24,
        CENTER_ANGLE: Math.PI/2,
        COUNT: 8
    };

    // L2 — внешнее кольцо (режимы для Tools)
    var R_IN2 = LVL1.R_OUT + GAP;
    var R_OUT2 = R_IN2 + THICKNESS;
    var LVL2 = {
        R_IN: R_IN2,
        R_OUT: R_OUT2,
        R_MID: (R_IN2 + R_OUT2) / 2,
        SCALE_X: 1.15,
        SECTOR_ANGLE: Math.PI * 0.20,
        VISIBLE_SWEEP: 5 * Math.PI * 0.20,
        CENTER_ANGLE: Math.PI/2,
        COUNT: 22
    };

    // === Иконки в новом порядке: 8, 5, 4, 3, 6, 7, 2, 1 ===
    var innerItems = [
        {key:'scene2d', icon:'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="12" x2="21" y2="12" opacity=".3"/><line x1="12" y1="3" x2="12" y2="21" opacity=".3"/></svg>'},
        {key:'toolModes', icon:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="26" height="26"><path fill="currentColor" d="M12.772 2.994c1.662-.018 3.835-.042 5.663.158c1.018.111 1.86.285 2.427.533c.592.258.638.473.638.565c0 .137-.05.301-.41.501c-.384.214-.997.386-1.838.507c-1.669.24-3.92.242-6.252.242h-.045c-2.279 0-4.633 0-6.421.258c-.894.129-1.726.332-2.353.68C3.528 6.802 3 7.389 3 8.25c0 .659.339 1.164.757 1.518c.407.345.929.585 1.442.756c1.032.344 2.24.476 3.05.476H9V9.5h-.75c-.69 0-1.731-.117-2.575-.399c-.424-.141-.746-.307-.948-.478c-.191-.162-.227-.281-.227-.373c0-.137.05-.3.41-.5c.384-.214.998-.386 1.838-.507C8.417 7.002 10.668 7 13 7h.045c2.279 0 4.634 0 6.421-.257c.894-.13 1.726-.332 2.354-.681c.652-.363 1.18-.949 1.18-1.812c0-1.017-.782-1.61-1.538-1.94c-.78-.34-1.805-.534-2.865-.65c-1.924-.21-4.19-.184-5.839-.166l-.515.006a.75.75 0 1 0 .014 1.5zM13.75 8A2.75 2.75 0 0 0 11 10.75v5.337c-1.276-.471-2.382-.479-3.297-.131c-1.16.44-1.86 1.391-2.165 2.307a.75.75 0 0 0 .346.892l4.555 2.551a6.25 6.25 0 0 1 2.373 2.352l.353.618a2.75 2.75 0 0 0 2.813 1.353l2.781-.435a2.75 2.75 0 0 0 2.264-2.138l1.029-4.772a3.75 3.75 0 0 0-3.153-4.506l-2.399-.331v-3.096A2.75 2.75 0 0 0 13.75 8m-1.25 2.75a1.25 1.25 0 1 1 2.5 0v3.75a.75.75 0 0 0 .647.743l3.047.421a2.25 2.25 0 0 1 1.891 2.703l-1.029 4.773a1.25 1.25 0 0 1-1.029.972l-2.781.435a1.25 1.25 0 0 1-1.279-.615l-.353-.618a7.75 7.75 0 0 0-2.942-2.917l-3.947-2.21c.233-.359.57-.662 1.01-.829c.642-.244 1.66-.255 3.16.553a.75.75 0 0 0 1.105-.66z"/></svg>'},
        {key:'toolPalette', icon:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26"><path fill="currentColor" d="M12 22q-2.05 0-3.875-.788t-3.187-2.15t-2.15-3.187T2 12q0-2.075.813-3.9t2.2-3.175T8.25 2.788T12.2 2q2 0 3.775.688t3.113 1.9t2.125 2.875T22 11.05q0 2.875-1.75 4.413T16 17h-1.85q-.225 0-.312.125t-.088.275q0 .3.375.863t.375 1.287q0 1.25-.687 1.85T12 22m-4.425-9.425Q8 12.15 8 11.5t-.425-1.075T6.5 10t-1.075.425T5 11.5t.425 1.075T6.5 13t1.075-.425m3-4Q11 8.15 11 7.5t-.425-1.075T9.5 6t-1.075.425T8 7.5t.425 1.075T9.5 9t1.075-.425m5 0Q16 8.15 16 7.5t-.425-1.075T14.5 6t-1.075.425T13 7.5t.425 1.075T14.5 9t1.075-.425m3 4Q19 12.15 19 11.5t-.425-1.075T17.5 10t-1.075.425T16 11.5t.425 1.075T17.5 13t1.075-.425M12 20q.225 0 .363-.125t.137-.325q0-.35-.375-.825T11.75 17.3q0-1.05.725-1.675T14.25 15H16q1.65 0 2.825-.962T20 11.05q0-3.025-2.312-5.038T12.2 4Q8.8 4 6.4 6.325T4 12q0 3.325 2.338 5.663T12 20"/></svg>'},
        {key:'toolSettings', icon:'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="4" y1="8" x2="20" y2="8"/><circle cx="10" cy="8" r="2.5" fill="currentColor" stroke="none"/><line x1="4" y1="16" x2="20" y2="16"/><circle cx="15" cy="16" r="2.5" fill="currentColor" stroke="none"/></svg>'},
        {key:'anchorMusic', icon:'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'},
        {key:'anchorProfile', icon:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="26" height="26"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M24 20a7 7 0 1 0 0-14a7 7 0 0 0 0 14M6 40.8V42h36v-1.2c0-4.48 0-6.72-.872-8.432a8 8 0 0 0-3.496-3.496C35.92 28 33.68 28 29.2 28H18.8c-4.48 0-6.72 0-8.432.872a8 8 0 0 0-3.496 3.496C6 34.08 6 36.32 6 40.8"/></svg>'},
        {key:'toolMusic', icon:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26"><path fill="currentColor" d="M5.98 21.5q1.34 0 2.23-.756q.892-.755 1.398-2.14q.386-1.096.87-1.702t1.845-1.686q1.512-1.212 2.335-2.72T15.48 9q0-2.783-1.859-4.641T8.981 2.5q-2.667 0-4.488 1.695T2.52 8.5h1q.154-2.183 1.707-3.591T8.981 3.5q2.317 0 3.909 1.591Q14.48 6.683 14.48 9q0 1.777-.8 3.16q-.8 1.382-2.068 2.351q-1.185.893-1.824 1.687t-1.084 1.96q-.427 1.119-1.04 1.73t-1.683.612q-.883 0-1.566-.568q-.684-.568-.857-1.432H2.519q.173 1.285 1.147 2.142q.972.858 2.315.858m4.506-10.997q.61-.612.61-1.503q0-.896-.61-1.506t-1.506-.61t-1.506.61T6.865 9q0 .89.61 1.503t1.506.613t1.506-.613m7.917 3.33l-.764-.744q.398-.945.62-1.957q.22-1.013.22-2.113q0-1.08-.21-2.09q-.212-1.01-.61-1.954l.763-.764q.514 1.091.786 2.296T19.48 9q0 1.314-.282 2.518t-.795 2.315m2.944 2.9l-.725-.72q.898-1.538 1.378-3.297t.48-3.666q0-1.93-.49-3.684q-.489-1.752-1.393-3.31l.73-.731q1.034 1.685 1.593 3.64q.56 1.954.56 4.074t-.56 4.064t-1.573 3.63"/></svg>'},
        {key:'toolCreate', icon:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="26" height="26"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M6 14v-2a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v2m-10 4v12m8-10v8M24 15v18m-8-15v12M8 20v8m-2 6v2a6 6 0 0 0 6 6h24a6 6 0 0 0 6-6v-2"/></svg>'}
    ];

    // L3 — настройки режима (текст)
    var R_IN3 = LVL2.R_OUT + GAP;
    var R_OUT3 = R_IN3 + THICKNESS;
    var LVL3 = {
        R_IN: R_IN3,
        R_OUT: R_OUT3,
        R_MID: (R_IN3 + R_OUT3) / 2,
        SCALE_X: 1.15,
        SECTOR_ANGLE: Math.PI * 0.20,
        VISIBLE_SWEEP: 5 * Math.PI * 0.20,
        CENTER_ANGLE: Math.PI/2,
        COUNT: 2
    };

    // L4 — воображаемое кольцо с ползунком
    var R_IN4 = LVL3.R_OUT + GAP;
    var R_OUT4 = R_IN4 + THICKNESS;
    var LVL4 = {
        R_IN: R_IN4,
        R_OUT: R_OUT4,
        R_MID: (R_IN4 + R_OUT4) / 2,
        SCALE_X: 1.15,
        VISIBLE_SWEEP: 5 * Math.PI * 0.20,
        CENTER_ANGLE: Math.PI/2
    };

    // === L2: режимы (modeIcons из tools.js) ===
    function mi(inner){return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+inner+'</svg>';}
    var toolsItems = [
        {key:'vortex',icon:mi('<path d="M12 12c0-3 2-5 5-5"/><path d="M12 12c0 3-2 5-5 5"/><path d="M12 12c-3 0-5-2-5-5"/><path d="M12 12c3 0 5 2 5 5"/>')},
        {key:'turbulence',icon:mi('<polyline points="2,8 5,5 8,9 11,4 14,10 17,5 20,8"/><polyline points="2,13 5,10 8,14 11,9 14,15 17,10 20,13"/><polyline points="2,18 5,15 8,19 11,14 14,20 17,15 20,18"/>')},
        {key:'electrostatic',icon:mi('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>')},
        {key:'wave',icon:mi('<path d="M3 8c3-2 5 2 8 0s5-2 8 0"/><path d="M3 12c3-2 5 2 8 0s5-2 8 0"/><path d="M3 16c3-2 5 2 8 0s5-2 8 0"/>')},
        {key:'pulsar',icon:mi('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6" opacity=".5"/><circle cx="12" cy="12" r="9" opacity=".25"/>')},
        {key:'fibonacci',icon:mi('<path d="M12 12a2 2 0 0 0 2-2"/><path d="M14 10a4 4 0 0 0-4-4"/><path d="M10 6a6 6 0 0 0-6 6"/><path d="M4 12a10 10 0 0 0 10 10"/><circle cx="12" cy="12" r=".7" fill="currentColor" stroke="none"/>')},
        {key:'lorenz',icon:mi('<ellipse cx="8" cy="11" rx="4.5" ry="3.5"/><ellipse cx="16" cy="11" rx="4.5" ry="3.5"/><circle cx="12" cy="11" r=".8" fill="currentColor" stroke="none"/>')},
        {key:'automaton',icon:mi('<rect x="4" y="4" width="5" height="5" rx="1"/><rect x="15" y="4" width="5" height="5" rx="1" fill="currentColor" opacity=".4"/><rect x="4" y="15" width="5" height="5" rx="1" fill="currentColor" opacity=".4"/><rect x="15" y="15" width="5" height="5" rx="1"/>')},
        {key:'mycelium',icon:mi('<path d="M12 20v-6"/><path d="M12 14l-6-5"/><path d="M12 14l6-5"/><path d="M6 9l-2-4"/><path d="M18 9l2-4"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/>')},
        {key:'swarm',icon:'<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><circle cx="9" cy="8" r="1.2"/><circle cx="14" cy="7" r="1.5"/><circle cx="7" cy="13" r="1"/><circle cx="12" cy="12" r="1.8"/><circle cx="17" cy="11" r="1.2"/><circle cx="10" cy="17" r="1.3"/><circle cx="15" cy="16" r="1"/></svg>'},
        {key:'breathing',icon:mi('<circle cx="12" cy="12" r="3.5"/><path d="M8.5 8.5L5 5M15.5 8.5L19 5M8.5 15.5L5 19M15.5 15.5L19 19" opacity=".35"/>')},
        {key:'mandala',icon:mi('<circle cx="12" cy="12" r="9"/><polygon points="12,5 17.5,15 6.5,15"/><polygon points="12,19 6.5,9 17.5,9"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" opacity=".4"/>')},
        {key:'yantra',icon:mi('<polygon points="12,3 21,19 3,19"/><polygon points="12,21 3,5 21,5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>')},
        {key:'honeycomb',icon:mi('<polygon points="12,2 16.5,5 16.5,11 12,14 7.5,11 7.5,5"/><polygon points="12,14 16.5,11 16.5,17 12,20 7.5,17 7.5,11" opacity=".5"/>')},
        {key:'fibers',icon:mi('<path d="M3 20c4-8 6-2 10-14"/><path d="M7 21c3-7 5-3 8-12" opacity=".6"/><path d="M11 22c2-6 4-4 7-14" opacity=".35"/>')},
        {key:'sphere',icon:mi('<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3.5 9h17M3.5 15h17"/>')},
        {key:'galaxy',icon:mi('<path d="M12 12c-2-3-1-6 2-7s6 1 5 4-4 3-7 3-5 2-4 5 3 4 6 3 3-3 1-5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>')},
        {key:'blackhole',icon:mi('<ellipse cx="12" cy="12" rx="9" ry="3"/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" opacity=".6"/><path d="M12 9V2" opacity=".5"/><path d="M12 15v7" opacity=".5"/>')},
        {key:'neural',icon:mi('<circle cx="6" cy="6" r="2" fill="currentColor" stroke="none" opacity=".6"/><circle cx="18" cy="6" r="2" fill="currentColor" stroke="none" opacity=".6"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" opacity=".6"/><circle cx="6" cy="18" r="2" fill="currentColor" stroke="none" opacity=".6"/><circle cx="18" cy="18" r="2" fill="currentColor" stroke="none" opacity=".6"/><path d="M6 6l6 6M18 6l-6 6M6 18l6-6M18 18l-6-6" opacity=".35"/>')},
        {key:'crystal',icon:mi('<path d="M12 2l8 6v8l-8 6-8-6V8z"/><path d="M12 2v20M4 8l8 4 8-4M4 16l8-4 8 4" opacity=".3"/>')},
        {key:'meteor',icon:mi('<path d="M19 3L5 17"/><path d="M16 5L7 14" opacity=".5"/><circle cx="5" cy="17" r="1.5" fill="currentColor" stroke="none" opacity=".6"/>')},
        {key:'nebula',icon:mi('<circle cx="12" cy="12" r="8" opacity=".2"/><circle cx="12" cy="12" r="5" opacity=".35"/><circle cx="10" cy="11" r="2" opacity=".5"/><circle cx="12" cy="10" r="1" fill="currentColor" stroke="none" opacity=".8"/>')}
    ];
    LVL2.COUNT = toolsItems.length;

    // === Настройки каждого режима (из modeParamDefs в tools.js) ===
    var refParamLabels = {  // метки из референса (реальные берём из modeParamDefs)
        vortex:['Сила','Закрутка'],
        turbulence:['Интенсивность','Масштаб шума'],
        electrostatic:['Заряд','Кристалл'],
        wave:['Частота','Амплитуда'],
        pulsar:['Пульсация','Вращение'],
        fibonacci:['Плотность','Сила'],
        lorenz:['Скорость','Сила'],
        automaton:['Размер ячейки','Скорость'],
        mycelium:['Рост','Ветвление'],
        swarm:['Сплочённость','Разделение'],
        breathing:['Скорость','Глубина'],
        mandala:['Стиль','Лучи','Вращение','Кольца','Лепестки'],
        yantra:['Стиль','Слои','Вращение','Резкость'],
        honeycomb:['Стиль','Размер','Зазор','Затухание','Скорость волны'],
        fibers:['Длина нити','Толщина','Затухание'],
        sphere:['Размер','Вращение','Наклон'],
        galaxy:['Рукава','Вращение','Плоскость'],
        blackhole:['Диск','Джеты','Вращение'],
        neural:['Связи','Импульс','Затухание'],
        crystal:['Порядок','Рост','Решётка'],
        meteor:['Скорость','Плотность','Линза'],
        nebula:['Плотность','Пульс','Рассеяние']
    };
    function activeToolKey(){var i=Math.round(lvl2Offset)%LVL2.COUNT;i=((i%LVL2.COUNT)+LVL2.COUNT)%LVL2.COUNT;return toolsItems[i].key;}
    function l3Items(){ return l3Controls().map(function(c){ return {label:c.label}; }); }
    function l3Visible(){ return l3Controls().length>0; }
    // L4 — ползунок виден когда виден L3 и есть активный параметр
    function l4Visible(){ return sliderTarget()!=null; }
    // Значение активного параметра (0..1), храним по ключу режим+параметр
    var sliderValues = {};
    function activeParamKey(){
        var t2 = sliderTarget(); if (!t2) return null;
        if (t2.type==='setting') return 'set:'+t2.s.label;
        if (t2.type==='ctrl')    return 'ctrl:'+t2.c.label;
        return t2.mode+':'+t2.def.key;
    }
    function getSliderVal(){ return realGet(); }
    function setSliderVal(v){ realSet(v); }


    // ═══════════════════════════════════════════════════════════════
    // 🌿 МОСТ К ПРИЛОЖЕНИЮ
    // Движок референса (геометрия/физика/рендер) не тронут — здесь только
    // ДАННЫЕ уровней и чтение/запись РЕАЛЬНЫХ переменных приложения.
    // Выбор в этом меню = прокрутка: активен элемент, вставший в центр.
    // ═══════════════════════════════════════════════════════════════
    function G(name){ try { return eval(name); } catch(e){ return undefined; } }
    var toolIconByKey = {}; toolsItems.forEach(function(it){ toolIconByKey[it.key]=it.icon; });

    // Человеческие имена категорий — для подписи в центре круга
    var L1_LABEL = {
        scene2d:'Сцена', toolModes:'Инструменты', toolPalette:'Палитры',
        toolSettings:'Настройки', anchorMusic:'Музыка', anchorProfile:'Профиль',
        toolMusic:'Свой трек', toolCreate:'Биты'
    };
    // Когда применять выбор второго кольца:
    //   now   — сразу как кольцо встало (палитры: живой предпросмотр)
    //   delay — с паузой (режимы: смена пересобирает геометрию, беречь от прокрутки насквозь)
    //   tap   — только по явному тапу (треки, сцена, действия — иначе сработают «мимоходом»)
    var POLICY = {palettes:'now', settings:'now', modes:'delay',
                  tracks:'tap', scene:'tap', action:'tap', flow:'tap', locked:'tap'};

    function activeL1(){
        var i=Math.round(lvl1Offset)%LVL1.COUNT; i=((i%LVL1.COUNT)+LVL1.COUNT)%LVL1.COUNT;
        return innerItems[i].key;
    }

    // --- Настройки: L2 = список, тап/прокрутка → сразу L4 ---
    var SETTINGS = [
        {label:'Скорость', min:0.1, max:3,  get:function(){return G('spinSpeed');},       set:function(v){ spinSpeed=v; }},
        {label:'Зум',      min:0.3, max:3,  get:function(){return G('zoomLevel');},       set:function(v){ zoomLevel=v; }},
        {label:'Яркость',  min:0.1, max:2,  get:function(){return G('brightnessLevel');}, set:function(v){ brightnessLevel=v; }},
        {label:'Шаг',      min:2,   max:12, get:function(){return G('userGap');},         set:function(v){ pendingGap=Math.round(v); }, defer:true}
    ];
    var pendingGap = null;
    function applyPendingGap(){
        if (pendingGap==null) return;
        var v=pendingGap; pendingGap=null;
        if (G('userGap')===v) return;
        try{ userGap=v; cancelAnimationFrame(animFrame); init(); lastTime=performance.now(); animFrame=requestAnimationFrame(loop); }catch(e){}
    }
    function settingsIcon(i){
        // порядок SETTINGS: 0 Скорость, 1 Масштаб, 2 Яркость, 3 Плотность
        var bars=[
            // Скорость — минимальный спидометр (дуга + стрелка)
            '<path d="M3.5 16.5 A9 9 0 0 1 20.5 16.5"/><line x1="12" y1="16.5" x2="16" y2="9.5"/><circle cx="12" cy="16.5" r="1.3" fill="currentColor" stroke="none"/>',
            // Масштаб — лупа с плюсом
            '<circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.3" y1="15.3" x2="20.5" y2="20.5"/><line x1="7.5" y1="10.5" x2="13.5" y2="10.5"/><line x1="10.5" y1="7.5" x2="10.5" y2="13.5"/>',
            // Яркость — солнце с лучами
            '<circle cx="12" cy="12" r="4"/><line x1="12" y1="3.5" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="20.5"/><line x1="3.5" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="20.5" y2="12"/><line x1="6" y1="6" x2="7.7" y2="7.7"/><line x1="16.3" y1="16.3" x2="18" y2="18"/><line x1="18" y1="6" x2="16.3" y2="7.7"/><line x1="7.7" y1="16.3" x2="6" y2="18"/>',
            // Плотность — сетка точек 3×3
            '<circle cx="6" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="6" cy="18" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="18" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="18" r="1.4" fill="currentColor" stroke="none"/>'
        ];
        return mi(bars[i]||bars[0]);
    }
    // --- Палитры: превью-«кусок пирога» из swatch (как в ПК-меню) ---
    // Трапеция: широкая вверху, узкая внизу, вытянута вертикально.
    // SVG (а не div с clip-path) — чтобы работали .ri.active svg: scale+свечение.
    // Строим один раз на палитру и кешируем: renderAll крутится каждый кадр.
    var _palIconCache = {};
    function roundedPoly(pts, r){
        var d='';
        for (var i=0;i<pts.length;i++){
            var p=pts[i], prev=pts[(i-1+pts.length)%pts.length], next=pts[(i+1)%pts.length];
            var v1x=prev[0]-p[0], v1y=prev[1]-p[1], l1=Math.sqrt(v1x*v1x+v1y*v1y)||1;
            var v2x=next[0]-p[0], v2y=next[1]-p[1], l2=Math.sqrt(v2x*v2x+v2y*v2y)||1;
            var rr=Math.min(r, l1/2, l2/2);
            var a=[p[0]+v1x/l1*rr, p[1]+v1y/l1*rr];
            var b=[p[0]+v2x/l2*rr, p[1]+v2y/l2*rr];
            d += (i===0 ? 'M'+a[0].toFixed(2)+','+a[1].toFixed(2) : 'L'+a[0].toFixed(2)+','+a[1].toFixed(2));
            d += 'Q'+p[0].toFixed(2)+','+p[1].toFixed(2)+' '+b[0].toFixed(2)+','+b[1].toFixed(2);
        }
        return d+'Z';
    }
    function swatchColors(sw){
        var m = (sw||'').match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g);
        return (m && m.length) ? m : ['#888888','#ffffff'];
    }
    function buildPalPreview(id, colors){
        // широкий верх → узкий низ (соответствует свотчу ДК, повёрнутому вертикально)
        var pts=[[2.2,1.2],[26.4,1.2],[18.7,22],[9.9,22]];
        var stops='';
        for (var i=0;i<colors.length;i++){
            var off = colors.length===1 ? 0 : (i/(colors.length-1)*100);
            stops += '<stop offset="'+off.toFixed(1)+'%" stop-color="'+colors[i]+'"/>';
        }
        return '<svg class="pal-prev" viewBox="0 0 28.6 23.2" width="29" height="23">'
             + '<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1">'+stops+'</linearGradient></defs>'
             + '<path d="'+roundedPoly(pts,3)+'" fill="url(#'+id+')" '
             + 'stroke="rgba(255,255,255,0.28)" stroke-width="1"/></svg>';
    }
    function paletteIcon(key){
        if (_palIconCache[key]) return _palIconCache[key];
        var html;
        try{
            var sw = palettes[key] && palettes[key].swatch;
            html = buildPalPreview('pg_'+key.replace(/[^a-zA-Z0-9_]/g,''), swatchColors(sw));
        }catch(e){ html = mi('<circle cx="12" cy="12" r="8"/>'); }
        _palIconCache[key] = html;
        return html;
    }
    function randomPaletteIcon(){
        if (_palIconCache.__random__) return _palIconCache.__random__;
        // тот же силуэт, нейтральная заливка — читается как действие, а не палитра
        var html = buildPalPreview('pg_random', ['#8a8a8a','#f2f2f2']);
        _palIconCache.__random__ = html;
        return html;
    }
    function lockIcon(){
        return mi('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>');
    }
    function trackIcon(n){
        return '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/>'
             +'<text x="12" y="16" text-anchor="middle" font-size="10" fill="currentColor">'+n+'</text></svg>';
    }

    // --- Что показывать на L2 для текущего пункта L1 ---
    function l2Data(){
        var k=activeL1();
        if (k==='toolModes'){
            var ms=G('modes'); if(!ms) return {kind:null, items:[]};
            var is3D = G('currentScene')==='3d';
            // В 3D у сцены свой набор режимов и своя переменная выбора (testMode3D).
            // Раньше кольцо меняло currentMode — в 3D это не влияло вообще ни на что.
            var allow, manual;
            if (is3D){
                var m3=G('manualModes3D')||[], a3=G('autoModes3D')||[];
                allow = m3.concat(a3).concat(['mandala']);
                manual = m3;
            } else {
                var only3D=G('only3DModes')||[];
                allow = ms.map(function(m){return m.key;}).filter(function(kk){ return only3D.indexOf(kk)<0; });
                manual = G('manualModes')||[];
            }
            // Ручные впереди, автоматические следом — как вкладки на десктопе,
            // но без лишнего уровня: группа показывается в подписи и риской на кольце.
            var list=[];
            ms.forEach(function(m){ if(allow.indexOf(m.key)>=0 && manual.indexOf(m.key)>=0) list.push({m:m,g:'Ручные'}); });
            ms.forEach(function(m){ if(allow.indexOf(m.key)>=0 && manual.indexOf(m.key)<0) list.push({m:m,g:'Автоматические'}); });
            return {kind:'modes', items:list.map(function(x){
                return {key:x.m.key, label:x.m.name, group:x.g,
                        icon:toolIconByKey[x.m.key]||mi('<circle cx="12" cy="12" r="7"/>')};
            })};
        }
        if (k==='toolPalette'){
            var ps=G('palettes'); if(!ps) return {kind:null,items:[]};
            var items=Object.keys(ps).map(function(pk){ return {key:pk, label:ps[pk].name, icon:paletteIcon(pk)}; });
            items.push({key:'__random__', label:'Удиви меня', icon:randomPaletteIcon()});
            return {kind:'palettes', items:items};
        }
        if (k==='toolSettings'){
            return {kind:'settings', items:SETTINGS.map(function(s,i){ return {key:s.label, label:s.label, icon:settingsIcon(i)}; })};
        }
        if (k==='anchorMusic'){
            var tr=G('bgmTracks'); if(!tr) return {kind:null,items:[]};
            return {kind:'tracks', items:tr.map(function(x,i){ return {key:String(i), label:x.title, icon:trackIcon(i+1)}; })};
        }
        if (k==='toolMusic'){
            if (G('dlcAudio')===false) return {kind:'locked', lock:'Доступно в DLC Аудио',
                items:[{key:'lock', label:'Доступно в DLC Аудио', icon:lockIcon()}]};
            // загружаемый пользователем трек для аудио-реактива — не путать с фоновым плеером
            var a=G('musicAudio'), name='Загрузить файл';
            var ua=document.getElementById('flowUploadText');
            if (a && a.src && ua && ua.textContent) name=ua.textContent;
            return {kind:'flow', items:[{key:'load', label:name, icon:mi('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>')}]};
        }
        if (k==='scene2d'){
            var sc=G('currentScene');
            return {kind:'scene', items:[
                {key:'2d', label:'2D', icon:mi('<rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="12" x2="21" y2="12" opacity=".3"/><line x1="12" y1="3" x2="12" y2="21" opacity=".3"/>')},
                {key:'3d', label:'3D', icon:mi('<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 22V12"/><path d="M21 7l-9 5-9-5" opacity=".4"/>')}
            ]};
        }
        if (k==='anchorProfile'){
            return {kind:'action', items:[{key:'profile', label:'Открыть профиль',
                icon:mi('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5"/>')}]};
        }
        if (k==='toolCreate'){
            return {kind:null, items:[]}; // Бит-машина скрыта
        }
        return {kind:null, items:[]};
    }
    function l2Idx(){
        var n=l2Data().items.length; if(!n) return 0;
        var i=Math.round(lvl2Offset)%n; return ((i%n)+n)%n;
    }
    function activeL2Item(){ var d=l2Data(); return d.items.length? d.items[l2Idx()] : null; }

    // --- Применение выбора L2 к приложению (при смене центрального элемента) ---
    var _lastApplied = null;
    function applyL2(force){
        var d=l2Data(), it=activeL2Item(); if(!it) return;
        var sig=activeL1()+'|'+it.key;
        // Явный тап — это явное намерение: он применяет всегда, даже если элемент
        // уже выбран (тап по текущему треку должен его запустить, а не промолчать).
        // Автоприменение при прокрутке по-прежнему защищено от повторов.
        if (sig===_lastApplied && !force) return;
        _lastApplied=sig;
        try{
            if (d.kind==='modes'){
                if (G('currentScene')==='3d'){
                    // 3D живёт своей переменной и требует пересборки частиц
                    testMode3D=it.key;
                    if (G('buildModeList3D')) buildModeList3D();
                    if (G('threeReady')){
                        if (it.key==='mandala' && G('rebuildMandalaHome')) rebuildMandalaHome(G('mandalaSubMode3D')||0);
                        else if (G('rebuild3DParticles')) rebuild3DParticles();
                    }
                    if (G('activeTool')==='settings' && G('buildModeSettings3D')) buildModeSettings3D();
                } else {
                    if (G('isModeAvail') && !isModeAvail(it.key)) return;
                    currentMode=it.key;
                    if (G('buildModeList')) buildModeList();
                    if (G('activeTool')==='settings' && G('buildCurrentModeSettings')){ buildCurrentModeSettings(); if(G('enhanceSliders'))enhanceSliders(); }
                }
            } else if (d.kind==='locked'){
                if (G('showLockToast')) showLockToast(d.lock);
            } else if (d.kind==='palettes'){
                if (it.key==='__random__'){ if(G('randomPalette')) randomPalette(); }
                else {
                    if (transitionProgress>=1) currentStops=JSON.parse(JSON.stringify(currentStops));
                    else currentStops=lerpStops(currentStops,targetStops,transitionProgress);
                    targetStops=JSON.parse(JSON.stringify(palettes[it.key].stops));
                    transitionProgress=0; currentPalette=it.key;
                    if (G('buildPaletteList')) buildPaletteList();
                }
            } else if (d.kind==='tracks'){
                bgmIdx=+it.key; if(G('bgmLoadAndPlay')) bgmLoadAndPlay();
            } else if (d.kind==='scene'){
                var sb=document.querySelector('.scene-btn[data-scene="'+it.key+'"]');
                if (sb) sb.click();
            } else if (d.kind==='flow'){
                var fi=document.getElementById('musicFile'); if(fi) fi.click();
            } else if (d.kind==='action'){
                if (it.key==='profile'){
                    var pt=document.querySelector('.anchor-profile')||document.getElementById('profileToggle');
                    if (pt) pt.click();
                } else if (it.key==='create'){
                    if (G('switchTool')) switchTool('create');
                }
            }
            if (G('haptic')) haptic();
        }catch(e){}
    }


    // --- Плеер: L3 = кнопка play/pause в стиле ползунка ---
    function isPlayerCat(){ var k=l2Data().kind; return k==='tracks'||k==='flow'; }
    // Кнопка воспроизведения рисуется, только когда она и выбрана на третьем кольце;
    // громкость/перемотка/реакция ведут себя как обычные параметры.
    function isButtonCtrl(){ var c=activeControl(); return !!c && c.kind==='button'; }
    function isPlaying(){
        return l2Data().kind==='flow' ? !!G('musicPlaying') : !!G('bgmPlaying');
    }
    function togglePlayer(){
        try{
            if (l2Data().kind==='flow'){
                var ma=G('musicAudio');
                if (!ma || !ma.src){ var fi=document.getElementById('musicFile'); if(fi) fi.click(); return; }
                var mb=document.getElementById('musicPlayBtn'); if(mb){ mb.click(); return; }
                return;
            }
            var a=G('bgmAudio');
            if (a && !a.src){ if(G('bgmLoadAndPlay')) bgmLoadAndPlay(); return; }  // первый тап — загрузить текущий трек
            var btn=document.getElementById('bgmPlayBtn');
            if (btn){ btn.click(); return; }                                       // переиспользуем логику приложения
            if (G('bgmPlaying')){ bgmAudio.pause(); bgmPlaying=false; }
            else { bgmAudio.play(); bgmPlaying=true; }
            if (G('bgmUpdateUI')) bgmUpdateUI();
        }catch(e){}
    }
    function renderPlayerL3(){
        LVL3.COUNT = Math.max(1, l3Controls().length);
        var L=LVL3, R=L.R_MID, SX=L.SCALE_X;
        // дуга-трек — тот же визуальный язык, что у ползунка L4
        var aLeft=sliderAngleForX(SLIDER_MARGIN), aRight=sliderAngleForX(W_RING-SLIDER_MARGIN);
        var xL=(CX+Math.cos(aLeft)*R*SX).toFixed(2),  yL=(CY-Math.sin(aLeft)*R).toFixed(2);
        var xR=(CX+Math.cos(aRight)*R*SX).toFixed(2), yR=(CY-Math.sin(aRight)*R).toFixed(2);
        var rx=(R*SX).toFixed(2), ry=R.toFixed(2);
        textSvg3.innerHTML = '<path d="M'+xL+','+yL+' A'+rx+','+ry+' 0 0,1 '+xR+','+yR+'" fill="none" '
                           + 'stroke="rgba(255,255,255,0.08)" stroke-width="3" stroke-linecap="round"/>';
        // кнопка в центре дуги — как «бегунок», но с глифом
        var a=L.CENTER_ANGLE;
        var px=CX+Math.cos(a)*R*SX, py=CY-Math.sin(a)*R;
        var playing=isPlaying();
        var glyph = playing
            ? '<rect x="9" y="7.5" width="3" height="11" rx="1.2" fill="#111"/><rect x="14" y="7.5" width="3" height="11" rx="1.2" fill="#111"/>'
            : '<path d="M10.5,7.2 L19,13 L10.5,18.8 Z" fill="#111"/>';
        var svg='<svg viewBox="0 0 26 26" width="26" height="26">'
              + '<circle cx="13" cy="13" r="12" fill="#fff" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));"/>'
              + glyph + '</svg>';
        itemsEl3.innerHTML = '<div class="ri" data-player="1" style="left:'+(px-26)+'px;top:'+(py-26)+'px;'
                           + 'width:52px;height:52px;opacity:1;">'+svg+'</div>';
    }

    // --- L3: «чем управлять у выбранного» — единая модель ---
    // Один список для всего: параметры режима, регуляторы музыки, кнопка плеера.
    // Благодаря этому уровень всегда означает одно и то же, а музыка получает
    // громкость/перемотку/реакцию тем же механизмом, что и параметры режимов.
    function domCtrl(id,label,fmt){
        var el=document.getElementById(id); if(!el) return null;
        return {kind:'ctrl', label:label, el:el, fmt:fmt||null};
    }
    function l3Controls(){
        var d=l2Data(), it=activeL2Item();
        if (d.kind==='modes' && it){
            var defs=G('modeParamDefs');
            if (!defs || !defs[it.key]) return [];
            return defs[it.key].map(function(def){ return {kind:'param', label:def.label, def:def, mode:it.key}; });
        }
        if (d.kind==='tracks'){
            var out=[{kind:'button', label:'Воспроизведение'}];
            var v=domCtrl('bgmVol','Громкость','pct'); if(v) out.push(v);
            return out;
        }
        if (d.kind==='flow'){
            var o2=[{kind:'button', label:'Воспроизведение'}];
            var mv=domCtrl('musicVol','Громкость','pct'); if(mv) o2.push(mv);
            var ms=domCtrl('musicSeek','Перемотка','time'); if(ms) o2.push(ms);
            var mp=domCtrl('musicPulse','Реакция','pct'); if(mp) o2.push(mp);
            return o2;
        }
        return [];
    }
    function l3Idx(){
        var n=l3Controls().length; if(!n) return 0;
        var i=Math.round(lvl3Offset)%n; return ((i%n)+n)%n;
    }
    function activeControl(){ var c=l3Controls(); return c.length? c[l3Idx()] : null; }
    function paramDefs(){ return l3Controls(); }   // совместимость с остальным кодом

    // --- L4: чтение/запись реального значения ---
    function sliderTarget(){
        var d=l2Data();
        if (d.kind==='settings'){
            var s=SETTINGS[l2Idx()]; if(!s) return null;
            return {type:'setting', s:s};
        }
        var c=activeControl();
        if (!c) return null;
        if (c.kind==='param') return {type:'param', def:c.def, mode:c.mode};
        if (c.kind==='ctrl')  return {type:'ctrl', c:c};
        return null;   // кнопка — ползунка нет
    }
    function realGet(){
        var t=sliderTarget(); if(!t) return 0.5;
        if (t.type==='setting'){
            var v=t.s.get(); if(v==null) return 0.5;
            return Math.max(0,Math.min(1,(v-t.s.min)/(t.s.max-t.s.min)));
        }
        if (t.type==='ctrl'){
            var el=t.c.el, mn=+el.min||0, mx=+el.max||100;
            if (mx<=mn) return 0;
            return Math.max(0,Math.min(1,((+el.value||0)-mn)/(mx-mn)));
        }
        var mp=G('modeParams'); if(!mp||!mp[t.mode]) return 0.5;
        var cur=mp[t.mode][t.def.key];
        if (t.def.type==='buttons'){
            var n=t.def.options.length; if(n<2) return 0;
            return Math.max(0,Math.min(1,(cur||0)/(n-1)));
        }
        if (cur==null) return 0.5;
        return Math.max(0,Math.min(1,(cur-t.def.min)/(t.def.max-t.def.min)));
    }
    function realSet(v){
        v=Math.max(0,Math.min(1,v));
        var t=sliderTarget(); if(!t) return;
        try{
            if (t.type==='setting'){ t.s.set(t.s.min+(t.s.max-t.s.min)*v); return; }
            if (t.type==='ctrl'){
                var el=t.c.el, mn=+el.min||0, mx=+el.max||100, st=+el.step||1;
                var raw=mn+(mx-mn)*v;
                el.value = Math.round(raw/st)*st;
                // штатные обработчики приложения — громкость и перемотка идут их путём
                el.dispatchEvent(new Event('input',{bubbles:true}));
                el.dispatchEvent(new Event('change',{bubbles:true}));
                return;
            }
            var mp=G('modeParams'); if(!mp||!mp[t.mode]) return;
            if (t.def.type==='buttons'){
                var n=t.def.options.length;
                mp[t.mode][t.def.key]=Math.round(v*(n-1));
            } else {
                var raw2=t.def.min+(t.def.max-t.def.min)*v;
                var st2=t.def.step||0.1;
                mp[t.mode][t.def.key]=Math.round(raw2/st2)*st2;
            }
            var is3D=G('currentScene')==='3d';
            if (G('activeTool')==='settings'){
                if (is3D && G('buildModeSettings3D')) buildModeSettings3D();
                else if (!is3D && G('buildCurrentModeSettings') && t.mode===G('currentMode')){
                    buildCurrentModeSettings(); if(G('enhanceSliders'))enhanceSliders();
                }
            }
        }catch(e){}
    }
    function fmtSec(s){ s=Math.max(0,Math.round(s||0)); var m=Math.floor(s/60), r=s%60; return m+':'+(r<10?'0':'')+r; }
    // Подпись активного параметра/настройки — для L4 (ступени у кнопочных)
    function sliderCaption(){
        var t2=sliderTarget(); if(!t2) return '';
        if (t2.type==='setting'){ var v=t2.s.get(); return t2.s.label+(v!=null?' '+(+v).toFixed(t2.s.defer?0:2):''); }
        if (t2.type==='ctrl'){
            var el=t2.c.el, val=+el.value||0;
            if (t2.c.fmt==='pct')  return t2.c.label+' '+Math.round(val)+'%';
            if (t2.c.fmt==='time'){
                var m=Math.floor(val/60), s=Math.floor(val%60);
                return t2.c.label+' '+m+':'+(s<10?'0':'')+s;
            }
            return t2.c.label+' '+val;
        }
        var mp=G('modeParams');
        if (t2.def.type==='buttons'){
            var i=(mp&&mp[t2.mode]&&mp[t2.mode][t2.def.key])||0;
            return t2.def.label+': '+(t2.def.options[i]||'');
        }
        var cur=mp&&mp[t2.mode]?mp[t2.mode][t2.def.key]:null;
        return t2.def.label+(cur!=null?' '+(+cur).toFixed(2):'');
    }

    // === Состояния ===
    var isOpen = false;
    var lvl1Offset = 0, lvl1Vel = 0, lvl1Dragging = false;
    var lvl1DragStartX = 0, lvl1DragStartOff = 0, lvl1LastX = 0, lvl1LastTime = 0;
    var lvl2Offset = 0, lvl2Vel = 0, lvl2Dragging = false;
    var lvl2DragStartX = 0, lvl2DragStartOff = 0, lvl2LastX = 0, lvl2LastTime = 0;
    var lvl3Offset = 0, lvl3Vel = 0, lvl3Dragging = false;
    var lvl3DragStartX = 0, lvl3DragStartOff = 0, lvl3LastX = 0, lvl3LastTime = 0;
    var lvl4Dragging = false;
    var playerTap = {active:false, moved:false, x:0, y:0, t:0};  // тап по кнопке плеера
    var ringTap   = {active:false, moved:false, x:0, y:0, t:0};  // тап по второму кольцу
    var focusLevel = 1;   // уровень, с которым человек работает сейчас — он ярче остальных
    var sliderBubbleUntil = 0;   // пузырёк значения держится ещё чуть-чуть после отпускания
    var sliderDisplay = 0.5; // сглаженное отображаемое значение ползунка
    var _lastParamKey = null;
    var activeLevel = null;
    // L2 виден когда активен toolModes
    function l2Visible(){ return l2Data().items.length>0; }
    function syncL2Count(){ var n=l2Data().items.length; if(n>0) LVL2.COUNT=n; }

    // === DOM ===
    var gripEl = document.getElementById('grip');
    var menuEl = document.getElementById('radialMenu');
    var containerEl = document.getElementById('ringContainer');
    var itemsEl = document.getElementById('ringItems');
    var itemsEl2 = document.getElementById('ringItems2');
    var itemsEl3 = document.getElementById('ringItems3');
    var textSvg3 = document.getElementById('textSvg3');
    var sliderSvg4 = document.getElementById('sliderSvg4');
    var swipeEl = document.getElementById('swipeZone');
    // Подложка: мягкое затемнение от низа — отделяет интерфейс от холста
    // и разом чинит читаемость подписей, иконок и дуг поверх ярких частиц.
    (function(){
        if (menuEl && !document.getElementById('ringBackdrop')){
            var b=document.createElement('div');
            b.id='ringBackdrop'; b.className='ring-backdrop';
            menuEl.insertBefore(b, menuEl.firstChild);
        }
    })();
    // Подпись вынесена НАД кольцами: во внутреннем круге её перекрывало ушко-хват,
    // а сверху пустует половина экрана и текст ни с чем не сталкивается.
    var centerEl = (function(){
        var c = document.getElementById('ringCenter');
        if (!c && containerEl){
            c = document.createElement('div');
            c.id='ringCenter'; c.className='ring-center';
            containerEl.appendChild(c);
        }
        return c;
    })();
    var bgSvg = document.getElementById('ringBg');

    // === Фоновая дуга ===
    // Спица выбора: тонкий луч в верхней точке и каретка на конце.
    // Объясняет механику без слов — «то, что на этой линии, и есть выбранное».
    // Плюс риски между группами режимов (ручные / автоматические).
    function selectionOverlay(){
        var a = LVL1.CENTER_ANGLE;
        var rIn = LVL1.R_IN - 6;
        var deepest = l4Visible() ? LVL4.R_OUT : (l3Visible() ? LVL3.R_OUT : (l2Visible() ? LVL2.R_OUT : LVL1.R_OUT));
        var rOut = deepest + 4;
        // Центральный луч и каретку убрали: они давали бледную линию по центру
        // и двоились с шевроном ушка-хвата. «Выбрано то, что сверху» и так ясно
        // из верхней позиции и подписи. Оставляем только риски между группами.
        var s = '';
        // риски между группами на кольце режимов
        var d=l2Data();
        if (d.kind==='modes' && d.items.length>1){
            var n=d.items.length, SA=LVL2.SECTOR_ANGLE, CA=LVL2.CENTER_ANGLE;
            for (var i=1;i<n;i++){
                if (d.items[i].group===d.items[i-1].group) continue;
                var rel=(i-0.5)-lvl2Offset;
                while(rel<-n/2) rel+=n;
                while(rel> n/2) rel-=n;
                if (Math.abs(rel)>2.4) continue;
                var ga=CA+rel*SA;
                var gx1=(CX+Math.cos(ga)*LVL2.R_IN*LVL2.SCALE_X).toFixed(1);
                var gy1=(CY-Math.sin(ga)*LVL2.R_IN).toFixed(1);
                var gx2=(CX+Math.cos(ga)*LVL2.R_OUT*LVL2.SCALE_X).toFixed(1);
                var gy2=(CY-Math.sin(ga)*LVL2.R_OUT).toFixed(1);
                var op=Math.max(0,0.35*(1-Math.abs(rel)/2.4)).toFixed(2);
                s += '<line x1="'+gx1+'" y1="'+gy1+'" x2="'+gx2+'" y2="'+gy2+'" '
                   + 'stroke="rgba(255,255,255,'+op+')" stroke-width="1"/>';
            }
        }
        return s;
    }

    function drawBgs() {
        var lvl = LVL1;
        var a1 = lvl.CENTER_ANGLE - lvl.VISIBLE_SWEEP/2;
        var a2 = lvl.CENTER_ANGLE + lvl.VISIBLE_SWEEP/2;
        var rx_out = lvl.R_OUT * lvl.SCALE_X, ry_out = lvl.R_OUT;
        var rx_in  = lvl.R_IN  * lvl.SCALE_X, ry_in  = lvl.R_IN;
        var x1_out = CX + Math.cos(a1) * rx_out;
        var y1_out = CY - Math.sin(a1) * ry_out;
        var x2_out = CX + Math.cos(a2) * rx_out;
        var y2_out = CY - Math.sin(a2) * ry_out;
        var x1_in = CX + Math.cos(a1) * rx_in;
        var y1_in = CY - Math.sin(a1) * ry_in;
        var x2_in = CX + Math.cos(a2) * rx_in;
        var y2_in = CY - Math.sin(a2) * ry_in;
        var large = 1;
        var d = 'M' + x1_out.toFixed(2) + ',' + y1_out.toFixed(2) +
                ' A' + rx_out.toFixed(2) + ',' + ry_out.toFixed(2) + ' 0 ' + large + ',0 ' + x2_out.toFixed(2) + ',' + y2_out.toFixed(2) +
                ' L' + x2_in.toFixed(2) + ',' + y2_in.toFixed(2) +
                ' A' + rx_in.toFixed(2) + ',' + ry_in.toFixed(2) + ' 0 ' + large + ',1 ' + x1_in.toFixed(2) + ',' + y1_in.toFixed(2) +
                ' Z';
        var html = '<path d="' + d + '" fill="rgba(10,8,20,0.92)"/>';
        // L2 band
        if (l2Visible()) {
            var L = LVL2;
            var b1 = L.CENTER_ANGLE - L.VISIBLE_SWEEP/2, b2 = L.CENTER_ANGLE + L.VISIBLE_SWEEP/2;
            var Rxo = L.R_OUT*L.SCALE_X, Ryo = L.R_OUT, Rxi = L.R_IN*L.SCALE_X, Ryi = L.R_IN;
            var X1o=CX+Math.cos(b1)*Rxo, Y1o=CY-Math.sin(b1)*Ryo, X2o=CX+Math.cos(b2)*Rxo, Y2o=CY-Math.sin(b2)*Ryo;
            var X1i=CX+Math.cos(b1)*Rxi, Y1i=CY-Math.sin(b1)*Ryi, X2i=CX+Math.cos(b2)*Rxi, Y2i=CY-Math.sin(b2)*Ryi;
            var d2='M'+X1o.toFixed(2)+','+Y1o.toFixed(2)+' A'+Rxo.toFixed(2)+','+Ryo.toFixed(2)+' 0 1,0 '+X2o.toFixed(2)+','+Y2o.toFixed(2)+' L'+X2i.toFixed(2)+','+Y2i.toFixed(2)+' A'+Rxi.toFixed(2)+','+Ryi.toFixed(2)+' 0 1,1 '+X1i.toFixed(2)+','+Y1i.toFixed(2)+' Z';
            html += '<path d="'+d2+'" fill="rgba(10,8,20,0.6)" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>';
        }
        // L3 band
        if (l3Visible()) {
            var L3 = LVL3;
            var c1 = L3.CENTER_ANGLE - L3.VISIBLE_SWEEP/2, c2 = L3.CENTER_ANGLE + L3.VISIBLE_SWEEP/2;
            var R3xo = L3.R_OUT*L3.SCALE_X, R3yo = L3.R_OUT, R3xi = L3.R_IN*L3.SCALE_X, R3yi = L3.R_IN;
            var Z1o=CX+Math.cos(c1)*R3xo, W1o=CY-Math.sin(c1)*R3yo, Z2o=CX+Math.cos(c2)*R3xo, W2o=CY-Math.sin(c2)*R3yo;
            var Z1i=CX+Math.cos(c1)*R3xi, W1i=CY-Math.sin(c1)*R3yi, Z2i=CX+Math.cos(c2)*R3xi, W2i=CY-Math.sin(c2)*R3yi;
            var d3='M'+Z1o.toFixed(2)+','+W1o.toFixed(2)+' A'+R3xo.toFixed(2)+','+R3yo.toFixed(2)+' 0 1,0 '+Z2o.toFixed(2)+','+W2o.toFixed(2)+' L'+Z2i.toFixed(2)+','+W2i.toFixed(2)+' A'+R3xi.toFixed(2)+','+R3yi.toFixed(2)+' 0 1,1 '+Z1i.toFixed(2)+','+W1i.toFixed(2)+' Z';
            html += '<path d="'+d3+'" fill="rgba(10,8,20,0.4)" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>';
        }
        bgSvg.innerHTML = html + selectionOverlay();
    }

    // === Рендеринг уровня (без поворота иконок) ===
    function renderRing(L, offset, items, container, baseOpacity) {
        var html = '';
        var count = L.COUNT, R_MID = L.R_MID, SCALE_X = L.SCALE_X;
        var CENTER_ANGLE = L.CENTER_ANGLE, SECTOR_ANGLE = L.SECTOR_ANGLE;
        for (var i=0; i<count; i++) {
            var relIndex = i - offset;
            while (relIndex < -count/2) relIndex += count;
            while (relIndex > count/2) relIndex -= count;
            var dist = Math.abs(relIndex);
            if (dist > 2.5) continue;
            var opacity = (dist <= 1.5) ? baseOpacity : (dist >= 2.5 ? 0 : baseOpacity - (dist - 1.5) / (2.5 - 1.5) * baseOpacity);
            var isActive = dist < 0.3;
            var iconColor = isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,'+(0.15+opacity*0.2).toFixed(2)+')';
            var angle = CENTER_ANGLE + relIndex * SECTOR_ANGLE;
            var px = CX + Math.cos(angle) * R_MID * SCALE_X;
            var py = CY - Math.sin(angle) * R_MID;
            var scale = 1 - (dist / 2.5) * 0.15;
            var activeClass = isActive ? 'active' : '';
            var isText = !items[i].icon;
            var content = isText ? '<span class="ri-text">'+items[i].label+'</span>' : items[i].icon;
            // Иконки — квадрат 52×52 с центром в (px,py). Текст — центрируем по (px,py).
            var boxW = isText ? 100 : 52;
            var boxH = isText ? 40 : 52;
            html += '<div class="ri ' + activeClass + '" data-idx="'+i+'" style="'
                +'left:'+(px-boxW/2)+'px;top:'+(py-boxH/2)+'px;'
                +'width:'+boxW+'px;height:'+boxH+'px;'
                +(isText ? 'text-align:center;' : '')
                +'transform:scale('+scale.toFixed(3)+');'
                +'opacity:'+opacity.toFixed(3)+';'
                +'color:'+iconColor+';'
                +'">'+content+'</div>';
        }
        container.innerHTML = html;
    }

    // === Рендер текста L3 по дуге (SVG textPath) ===
    function renderCurvedText(L, offset, items) {
        var count = items.length;
        if (!count) { textSvg3.innerHTML = ''; return; }
        var R = L.R_MID * 0.969, SX = L.SCALE_X, CA = L.CENTER_ANGLE, SA = L.SECTOR_ANGLE;
        // Раньше все подписи рисовались длинным изогнутым текстом и уезжали за
        // край экрана. Теперь имя параметра и так видно в подписи над кольцами,
        // поэтому текстом показываем только активный (он всегда сверху по центру),
        // а соседние — засечками: видно, сколько их и где ты находишься.
        var defs = '', out = '';
        for (var i=0; i<count; i++) {
            var rel = i - offset;
            while (rel < -count/2) rel += count;
            while (rel > count/2) rel -= count;
            var dist = Math.abs(rel);
            if (dist > 2.2) continue;
            var centerA = CA + rel * SA;
            if (dist < 0.45) {
                var halfSpan = SA * 0.48;
                var aStart = centerA + halfSpan, aEnd = centerA - halfSpan;
                var x1=(CX+Math.cos(aStart)*R*SX).toFixed(2), y1=(CY-Math.sin(aStart)*R).toFixed(2);
                var x2=(CX+Math.cos(aEnd)*R*SX).toFixed(2),   y2=(CY-Math.sin(aEnd)*R).toFixed(2);
                defs += '<path id="l3path'+i+'" d="M'+x1+','+y1+' A'+(R*SX).toFixed(2)+','+R.toFixed(2)+' 0 0,1 '+x2+','+y2+'" fill="none"/>';
                out  += '<text fill="rgba(255,255,255,0.95)" font-size="16" font-weight="500" '
                      + 'font-family="-apple-system,sans-serif" style="paint-order:stroke;stroke:rgba(0,0,0,0.55);stroke-width:3px;">'
                      + '<textPath href="#l3path'+i+'" startOffset="50%" text-anchor="middle">'+items[i].label+'</textPath></text>';
            } else {
                // Засечки ставим с половинным шагом — при полном они уезжали
                // за край экрана (проверено: -91 и 481 при ширине 390).
                var op = Math.max(0, 1 - (dist-0.45)/2.1);
                var dotA = CA + rel * SA * 0.5;
                var tx = (CX + Math.cos(dotA)*R*SX).toFixed(2);
                var ty = (CY - Math.sin(dotA)*R).toFixed(2);
                out += '<circle cx="'+tx+'" cy="'+ty+'" r="2.6" fill="rgba(255,255,255,'+(0.15+op*0.45).toFixed(2)+')"/>';
            }
        }
        textSvg3.innerHTML = '<defs>'+defs+'</defs>'+out;
    }

    // === Рендер ползунка L4 (дуга + белый кружок) ===
    var SLIDER_MARGIN = 25; // отступ от краёв экрана
    // Угол на дуге L4 по X-координате (обратная задача эллипса)
    function sliderAngleForX(targetX) {
        var L = LVL4, R = L.R_MID, SX = L.SCALE_X;
        // x = CX + cos(a)*R*SX  →  cos(a) = (x-CX)/(R*SX)
        var c = (targetX - CX) / (R * SX);
        c = Math.max(-1, Math.min(1, c));
        return Math.acos(c); // угол в [0..PI], верхняя полудуга
    }
    // Ползунок рисуется на первом свободном кольце: если третий уровень пуст
    // (как у Настроек), он занимает его место, а не оставляет пустое кольцо между
    // собой и вторым уровнем. Так он снова визуально «в своей полосе».
    function sliderLevel(){ return l3Visible() ? LVL4 : LVL3; }
    function renderSlider4() {
        if (!l4Visible()) { sliderSvg4.innerHTML = ''; return; }
        var L = sliderLevel(), R = L.R_MID, SX = L.SCALE_X;
        // Края трека — по фактической ширине экрана с отступом
        var aLeft = sliderAngleForX(SLIDER_MARGIN);            // левый край (больший угол)
        var aRight = sliderAngleForX(W_RING - SLIDER_MARGIN);  // правый край (меньший угол)
        var xL = (CX + Math.cos(aLeft)*R*SX).toFixed(2), yL = (CY - Math.sin(aLeft)*R).toFixed(2);
        var xR = (CX + Math.cos(aRight)*R*SX).toFixed(2), yR = (CY - Math.sin(aRight)*R).toFixed(2);
        var rx = (R*SX).toFixed(2), ry = R.toFixed(2);
        var track = '<path d="M'+xL+','+yL+' A'+rx+','+ry+' 0 0,1 '+xR+','+yR+'" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3" stroke-linecap="round"/>';
        // Позиция кружка по сглаженному значению
        var v = sliderDisplay;
        var aThumb = aLeft - (aLeft - aRight) * v;
        var tx = (CX + Math.cos(aThumb)*R*SX).toFixed(2), ty = (CY - Math.sin(aThumb)*R).toFixed(2);
        var thumb = '<circle cx="'+tx+'" cy="'+ty+'" r="7.7" fill="#fff" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));"/>';
        // Значение всплывает прямо у бегунка и едет за пальцем — обратная связь
        // там, где палец, а не на другом конце экрана.
        var bubble = '';
        if (lvl4Dragging || performance.now() < sliderBubbleUntil) {
            var cap = sliderCaption();
            if (cap) {
                var w = Math.max(46, cap.length*7.2+16);
                var bx = Math.min(W_RING-w/2-4, Math.max(w/2+4, +tx));
                var by = +ty - 30;
                bubble = '<g opacity="0.96">'
                  + '<rect x="'+(bx-w/2).toFixed(1)+'" y="'+(by-11).toFixed(1)+'" width="'+w.toFixed(1)+'" height="22" rx="11" '
                  + 'fill="rgba(10,10,12,0.82)" stroke="rgba(255,255,255,0.14)" stroke-width="1"/>'
                  + '<text x="'+bx.toFixed(1)+'" y="'+(by+4).toFixed(1)+'" text-anchor="middle" fill="#fff" '
                  + 'font-size="12" font-weight="600" font-family="-apple-system,sans-serif">'+cap+'</text></g>';
            }
        }
        sliderSvg4.innerHTML = track + thumb + bubble;
    }

    // Подпись в центре круга: где я нахожусь и что сейчас выбрано.
    // Решает сразу две проблемы — навигацию по четырём уровням и отсутствие
    // числовой обратной связи у дугового ползунка.
    function centerText(){
        var cat = L1_LABEL[activeL1()] || '';
        var d = l2Data(), it = activeL2Item(), st = sliderTarget();
        // Работаем с параметром (уровни 3–4) → крупно значение, а имя режима
        // уходит в верхнюю строку-путь: «Инструменты · Вихрь» / «Сила 1.8».
        if ((focusLevel===3 || focusLevel===4) && st){
            var crumb = (d.kind==='modes' && it) ? (cat+' · '+it.label) : cat;
            return {cat:crumb, val:sliderCaption()};
        }
        // Выбираем элемент → крупно его имя (режимы больше не угадываются по глифу)
        // у режимов в верхней строке показываем группу — структура вкладок
        // с десктопа возвращается без лишнего уровня
        if (it) return {cat: (it.group ? cat+' · '+it.group : cat), val:it.label};
        return {cat:cat, val: d.items.length===0 ? 'нет настроек' : ''};
    }
    // Активное кольцо контрастное, остальные приглушены — взгляд сразу
    // понимает, на каком уровне идёт работа.
    function dimFor(level){ return focusLevel===level ? 1 : 0.5; }

    function renderCenter(){
        if (!centerEl) return;
        var c = centerText();
        centerEl.innerHTML = '<div class="rc-cat">'+c.cat+'</div><div class="rc-val">'+c.val+'</div>';
    }

    function renderAll() {
        drawBgs();
        renderRing(LVL1, lvl1Offset, innerItems, itemsEl, dimFor(1));
        syncL2Count();
        if (l2Visible()) {
            renderRing(LVL2, lvl2Offset, l2Data().items, itemsEl2, dimFor(2));
        } else {
            itemsEl2.innerHTML = '';
        }
        if (isButtonCtrl()) {
            renderPlayerL3();
        } else if (l3Visible()) {
            var items3 = l3Items();
            LVL3.COUNT = items3.length;
            itemsEl3.innerHTML = '';
            renderCurvedText(LVL3, lvl3Offset, items3);
        } else {
            itemsEl3.innerHTML = '';
            textSvg3.innerHTML = '';
        }
        renderSlider4();
        // третий и четвёртый уровни рисуются в SVG — приглушаем целиком
        if (textSvg3)   textSvg3.style.opacity   = dimFor(3);
        if (itemsEl3)   itemsEl3.style.opacity   = dimFor(3);
        if (sliderSvg4) sliderSvg4.style.opacity = dimFor(4);
        if (menuEl) menuEl.classList.toggle('open', isOpen);
        // Ушко в открытом состоянии встаёт вплотную над последним ВИДИМЫМ кольцом
        // (у Настроек оно ближе, у Инструментов — дальше), а не на фиксированной высоте.
        if (gripEl){
            if (isOpen){
                var deepest = l4Visible() ? sliderLevel().R_OUT
                            : l3Visible() ? LVL3.R_OUT
                            : l2Visible() ? LVL2.R_OUT : LVL1.R_OUT;
                gripEl.style.bottom = ((deepest - 18) * ringFit + 6).toFixed(0) + 'px';
            } else {
                gripEl.style.bottom = '';
            }
        }
        renderCenter();
    }

    // Применение выбора L2 по правилу категории
    var _settleAt = 0;
    function applyByPolicy(){
        var moving = lvl2Dragging || Math.abs(lvl2Vel) >= 0.001;
        if (moving){ _settleAt = 0; return; }
        var pol = POLICY[l2Data().kind] || 'now';
        if (pol === 'tap') return;                       // ждём явного тапа
        if (pol === 'now'){ applyL2(); return; }
        if (!_settleAt) _settleAt = performance.now();   // 'delay': даём кольцу постоять
        if (performance.now() - _settleAt > 250) applyL2();
    }

    // Лёгкий щелчок, когда под пальцем сменился центральный элемент
    var _tickIdx = null;
    function hapticTick(){
        var i = l2Idx();
        if (_tickIdx === null){ _tickIdx = i; return; }
        if (i !== _tickIdx){
            _tickIdx = i;
            if ((lvl2Dragging || Math.abs(lvl2Vel) > 0.001) && navigator.vibrate) {
                try { navigator.vibrate(8); } catch(e){}
            }
        }
    }

    // 🌿 Смена категории L1 → сбрасываем L2/L3, т.к. у категорий разная длина
    var _lastCategory = null;
    function syncCategory(){
        var k = activeL1();
        if (k === _lastCategory) return;
        _lastCategory = k;
        lvl2Offset = 0; lvl2Vel = 0;
        lvl3Offset = 0; lvl3Vel = 0;
        syncL2Count();
        _lastApplied = null;                 // разрешаем применить выбор в новой категории
        var d = l2Data();
        // встаём на текущий выбор приложения, чтобы меню отражало реальность
        try{
            var want = null;
            if (d.kind==='modes')    want = (G('currentScene')==='3d') ? G('testMode3D') : G('currentMode');
            else if (d.kind==='palettes') want = G('currentPalette');
            else if (d.kind==='tracks')   want = String(G('bgmIdx'));
            if (want!=null){
                for (var i=0;i<d.items.length;i++) if (d.items[i].key===want){ lvl2Offset=i; break; }
            }
        }catch(e){}
        _lastApplied = activeL1()+'|'+((activeL2Item()||{}).key);  // не переприменять то, что уже стоит
        _lastParamKey = null;
    }

    // === Прилипание ===
    function snapLevel(offset, count, velocityRef, damping) {
        if (Math.abs(velocityRef) < 0.01) {
            var target = Math.round(offset);
            target = ((target % count) + count) % count;
            var diff = target - offset;
            if (diff > count/2) diff -= count;
            else if (diff < -count/2) diff += count;
            if (Math.abs(diff) > 0.001) {
                offset += diff * damping;
                velocityRef = 0;
            } else {
                offset = target;
                velocityRef = 0;
            }
        }
        return offset;
    }

    // === Физика ===
    var rafId = null;
    function physicsLoop() {
        if (!lvl1Dragging) {
            lvl1Vel *= 0.92;
            if (Math.abs(lvl1Vel) < 0.001) lvl1Vel = 0;
            lvl1Offset += lvl1Vel * 0.016;
            lvl1Offset = snapLevel(lvl1Offset, LVL1.COUNT, lvl1Vel, 0.15);
            while (lvl1Offset < 0) lvl1Offset += LVL1.COUNT;
            while (lvl1Offset >= LVL1.COUNT) lvl1Offset -= LVL1.COUNT;
        }
        if (!lvl2Dragging && l2Visible()) {
            lvl2Vel *= 0.92;
            if (Math.abs(lvl2Vel) < 0.001) lvl2Vel = 0;
            lvl2Offset += lvl2Vel * 0.016;
            lvl2Offset = snapLevel(lvl2Offset, LVL2.COUNT, lvl2Vel, 0.15);
            while (lvl2Offset < 0) lvl2Offset += LVL2.COUNT;
            while (lvl2Offset >= LVL2.COUNT) lvl2Offset -= LVL2.COUNT;
        }
        if (!lvl3Dragging && l3Visible()) {
            var c3 = LVL3.COUNT;
            lvl3Vel *= 0.92;
            if (Math.abs(lvl3Vel) < 0.001) lvl3Vel = 0;
            lvl3Offset += lvl3Vel * 0.016;
            lvl3Offset = snapLevel(lvl3Offset, c3, lvl3Vel, 0.15);
            while (lvl3Offset < 0) lvl3Offset += c3;
            while (lvl3Offset >= c3) lvl3Offset -= c3;
        }
        // Плавное подтягивание ползунка к целевому значению
        if (l4Visible()) {
            var pk = activeParamKey();
            if (pk !== _lastParamKey) {
                _lastParamKey = pk;
                sliderDisplay = getSliderVal(); // мгновенно при смене параметра
            }
            var target = getSliderVal();
            var d = target - sliderDisplay;
            if (Math.abs(d) > 0.0005) {
                sliderDisplay += d * (lvl4Dragging ? 0.35 : 0.2);
            } else {
                sliderDisplay = target;
            }
        }
        // 🌿 МОСТ: связка с приложением каждый кадр (дёшево, всё на сравнениях)
        syncCategory();      // смена пункта L1 → пересобрать L2
        applyByPolicy();     // применяем по правилу категории (сразу / с паузой / по тапу)
        hapticTick();        // щелчок под пальцем при перескоке на соседний элемент
        if (!lvl4Dragging) applyPendingGap();                        // «Шаг» — только на отпускании
        renderAll();
        rafId = requestAnimationFrame(physicsLoop);
    }

    // === Обработка событий (инвертированное направление) ===
    // При свайпе влево (dx<0) offset должен уменьшаться → иконки едут вправо.
    // Определяем уровень по расстоянию от центра
    function getLevelFromPoint(clientX, clientY) {
        var rect = containerEl.getBoundingClientRect();
        var x = clientX - rect.left, y = clientY - rect.top;
        var r = Math.sqrt(Math.pow((x-CX)/LVL1.SCALE_X, 2) + Math.pow(y-CY, 2));
        var sl = l4Visible() ? sliderLevel() : null;
        if (sl && r >= sl.R_IN && r <= sl.R_OUT) return 4;
        if (l3Visible() && r >= LVL3.R_IN && r <= LVL3.R_OUT) return 3;
        if (l2Visible() && r >= LVL2.R_IN && r <= LVL2.R_OUT) return 2;
        if (r >= LVL1.R_IN && r <= LVL1.R_OUT) return 1;
        return 0;
    }

    function onPointerDown(e) {
        if (!isOpen) return;
        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        var clientY = e.touches ? e.touches[0].clientY : e.clientY;
        activeLevel = getLevelFromPoint(clientX, clientY);
        if (activeLevel>=1 && activeLevel<=4) focusLevel = activeLevel;
        if (activeLevel === 4) {
            lvl4Dragging = true;
            updateSliderFromPointer(clientX, clientY);
        } else if (activeLevel === 3 && isButtonCtrl()) {
            playerTap.active=true; playerTap.moved=false;
            playerTap.x=clientX; playerTap.y=clientY; playerTap.t=performance.now();
        } else if (activeLevel === 3) {
            lvl3Dragging = true;
            lvl3DragStartX = clientX; lvl3DragStartOff = lvl3Offset;
            lvl3LastX = clientX; lvl3LastTime = performance.now(); lvl3Vel = 0;
        } else if (activeLevel === 2) {
            lvl2Dragging = true;
            lvl2DragStartX = clientX; lvl2DragStartOff = lvl2Offset;
            lvl2LastX = clientX; lvl2LastTime = performance.now(); lvl2Vel = 0;
            ringTap.active=true; ringTap.moved=false;
            ringTap.x=clientX; ringTap.y=clientY; ringTap.t=performance.now();
        } else {
            lvl1Dragging = true;
            lvl1DragStartX = clientX; lvl1DragStartOff = lvl1Offset;
            lvl1LastX = clientX; lvl1LastTime = performance.now(); lvl1Vel = 0;
        }
    }

    function updateSliderFromPointer(clientX, clientY) {
        var rect = containerEl.getBoundingClientRect();
        var scaleX = 390 / rect.width, scaleY = H_RING / rect.height;
        var x = (clientX - rect.left) * scaleX, y = (clientY - rect.top) * scaleY;
        var a = Math.atan2(CY - y, (x - CX) / LVL4.SCALE_X);
        if (a < 0) a += Math.PI * 2;
        var aLeft = sliderAngleForX(SLIDER_MARGIN);
        var aRight = sliderAngleForX(W_RING - SLIDER_MARGIN);
        var v = (aLeft - a) / (aLeft - aRight);
        setSliderVal(v); // целевое значение; отображение догоняет в physicsLoop
    }

    function onPointerMove(e) {
        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        var clientY = e.touches ? e.touches[0].clientY : e.clientY;
        var now = performance.now();
        if (playerTap.active) {
            var pdx=clientX-playerTap.x, pdy=clientY-playerTap.y;
            if (pdx*pdx+pdy*pdy > 100) playerTap.moved = true;   // >10px — это свайп, не тап
        }
        if (ringTap.active) {
            var rdx=clientX-ringTap.x, rdy=clientY-ringTap.y;
            if (rdx*rdx+rdy*rdy > 100) ringTap.moved = true;
        }
        if (lvl4Dragging) {
            updateSliderFromPointer(clientX, clientY);
            return;
        }
        if (lvl3Dragging) {
            var dx3 = clientX - lvl3DragStartX;
            var c3 = LVL3.COUNT;
            lvl3Offset = lvl3DragStartOff + dx3 / 80;
            while (lvl3Offset < 0) lvl3Offset += c3;
            while (lvl3Offset >= c3) lvl3Offset -= c3;
            var dt3 = now - lvl3LastTime;
            if (dt3 > 0) lvl3Vel = (clientX - lvl3LastX) / 80 / (dt3/1000) * 0.3;
            lvl3LastX = clientX; lvl3LastTime = now;
            renderAll();
        } else if (lvl2Dragging) {
            var dx2 = clientX - lvl2DragStartX;
            lvl2Offset = lvl2DragStartOff + dx2 / 80;
            while (lvl2Offset < 0) lvl2Offset += LVL2.COUNT;
            while (lvl2Offset >= LVL2.COUNT) lvl2Offset -= LVL2.COUNT;
            var dt2 = now - lvl2LastTime;
            if (dt2 > 0) lvl2Vel = (clientX - lvl2LastX) / 80 / (dt2/1000) * 0.3;
            lvl2LastX = clientX; lvl2LastTime = now;
            renderAll();
        } else if (lvl1Dragging) {
            var dx = clientX - lvl1DragStartX;
            lvl1Offset = lvl1DragStartOff + dx / 80;
            while (lvl1Offset < 0) lvl1Offset += LVL1.COUNT;
            while (lvl1Offset >= LVL1.COUNT) lvl1Offset -= LVL1.COUNT;
            var dt = now - lvl1LastTime;
            if (dt > 0) lvl1Vel = (clientX - lvl1LastX) / 80 / (dt/1000) * 0.3;
            lvl1LastX = clientX; lvl1LastTime = now;
            renderAll();
        }
    }

    function onPointerUp(e) {
        if (lvl4Dragging) sliderBubbleUntil = performance.now() + 900;
        if (playerTap.active) {
            var wasTap = !playerTap.moved && (performance.now()-playerTap.t < 700);
            playerTap.active = false;
            if (wasTap) { togglePlayer(); renderAll(); }
        }
        if (ringTap.active) {
            var wasTap2 = !ringTap.moved && (performance.now()-ringTap.t < 700);
            ringTap.active = false;
            if (wasTap2) { applyL2(true); renderAll(); }   // тап подтверждает выбор
        }
        lvl1Dragging = false;
        lvl2Dragging = false;
        lvl3Dragging = false;
        lvl4Dragging = false;
        activeLevel = null;
    }

    swipeEl.addEventListener('touchstart', onPointerDown, {passive:true});
    swipeEl.addEventListener('touchmove', onPointerMove, {passive:true});
    swipeEl.addEventListener('touchend', onPointerUp);
    swipeEl.addEventListener('touchcancel', onPointerUp);
    swipeEl.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    // === Клики по иконкам ===
    itemsEl.addEventListener('click', function(e) {
        var ri = e.target.closest('.ri');
        if (!ri) return;
        var idx = +ri.dataset.idx;
        var diff = idx - lvl1Offset;
        while (diff > LVL1.COUNT/2) diff -= LVL1.COUNT;
        while (diff < -LVL1.COUNT/2) diff += LVL1.COUNT;
        if (Math.abs(diff) < 0.3) return;
        lvl1Offset += diff;
        while (lvl1Offset < 0) lvl1Offset += LVL1.COUNT;
        while (lvl1Offset >= LVL1.COUNT) lvl1Offset -= LVL1.COUNT;
        lvl1Vel = 0;
        renderAll();
    });

    itemsEl2.addEventListener('click', function(e) {
        var ri = e.target.closest('.ri');
        if (!ri) return;
        var idx = +ri.dataset.idx;
        var diff = idx - lvl2Offset;
        while (diff > LVL2.COUNT/2) diff -= LVL2.COUNT;
        while (diff < -LVL2.COUNT/2) diff += LVL2.COUNT;
        if (Math.abs(diff) < 0.3) return;
        lvl2Offset += diff;
        while (lvl2Offset < 0) lvl2Offset += LVL2.COUNT;
        while (lvl2Offset >= LVL2.COUNT) lvl2Offset -= LVL2.COUNT;
        lvl2Vel = 0;
        renderAll();
    });

    itemsEl3.addEventListener('click', function(e) {
        var ri = e.target.closest('.ri');
        if (!ri) return;
        if (ri.dataset.player) { togglePlayer(); renderAll(); return; }  // кнопка плеера (мышь)
        if (ri.dataset.idx === undefined) return;
        var c3 = LVL3.COUNT;
        var idx = +ri.dataset.idx;
        var diff = idx - lvl3Offset;
        while (diff > c3/2) diff -= c3;
        while (diff < -c3/2) diff += c3;
        if (Math.abs(diff) < 0.3) return;
        lvl3Offset += diff;
        while (lvl3Offset < 0) lvl3Offset += c3;
        while (lvl3Offset >= c3) lvl3Offset -= c3;
        lvl3Vel = 0;
        renderAll();
    });

    // === Grip ===
    gripEl.addEventListener('click', function() {
        isOpen = !isOpen;
        containerEl.classList.toggle('open', isOpen);
        gripEl.classList.toggle('active', isOpen);
        swipeEl.style.pointerEvents = isOpen ? 'auto' : 'none';
        if (isOpen) { renderAll(); if (!rafId) rafId = requestAnimationFrame(physicsLoop); }
    });

    // Старт
    swipeEl.style.pointerEvents = 'none';
    renderAll();
    rafId = requestAnimationFrame(physicsLoop);

    // Тестовый хук (безвреден в бою: только чтение внутреннего состояния)
    window.__radialTest = {
        setL1:function(k){ for(var i=0;i<innerItems.length;i++) if(innerItems[i].key===k){ lvl1Offset=i; lvl1Vel=0; } },
        setL2:function(i){ lvl2Offset=i; lvl2Vel=0; },
        setL3:function(i){ lvl3Offset=i; lvl3Vel=0; },
        tick:function(){ physicsLoop(); },
        l2:function(){ return l2Data(); },
        l3:function(){ return l3Items(); },
        get:function(){ return getSliderVal(); },
        set:function(v){ setSliderVal(v); },
        caption:function(){ return sliderCaption(); },
        l4on:function(){ return l4Visible(); },
        drag4:function(b){ lvl4Dragging=b; },
        pt3:function(){ var a=LVL3.CENTER_ANGLE; return {x:CX+Math.cos(a)*LVL3.R_MID*LVL3.SCALE_X, y:CY-Math.sin(a)*LVL3.R_MID}; },
        lvl:function(x,y){ return getLevelFromPoint(x,y); }
    };

    // Кольца рассчитаны на ширину 390. На узком телефоне (например 360)
    // крайние элементы уходили бы за край — вписываем целиком.
    var ringFit = 1;
    function fitToScreen(){
        ringFit = Math.min(1, (window.innerWidth||W_RING) / (W_RING+10));
        document.documentElement.style.setProperty('--ring-fit', ringFit.toFixed(3));
    }
    fitToScreen();
    window.addEventListener('resize', fitToScreen);
    window.addEventListener('orientationchange', fitToScreen);

    // === Grip: touch-дубль штатного click-обработчика референса ===
    // (isOpen/containerEl/gripEl/swipeEl/renderAll/physicsLoop/rafId — переменные этого же замыкания)
    gripEl.addEventListener('touchend', function(e){
        if (e.cancelable) e.preventDefault();   // подавляем синтетический click → без двойного toggle
        e.stopPropagation();
        isOpen = !isOpen;
        containerEl.classList.toggle('open', isOpen);
        gripEl.classList.toggle('active', isOpen);
        swipeEl.style.pointerEvents = isOpen ? 'auto' : 'none';
        if (isOpen) { renderAll(); if (!rafId) rafId = requestAnimationFrame(physicsLoop); }
    }, {passive:false});

    // === Закрытие по тапу вне меню (замена демо-обработчика .viz) ===
    document.addEventListener('touchstart', function(e){
        if (isOpen && !(e.target.closest && e.target.closest('#radialMenu'))) {
            isOpen = false;
            containerEl.classList.remove('open');
            gripEl.classList.remove('active');
            swipeEl.style.pointerEvents = 'none';
        }
    }, {passive:true});
  }

  function tryInit(){ if (_mq.matches) initRadialMenu(); }

  // Надёжный запуск на мобильном — все точки идемпотентны
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryInit);
  else tryInit();
  window.addEventListener('load', tryInit);
  if (_mq.addEventListener) _mq.addEventListener('change', function(ev){ if(ev.matches) initRadialMenu(); });
  else if (_mq.addListener) _mq.addListener(function(ev){ if(ev.matches) initRadialMenu(); });
})();
