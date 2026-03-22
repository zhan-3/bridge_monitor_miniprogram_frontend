module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1774159547514, function(require, module, exports) {


Object.defineProperty(exports, '__esModule', { value: true });

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);

    if (enumerableOnly) {
      symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
    }

    keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};

    if (i % 2) {
      ownKeys(Object(source), true).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }

  return target;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

// eslint-disable-next-line no-shadow
exports.AUDIO_STATUS = void 0;

(function (AUDIO_STATUS) {
  AUDIO_STATUS[AUDIO_STATUS["INITIAL"] = 1] = "INITIAL";
  AUDIO_STATUS[AUDIO_STATUS["PLAYING"] = 3] = "PLAYING";
  AUDIO_STATUS[AUDIO_STATUS["WAITING"] = 4] = "WAITING";
  AUDIO_STATUS[AUDIO_STATUS["PAUSED"] = 5] = "PAUSED";
  AUDIO_STATUS[AUDIO_STATUS["ENDED"] = 6] = "ENDED";
  AUDIO_STATUS[AUDIO_STATUS["STOP"] = 7] = "STOP";
  AUDIO_STATUS[AUDIO_STATUS["ERROR"] = 8] = "ERROR";
  AUDIO_STATUS[AUDIO_STATUS["PRE_ENDED"] = 9] = "PRE_ENDED";
})(exports.AUDIO_STATUS || (exports.AUDIO_STATUS = {}));

var DEFAULT_MANAGER_INFO = {
  // 只读属性 （比如 duration）也不会被赋值
  src: '',
  title: '微信音频',
  // NOTE: 必须有值
  epname: '',
  singer: '',
  coverUrl: '',
  coverImgUrl: '',
  // 微信设置分享的字段名
  webUrl: '',
  protocol: ''
}; // 能设置到 wx.backgroundManager 的 key

var WHITE_AM_KEYS = ['title', 'epname', 'singer', 'coverImgUrl', 'webUrl', 'protocol'];
var EVENT_NAMES = {
  update: 'update',
  // audioManager 上任何属性发生了更新
  error: 'error',
  // 发生了错误
  srcUpdate: 'srcUpdate' // src 发生了改变

};
var PLATFORM_NAME = {
  mac: 'mac',
  windows: 'windows',
  ios: 'ios',
  android: 'android'
};

var __events = new Map();
/**
 * 基础事件订阅
 */


var EventEmitter = {
  events: function events() {
    return __events;
  },
  on: function on(key, fn) {
    var exits = __events.get(key);

    if (exits) {
      exits.push(fn);
    } else {
      __events.set(key, [fn]);
    }
  },
  off: function off(key, fn) {
    var _events = __events.get(key);

    if (!_events) return;

    if (fn && _events.length) {
      var tmplArr = [];

      for (var i = _events.length - 1; i >= 0; i--) {
        if (_events[i] !== fn) {
          tmplArr.push(_events[i]);
        }
      }

      tmplArr.length ? __events.set(key, tmplArr) : __events.delete(key);
      return;
    }

    __events.delete(key);
  },
  emit: function emit(key) {
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    var _events = __events.get(key);

    if (_events) {
      _events.forEach(function (func) {
        return func.apply(null, args);
      });
    }
  }
};

function formatTimeString(seconds) {
  if (typeof seconds === 'number' && seconds > 0) {
    var mmss = new Date(seconds * 1000).toISOString().substr(14, 5);

    if (seconds < 3600) {
      return mmss;
    }

    var hh = Math.floor(seconds / 3600);
    return hh + ":" + mmss;
  }

  return '00:00';
}
function isValidProgress(n) {
  return typeof n === 'number' && n >= 0;
}
/**
 * 不四舍五入，不会用 0 补全小数点位数
 * @param {number} n
 * @param {number} limit 限制几位小数
 * @returns {string}
 */

function toLazyFixed(n, limit) {
  var parts = (n + '').split('.');

  if (parts.length >= 2) {
    return parts[0] + "." + parts[1].slice(0, limit);
  }

  return n + '';
}

function range(x, min, max, _default) {
  var result = Math.max(x, min);
  return Math.min(result, max) || _default || min;
}

function divide(a, b) {
  return a / b || 0;
}
/** 返回百分比 */


function percent(a, b) {
  return range(divide(a, b) * 100, 1, 100);
}

function throttle(fn, threshhold) {
  var last = 0;
  var context;
  var args;
  return function () {
    /** @ts-ignore */
    context = this; // eslint-disable-next-line prefer-rest-params

    args = arguments;
    var now = +new Date();
    var remaining = last ? last + threshhold - now : 0; // 表示两次调用间隔时间已经超过阈值，可以继续调用

    if (remaining <= 0) {
      last = +new Date();
      /** @ts-ignore */

      fn.apply(context, args); // 防止内存泄漏

      context = null;
      args = null;
    }
  };
}
function ensureStartTime(startTime, duration) {
  if (!startTime) {
    return 0;
  }

  if (!isValidProgress(startTime)) {
    return 0;
  }

  if (startTime <= 0) {
    return 0; // NOTE: 原生接口无法 seek 到 0
  } // 如果直接从末尾开始播放，把 startTime 减去一些，否则可能会从头开始播放


  if (duration && duration > 0 && startTime >= duration) {
    return duration - 0.5;
  }

  return startTime;
}
/** 格式化打印 am 中的关键信息 */

function logAm(am) {
  return JSON.stringify({
    startTime: am.startTime,
    status: am.status,
    duration: am.duration,
    currentTime: am.currentTime
  });
}
/**
 * 根据 am 计算各种进度百分比和格式化字符串
 * @param {AudioManager} am audioManager
 * @returns {AudioManager}
 */

function getFormattedAudioInfo(am) {
  var rawPlayRate = percent(am.currentTime, am.duration);
  return _objectSpread2(_objectSpread2({}, am), {}, {
    countdown: formatTimeString(am.duration - am.currentTime),
    // 倒计时，hh:mm:ss 格式字符串
    countdownSec: Math.floor(am.duration - am.currentTime) || 0,
    // 倒计时，数字，单位秒
    startSec: formatTimeString(am.currentTime),
    // 当前进度，数字，单位秒
    durationSec: formatTimeString(am.duration),
    // 总时长，数字，单位秒
    playRate: toLazyFixed(rawPlayRate, 2) // 当前播放了百分之多少，常用于进度条

  });
}

var rawManager; // NOTE: wx.getBackgroundAudioManager() 并不会返回 title、startTime 等字段，需要自行维护

var curAmInfo = _objectSpread2({
  // duration: 只会在更换音频或 timeupdate 中改变
  status: exports.AUDIO_STATUS.INITIAL
}, DEFAULT_MANAGER_INFO);

var lastUpdate = {}; // 上一次 update 事件传递的数据

var _stopLaterTimer = 0; // 延迟停止播放的计时器

var PLATFORM = wx.getSystemInfoSync().platform;
var isDesktop = PLATFORM === PLATFORM_NAME.windows || PLATFORM === PLATFORM_NAME.mac; // 是否桌面端

/**
 * 每次 src 变更时调用，
 * @param {*} nextManager 想要更新的 am
 * @param {*} lastManager 上一个 am
 */

function onSrcUpdate(nextManager, lastManager) {
  var result = {};

  if (isValidProgress(nextManager.duration)) {
    curAmInfo.duration = nextManager.duration; // 获取新视频的 duration

    result.duration = nextManager.duration;
  }

  curAmInfo.currentTime = 0;
  result.currentTime = 0;
  EventEmitter.emit(EVENT_NAMES.srcUpdate, lastManager);
  return result;
} // --- 事件相关 ---


function emitUpdate(ename) {
  var manager = AudioManager.get(); // const { duration, currentTime, status, src } = manager;
  // ename !== 'timeUpdate' && console.log('update', ename, { duration, currentTime, status, src });

  if (!manager.duration) {
    return;
  }

  var value = {
    data: manager,
    ename: ename
  };
  EventEmitter.emit(EVENT_NAMES.update, value, Object.assign({}, lastUpdate));
  lastUpdate = value;
}
/**
 * 任何修改 curAmInfo 的函数都必须使用该方法！方便 debug 比较两次赋值
 */


function _setAmInfo(setter) {
  curAmInfo = Object.assign(curAmInfo, setter);
}
/**
 * 更应当调用此函数，方便以后统一触发某种回调。
 */


function setAudioStatus(status) {
  _setAmInfo({
    status: status
  });
}
/**
 * 是否还能获取到来自 wx.getBackgroundAudioManager 的真实数据
 */


function hasWxAudioProgressInfo(status) {
  return [exports.AUDIO_STATUS.PLAYING, exports.AUDIO_STATUS.PAUSED].includes(status);
}

var AudioManager = /*#__PURE__*/function () {
  function AudioManager() {}

  /**
   * 初始化 AudioManager，为其注册生命周期
   */
  AudioManager.init = function init() {
    rawManager = wx.getBackgroundAudioManager();

    var commonSave = function commonSave(name, status) {
      setAudioStatus(status);
      emitUpdate(name);
    }; // NOTE: 必须监听 onPlay 否则在部分安卓机型上会播放一段时间后停止！
    // call 了 play() 或重设了 src，但是还需要一些时间才能切到 playing，所以不使用它来标志正在播放


    rawManager.onPlay(function () {});

    var onTimeUpdate = function onTimeUpdate() {
      var _rawManager = rawManager,
          buffered = _rawManager.buffered,
          currentTime = _rawManager.currentTime,
          _rawDuration = _rawManager.duration; // NOTE: 当前 mac 微信客户端（3.2.0），返回的 duration 时长过大，且没有换算规律，因此将信任客户端传入的数据

      var rawDuration = PLATFORM === PLATFORM_NAME.mac ? curAmInfo.duration : _rawDuration;
      var duration = rawDuration || curAmInfo.duration || 0; // 微信有时无法返回 duration，此时使用后端给的 duration
      // NOTE: 过滤播放过程中的 0。若设置 startTime 后开始播放，微信会先返回一个 currentTime:0 的消息回来，导致 ui 会先回弹到 0 再回到正常时间，页面看起来会闪烁

      if (currentTime === 0) {
        return;
      }

      if (duration > 0) {
        _setAmInfo({
          buffered: buffered,
          currentTime: currentTime,
          duration: duration
        });

        commonSave('timeUpdate', exports.AUDIO_STATUS.PLAYING);
      }
    };

    rawManager.onTimeUpdate(throttle(onTimeUpdate, 600));
    rawManager.onPause(function () {
      // 由于节流，timeupdate 会延迟执行，导致有时暂停后会跳回播放状态（但事实不再播放了）
      // 所以暂停操作对应延迟相应的时间
      setTimeout(function () {
        commonSave('pause', exports.AUDIO_STATUS.PAUSED);
      }, 500);
    });
    rawManager.onStop(function () {
      _setAmInfo({
        src: ''
      });

      commonSave('stop', exports.AUDIO_STATUS.STOP);
    });
    rawManager.onEnded(function () {
      commonSave('preended', exports.AUDIO_STATUS.PRE_ENDED); // 略微延迟后再设置终止，使得进度条能够先触底，再弹回 0

      setTimeout(function () {
        _setAmInfo({
          src: ''
        });

        commonSave('ended', exports.AUDIO_STATUS.ENDED);
      }, 100);
    });
    rawManager.onError(function (e) {
      console.warn('play audio error', e);
      setAudioStatus(exports.AUDIO_STATUS.ERROR);
      emitUpdate('error');
      EventEmitter.emit(EVENT_NAMES.error, e);
    });
  }
  /**
   * 获取全局音频播放设置
   * @returns audioManager 当前 audioManager 实例
   */
  ;

  AudioManager.get = function get() {
    var _rawManager2 = rawManager,
        currentTime = _rawManager2.currentTime,
        paused = _rawManager2.paused,
        buffered = _rawManager2.buffered;

    var audioManager = _objectSpread2(_objectSpread2({}, curAmInfo), {}, {
      paused: paused,
      currentTime: currentTime || 0,
      duration: curAmInfo.duration || 0,
      buffered: buffered || 0,
      status: curAmInfo.status || exports.AUDIO_STATUS.INITIAL
    }); // 未知微信返回的播放进度时，使用当前的数据


    if (!hasWxAudioProgressInfo(audioManager.status)) {
      audioManager.duration = curAmInfo.duration || 0;
      audioManager.currentTime = curAmInfo.currentTime || 0;
    }

    if (audioManager.status === exports.AUDIO_STATUS.PRE_ENDED || audioManager.status === exports.AUDIO_STATUS.ENDED) {
      audioManager.currentTime = curAmInfo.duration || 0;
    }

    return audioManager;
  }
  /**
   * 设置全局音频播放设置
   */
  ;

  AudioManager.set = function set(nextManager) {
    if (!nextManager) {
      return;
    }

    var hasSrcChanged = false;
    var curManager = AudioManager.get();
    var lastManager = Object.assign({}, curManager); // 建立一个快照

    Object.keys(nextManager).forEach(function (key) {
      if (key in DEFAULT_MANAGER_INFO) {
        var newV = nextManager[key];
        var oldV = curAmInfo[key];
        var hasChanged = newV !== oldV;

        if (key === 'src' && hasChanged) {
          hasSrcChanged = true;
        }

        if (WHITE_AM_KEYS.includes(key)) {
          rawManager[key] = newV;
        }

        curAmInfo[key] = newV;
      }
    });
    var updatedInfo = {};

    if (hasSrcChanged) {
      updatedInfo = onSrcUpdate(nextManager, lastManager);
    }

    return _objectSpread2(_objectSpread2(_objectSpread2({}, AudioManager.get()), updatedInfo), {}, {
      hasSrcChanged: hasSrcChanged
    });
  } // --- 播放相关 ---

  /**
   * 播放背景音乐，同时需要定义若干播放条件，src 必传
   */
  ;

  AudioManager.play = function play(am) {
    var newAm = AudioManager.set(am);
    var startTime = am.startTime; // 暂停后继续播放，如没有 startTime 必须使用 currentTime

    am.status === exports.AUDIO_STATUS.PAUSED && (startTime = startTime || newAm.currentTime);
    startTime = ensureStartTime(startTime, newAm.duration);
    curAmInfo.currentTime = startTime;
    rawManager.startTime = startTime;
    rawManager.coverImgUrl = newAm.coverImgUrl || '';
    var title = newAm.title || DEFAULT_MANAGER_INFO.title; // NOTE: 必须在播放前设置，否则真机无法播放

    if (isDesktop) {
      // 桌面端不支持 startTime 属性，即不支持从 x 秒开始重新播放，所以每次重设 src 只能从 0 开始播放
      if (rawManager.src !== newAm.src) {
        rawManager.title = title;
        rawManager.src = newAm.src;
      } else {
        // NOTE: windows seek 方法有 bug，暂时禁用
        PLATFORM === PLATFORM_NAME.mac && startTime && rawManager.seek(startTime);
        rawManager.play(); // 考虑暂停后恢复的场景
      }
    } else {
      // NOTE: 在移动端，对于同一个音频，重新 play 会触发 stop 导致无法继续播放，必须重设一个新的 src
      // 注意，采用这种方式后，「暂停后继续播放」本质上是指定从 x 秒重新开始播放
      rawManager.title = title;
      rawManager.src = newAm.src + "?_uid=" + Math.random(); // 使微信认为是两个不同的音频
    }
  }
  /**
   * 播放背景音乐，只需传入 src
   */
  ;

  AudioManager.playSrc = function playSrc(src) {
    if (!src) {
      return;
    }

    var am = {
      src: src
    };
    AudioManager.play(am);
  }
  /**
   * 使指定 am 跳到指定的地方开始播放或继续播放
   * @param {Object} am audioManager，必须传入 startTime 和 src
   */
  ;

  AudioManager.seek = function seek(am) {
    // 为什么不用原生 seek
    // 1. iOS 不能稳定 seek，会闪烁
    // 2. 安卓 seek 后快速暂停会触发且仅触发一次 timeupdate
    return AudioManager.play(am);
  }
  /**
   * 暂停播放
   */
  ;

  AudioManager.pause = function pause() {
    rawManager.pause();
  }
  /**
   * 停止播放，会丢失 src 等信息
   */
  ;

  AudioManager.stop = function stop() {
    rawManager.stop();
  }
  /**
   * 在一段时间后，停止播放
   * @param {number} countdown 倒计时持续时间
   */
  ;

  AudioManager.stopLater = function stopLater(countdown) {
    clearTimeout(_stopLaterTimer);
    _stopLaterTimer = setTimeout(function () {
      var am = AudioManager.get();
      var runningStatus = [exports.AUDIO_STATUS.PLAYING, exports.AUDIO_STATUS.WAITING, exports.AUDIO_STATUS.PAUSED];

      if (runningStatus.includes(am.status)) {
        AudioManager.stop();
      }
    }, countdown * 1000);
  };

  AudioManager.isPlaying = function isPlaying(am) {
    var _am = am || AudioManager.get();

    return _am.status === exports.AUDIO_STATUS.PLAYING || _am.status === exports.AUDIO_STATUS.WAITING;
  }
  /**
   * 向 audioManager 订阅事件，具体可监听的事件可见 EVENT_NAMES
   * @param {object} callbacks 一组事件名，回调的映射
   * @returns {function} 一个批量取消监听的方法
   */
  ;

  AudioManager.on = function on(callbacks) {
    var validEvents = [];
    Object.keys(callbacks).forEach(function (ename) {
      var cb = callbacks[ename];

      if (ename in EVENT_NAMES && typeof cb === 'function') {
        validEvents.push([ename, cb]);
        EventEmitter.on(ename, cb);
      }
    });
    return function () {
      validEvents.forEach(function (_ref) {
        var key = _ref[0],
            cb = _ref[1];
        EventEmitter.off(key, cb);
      });
    };
  };

  return AudioManager;
}();

exports.AudioManager = AudioManager;
exports.formatTimeString = formatTimeString;
exports.getFormattedAudioInfo = getFormattedAudioInfo;
exports.isValidProgress = isValidProgress;
exports.logAm = logAm;

}, function(modId) {var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1774159547514);
})()
//miniprogram-npm-outsideDeps=[]
//# sourceMappingURL=index.js.map