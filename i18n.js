// 🌿 i18n.js — локализация Soundfield (RU по умолчанию, EN опционально)
// Подход: словарь по исходной русской строке. Обходим текстовые узлы и атрибуты,
// подменяем на EN; наблюдатель ловит динамически созданные элементы.
// Непереведённое мягко остаётся на русском. Словарь наращивается батчами.
(function(){
    'use strict';

    // ——— Словарь RU → EN (батч 1) ———
    var EN = {
        // Обвязка / панели
        'Профиль':'Profile','Аккаунт':'Account','Тарифы':'Plans','Настройки':'Settings',
        'О Soundfield':'About Soundfield','Бесплатный тариф':'Free plan','Полный доступ':'Full access',
        'Тест тарифов':'Plan testing','Тест':'Test','Общие':'General','Барьеры':'Barriers',
        'Нет':'None','Круг':'Circle','Квадрат':'Square','Треугольник':'Triangle',
        'Своя палитра':'Custom palette','Счётчик FPS':'FPS counter','Загрузить трек':'Load track',
        'Загрузка 3D...':'Loading 3D...','Коснись пустоты':'Touch the void','Полотно':'Canvas',
        'Визуал':'Visual','Физика':'Physics','Режим':'Mode','Вариант':'Variant','Время':'Time',
        'Возврат':'Return','Захват':'Capture','Инерция':'Inertia','Макс.скор.':'Max speed',
        'Реагирование':'Reactivity','Скрыть интерфейс':'Hide interface','Вращение камеры':'Camera rotation',
        'Зум':'Zoom','Палитра':'Palette','Плеер':'Player','Режимы':'Modes','Бит-машина':'Beat machine',
        'Музыка':'Music','Язык':'Language',
        // Параметры / слайдеры
        'Скорость':'Speed','Масштаб':'Scale','Яркость':'Brightness','Плотность':'Density',
        'Слои':'Layers','Разброс':'Spread','Вращение':'Rotation','Насыщ.':'Sat.','Оттенок':'Hue',
        'Размер':'Size','Наклон':'Tilt','Плоскость':'Flatness','Кольца':'Rings','Лепестки':'Petals',
        'Лучи':'Rays','Амплитуда':'Amplitude','Частота':'Frequency','Пульс':'Pulse','Пульсация':'Pulsation',
        'Глубина':'Depth','Джеты':'Jets','Диск':'Disk','Длина нити':'Thread length','Зазор':'Gap',
        'Закрутка':'Spin','Заряд':'Charge','Затухание':'Decay','Импульс':'Impulse','Интенсивность':'Intensity',
        'Кристалл':'Crystal','Линза':'Lens','Масштаб шума':'Noise scale','Порядок':'Order',
        'Разделение':'Separation','Размер ячейки':'Cell size','Рассеяние':'Scatter','Резкость':'Sharpness',
        'Решётка':'Lattice','Рост':'Growth','Рукава':'Arms','Связи':'Links','Сила':'Force',
        'Скорость волны':'Wave speed','Сплочённость':'Cohesion','Стиль':'Style','Толщина':'Thickness',
        'Ветвление':'Branching','Деформация':'Deformation','Складки':'Folds','Хаос':'Chaos','Волны':'Waves',
        'Голограмма':'Hologram','Тор':'Torus','Тетраэдр':'Tetrahedron','След':'Trail','Мерцание':'Flicker',
        'Удар':'Hit','Шаг':'Step',
        // Режимы
        'Вихрь':'Vortex','Турбулентность':'Turbulence','Электростатика':'Electrostatic','Волна':'Wave',
        'Пульсар':'Pulsar','Фибоначчи':'Fibonacci','Лоренц':'Lorenz','Автомат':'Automaton','Мицелий':'Mycelium',
        'Рой':'Swarm','Дыхание':'Breathing','Мандала':'Mandala','Янтра':'Yantra','Соты':'Honeycomb',
        'Волокна':'Fibers','Сфера':'Sphere','Галактика':'Galaxy','Чёрная дыра':'Black hole','Нейросеть':'Neural net',
        'Звездопад':'Meteors','Туманность':'Nebula','Тоннель':'Tunnel','Потоки':'Streams',
        // Палитры
        'Океан':'Ocean','Закат':'Sunset','Лес':'Forest','Неон':'Neon','Огонь':'Fire','Космос':'Cosmos',
        'Полночь':'Midnight','Конфеты':'Candy','Монохром':'Mono','Северное сияние':'Aurora','Пустыня':'Desert',
        'Лаванда':'Lavender','Тропики':'Tropics','Глубокий космос':'Deep space','Акварель':'Watercolor',
        'Металлик':'Metallic','Винтаж':'Vintage','Киберпанк':'Cyberpunk','Рассвет в горах':'Mountain dawn',
        // Подрежимы (кнопки стиля)
        'Классика':'Classic','Геометрия':'Geometry','Спираль':'Spiral','Река':'River','Затмение':'Eclipse',
        'Лотос':'Lotus','Шри':'Shri','Звезда':'Star','Бхупура':'Bhupura','Калейдоскоп':'Kaleidoscope',
        'Куб':'Cube','Гекс':'Hex','Алмаз':'Diamond',
        // Радиальное меню
        'Ручные':'Manual','Автоматические':'Automatic','Инструменты':'Tools','Палитры':'Palettes',
        'Сцена':'Scene','Свой трек':'Your track','Биты':'Beats','Воспроизведение':'Playback',
        'Громкость':'Volume','Перемотка':'Seek','Реакция':'Reaction','Загрузить файл':'Load file',
        'Открыть профиль':'Open profile','Удиви меня':'Surprise me','нет настроек':'no settings',
        // Тосты / доступ
        'Доступно в DLC Аудио':'Available in Audio DLC','Доступно в DLC Биты':'Available in Beats DLC',
        'Доступно в Pro':'Available in Pro','Форма обратной связи скоро появится':'Feedback form coming soon',
        'Обратная связь':'Feedback',
        'Ваш отзыв помогает сделать Soundfield лучше':'Your feedback helps improve Soundfield',
        'Имя':'Name','Ваше имя':'Your name','Сообщение':'Message',
        'Что понравилось или что улучшить?':'What did you like or what to improve?',
        'Отправить':'Send','Спасибо за отзыв!':'Thanks for your feedback!',
        // Заголовок
        'Soundfield — звук становится светом':'Soundfield — sound becomes light'
    };

    var lang='ru', applying=false;
    var SKIP_TAGS={SCRIPT:1,STYLE:1,CANVAS:1,NOSCRIPT:1};
    var ATTRS=['title','placeholder','aria-label'];

    function skipNode(n){ // не трогаем дев-оверлеи с живыми числами
        var p=n.nodeType===3?n.parentNode:n;
        return p && (p.id==='fpsOverlay' || p.id==='langToggle');
    }
    function processText(node){
        if(skipNode(node)) return;
        var orig = node.__i18nOrig!=null ? node.__i18nOrig : node.nodeValue;
        var trimmed = orig && orig.trim();
        if(!trimmed) return;
        if(node.__i18nOrig==null) node.__i18nOrig = orig;
        if(lang==='en' && EN[trimmed]!=null) node.nodeValue = orig.replace(trimmed, EN[trimmed]);
        else node.nodeValue = node.__i18nOrig;
    }
    function processAttrs(el){
        for(var i=0;i<ATTRS.length;i++){
            var a=ATTRS[i];
            if(!el.hasAttribute||!el.hasAttribute(a)) continue;
            var key='__i18nA_'+a;
            var orig = el[key]!=null ? el[key] : el.getAttribute(a);
            var trimmed = orig && orig.trim(); if(!trimmed) continue;
            if(el[key]==null) el[key]=orig;
            el.setAttribute(a, (lang==='en' && EN[trimmed]!=null) ? EN[trimmed] : el[key]);
        }
    }
    function walk(root){
        if(root.nodeType===1){
            if(SKIP_TAGS[root.tagName]) return;
            processAttrs(root);
            var withAttr=root.querySelectorAll?root.querySelectorAll('[title],[placeholder],[aria-label]'):[];
            for(var k=0;k<withAttr.length;k++) processAttrs(withAttr[k]);
        }
        if(root.nodeType===3){ processText(root); return; }
        var tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);
        var nodes=[],n;
        while(n=tw.nextNode()){ if(!SKIP_TAGS[n.parentNode&&n.parentNode.tagName]) nodes.push(n); }
        for(var i=0;i<nodes.length;i++) processText(nodes[i]);
    }
    function updateSwitch(){
        var tg=document.getElementById('langToggle');
        if(tg) tg.textContent = lang.toUpperCase();
        try{ document.documentElement.setAttribute('lang', lang); }catch(e){}
    }
    function applyLang(l){
        lang = (l==='en')?'en':'ru';
        applying=true;
        walk(document.body);
        if(document.__i18nTitle==null) document.__i18nTitle=document.title;
        var tt=document.__i18nTitle.trim();
        document.title = (lang==='en' && EN[tt]!=null) ? EN[tt] : document.__i18nTitle;
        applying=false;
        updateSwitch();
        try{ localStorage.setItem('sf_lang', lang); }catch(e){}
        if(window.sfTrack) sfTrack('lang_'+lang);
    }

    // наблюдатель за динамикой (переводим только при EN)
    var obs=new MutationObserver(function(muts){
        if(applying || lang!=='en') return;
        applying=true;
        for(var i=0;i<muts.length;i++){
            var add=muts[i].addedNodes;
            for(var j=0;j<add.length;j++){
                var nd=add[j];
                if(nd.nodeType===1) walk(nd);
                else if(nd.nodeType===3) processText(nd);
            }
        }
        applying=false;
    });

    function init(){
        var saved=null; try{ saved=localStorage.getItem('sf_lang'); }catch(e){}
        var auto=((navigator.language||'ru').toLowerCase().indexOf('ru')===0)?'ru':'en';
        lang = (saved==='en'||saved==='ru')?saved:auto;
        var tap=(typeof window.onTap==='function')?window.onTap:function(el,fn){el.addEventListener('click',fn);};
        var tg=document.getElementById('langToggle');
        if(tg) tap(tg,function(e){e&&e.stopPropagation&&e.stopPropagation();applyLang(lang==='en'?'ru':'en');});
        applyLang(lang);
        try{ obs.observe(document.body,{childList:true,subtree:true}); }catch(e){}
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
    else init();

    window.__i18n={ set:applyLang, get:function(){return lang;}, dict:EN };
})();
