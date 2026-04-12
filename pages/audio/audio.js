import { setStorage, getStorage } from '../../utils/storage'
import http from '../../utils/http'

Page({
  data: {
    currentAudio: null,
    isPlaying: false,
    progress: 0,
    currentTime: '00:00',
    playbackRate: 1,
    audioList: [],
    audioManager: null,
    currentPlayId: '',
    audioTotalTime: 0,
    audioCurrentTime: 0,
    isDragging: false,
    showPlayerBar: false,
    playState: 'pause',
    progressTimer: null,
    formatCurrent: '00:00',
    formatTotal: '01:00',
    waveformData: [],
    waveformBars: [],
    sortType: 'desc',
    filterType: 'all',
    filteredList: [],
    showActionSheet: false,
    selectedItem: null,
    selectedIndex: 0
  },
  timer: null,
  loadTimeoutTimer: null,

  onLoad(options) {
    console.log('录音页面加载');
    this.initAudioManager();
    this.initWaveform();
    setTimeout(() => {
      this.data.audioManager && this.setupAudioListeners();
    }, 50);
    this.startPollingRealData();
  },

  initWaveform() {
    const bars = [];
    for (let i = 0; i < 25; i++) {
      bars.push(Math.random() * 60 + 20);
    }
    this.setData({ waveformBars: bars });
  },

  onUnload() {
    // 保留所有定时器清除逻辑
    this.timer && clearInterval(this.timer);
    this.clearProgressTimer();
    this.loadTimeoutTimer && clearTimeout(this.loadTimeoutTimer);
    // 销毁音频管理器
    if (this.data.audioManager) {
      try { this.data.audioManager.destroy(); } catch (e) { /* noop */ }
      this.setData({ audioManager: null });
    }
  },

  
  generateWaveform() {
    const waveform = [];
    for (let i = 0; i < 50; i++) {
      waveform.push(Math.random() * 60 + 20);
    }
    this.setData({ waveformData: waveform });
  },

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  setSpeed(e) {
    const rate = parseFloat(e.currentTarget.dataset.rate);
    this.setData({ playbackRate: rate });
    // InnerAudioContext的倍速设置
    if (this.data.audioManager) {
      this.data.audioManager.setPlaybackRate(rate);
    }
  },

  // 初始化音频管理器（基于 InnerAudioContext 封装统一接口）
  initAudioManager() {
    const innerAudio = wx.createInnerAudioContext();
    innerAudio.obeyMuteSwitch = false;
    innerAudio.volume = 1;

    // 事件名首字母大写，匹配微信 API：on + 'Play' = 'onPlay'
    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    const audioManager = {
      _ctx: innerAudio,
      play:            () => innerAudio.play(),
      pause:           () => innerAudio.pause(),
      stop:            () => innerAudio.stop(),
      seek:            (time) => innerAudio.seek(time),
      setPlaybackRate: (rate) => { innerAudio.playbackRate = rate; },
      getDuration:     () => innerAudio.duration || 0,
      getCurrentTime:  () => innerAudio.currentTime || 0,
      destroy:         () => innerAudio.destroy(),
      load:            (url) => { innerAudio.src = url; },
      on: (evt, cb) => {
        const method = 'on' + capitalize(evt);
        if (typeof innerAudio[method] === 'function') {
          innerAudio[method](cb);
        } else {
          console.warn('[audioManager] 不支持的事件:', evt);
        }
      },
      off: (evt, cb) => {
        const method = 'off' + capitalize(evt);
        if (typeof innerAudio[method] === 'function') {
          innerAudio[method](cb);
        }
      }
    };

    this.setData({ audioManager });
    console.log('✅ 音频管理器初始化成功（InnerAudioContext）');
  },

  // ========== 完全保留你原有的数据处理/接口逻辑 ==========
  initCollectStatus(list) {
    const collectIds = getStorage('collectIds') || [];
    return list.map(item => ({
      ...item,
      isCollect: collectIds.includes(item.id)
    }));
  },

  startPollingRealData() {
    this.getAllDeviceRecord();
    this.timer = setInterval(() => this.getAllDeviceRecord(), 7000);
  },

  getAllDeviceRecord() {
    http.get("/user/getRecord")
      .then(res => {
        if ( res.code !== 1) {
          const errMsg = res.msg || '获取数据失败';
          res.code !== 200 && wx.toast({ title: errMsg, icon: 'error', duration: 2000 });
          return;
        }
        
        // ✅ 核心修改：适配仅返回URL列表的场景
        const audioUrlList = res.data || [];
        if (!audioUrlList.length) return console.log('ℹ️ 暂无录音数据');
  
        // 前端生成音频列表（替代原有deviceRecordList解析逻辑）
        let flatList = [];
        const existingIds = new Set();
        audioUrlList.forEach((url, index) => {
          if (!url) return; // 过滤空URL
          // 为每个URL生成唯一ID（用时间戳+索引，避免重复）
          const recordId = `audio_${Date.now()}_${index}`;
          if (existingIds.has(recordId)) return;
          
          existingIds.add(recordId);
          // 调用格式化方法，仅传URL和生成的ID
          flatList.push(this.formatRecordItem({ url, recordId }));
        });
  
        const uniqueList = Array.from(new Map(flatList.map(item => [item.id, item])).values());
        const finalList = this.initCollectStatus(uniqueList);
        const { currentPlayId, isPlaying } = this.data;
        const resList = finalList.map(item => ({
          ...item,
          isPlaying: item.id === currentPlayId && isPlaying
        }));
  
        this.setData({ audioList: resList });
        this.updateFilteredList();
        if (!this.data.currentAudio && resList.length > 0) {
          this.setData({ currentAudio: resList[0] });
        }
        console.log('✅ 录音数据加载完成，共', resList.length, '条');
      })
      .catch(err => {
        console.error('❌ 网络请求失败：', err.errMsg);
        wx.toast({ title: '网络异常，检查后端', icon: 'none', duration: 3000 });
      });
  },

  formatRecordItem(record) {
    const { url = '', recordId = '' } = record || {};
    if (!url || !recordId) return {};
  
    const createTime = new Date();
    const time = `${createTime.getHours().toString().padStart(2, '0')}:${createTime.getMinutes().toString().padStart(2, '0')}`;
    const date = `${createTime.getFullYear()}-${(createTime.getMonth() + 1).toString().padStart(2, '0')}-${createTime.getDate().toString().padStart(2, '0')}`;
  
    const urlArr = url.split('/');
    const audioName = urlArr[urlArr.length - 1] || `现场录音_${recordId.slice(-6)}`;
    let duration = '00:00';
  
    return {
      id: `${recordId}`,
      originRecordId: recordId,
      name: audioName,
      time: time,
      date: date,
      duration: duration,
      size: '0MB',
      location: '未知位置',
      reporter: '现场人员',
      status: 'normal',
      url: url,
      isPlaying: false,
      isCollect: false
    };
  },

  updateFilteredList() {
    let list = [...this.data.audioList];
    const { sortType, filterType } = this.data;
    
    if (filterType === 'emergency') {
      list = list.filter(item => item.status === 'emergency');
    } else if (filterType === 'collected') {
      list = list.filter(item => item.isCollect);
    }
    
    list.sort((a, b) => {
      const dateA = new Date(a.date.replace(/-/g, '/') + ' ' + a.time);
      const dateB = new Date(b.date.replace(/-/g, '/') + ' ' + b.time);
      return sortType === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    list = list.map((item, index) => ({ ...item, index }));
    this.setData({ filteredList: list });
  },

  toggleSort() {
    const sortType = this.data.sortType === 'desc' ? 'asc' : 'desc';
    this.setData({ sortType });
    this.updateFilteredList();
  },

  toggleFilter() {
    const types = ['all', 'emergency', 'collected'];
    const currentIndex = types.indexOf(this.data.filterType);
    const nextIndex = (currentIndex + 1) % types.length;
    this.setData({ filterType: types[nextIndex] });
    this.updateFilteredList();
  },

  showActionMenu(e) {
    const { id, item } = e.currentTarget.dataset;
    const index = this.data.audioList.findIndex(a => a.id === id);
    this.setData({
      showActionSheet: true,
      selectedItem: item,
      selectedIndex: index
    });
  },

  hideActionMenu() {
    this.setData({
      showActionSheet: false,
      selectedItem: null
    });
  },

  playSelected() {
    if (this.data.selectedIndex >= 0) {
      this.selectAudio({ currentTarget: { dataset: { index: this.data.selectedIndex } } });
    }
    this.hideActionMenu();
  },

  // 音频事件监听
  setupAudioListeners() {
    const audioManager = this.data.audioManager;
    if (!audioManager) return;

    // 错误监听
    audioManager.on('error', (err) => {
      err = err || {};
      console.error('❌ 音频错误：', err);
      const errMsgMap = {
        10001: '系统错误（音频服务异常）',
        10002: '网络错误（音频地址无法访问）',
        10003: '文件错误（音频文件不存在/损坏）',
        10004: '格式错误（不支持的音频格式）',
        '-1': '未知错误（请检查音频地址或网络）'
      };
      const errCode = err.errCode || err.code || -1;
      const errMsg = errMsgMap[errCode] || `未知错误（错误码：${errCode}）`;

      wx.toast({ title: errMsg, icon: 'none', duration: 3000 });
      this.resetPlayState(true);
      this.setData({ currentTime: '00:00', progress: 0 });
    });

    // 播放监听（InnerAudioContext）
    audioManager.on('play', () => {
      this.setData({ isPlaying: true, playState: 'play' });
      this.startProgressTimer();
    });

    // 暂停监听（InnerAudioContext）
    audioManager.on('pause', () => {
      this.setData({ isPlaying: false, playState: 'pause' });
      this.clearProgressTimer();
    });

    // 停止监听（InnerAudioContext）
    audioManager.on('stop', () => {
      this.setData({ 
        isPlaying: false,
        progress: 0,
        currentTime: '00:00',
        playState: 'pause'
      });
      this.clearProgressTimer();
    });

    // 进度更新（InnerAudioContext 的 onTimeUpdate 回调无参数，需从实例读取）
    audioManager.on('timeUpdate', () => {
      const curTime = audioManager.getCurrentTime();
      const dur = audioManager.getDuration();
      if (this.data.isDragging || !dur) return;
      const progress = (curTime / dur) * 100;
      const currentTime = this.formatTime(curTime);
      this.setData({
        progress,
        currentTime,
        audioTotalTime: Math.floor(dur),
        formatTotal: this.formatTime(dur)
      });
    });

    // 播放结束（InnerAudioContext）
    audioManager.on('ended', () => {
      this.setData({ 
        isPlaying: false,
        progress: 100,
        currentTime: this.formatTime(this.data.audioManager.getDuration())
      });
      this.resetPlayState(true);
    });
  },

  // ========== 适配：选择音频（替换原生src为NPM包load） ==========
  selectAudio(e) {
    const index = e.currentTarget.dataset.index;
    const audio = this.data.audioList[index];
    if (!audio) return;

    // 保留你原有的重置逻辑
    if (this.data.audioManager) {
      this.data.audioManager.pause();
      this.clearProgressTimer();
      this.data.audioManager.off('canplay'); // 移除旧的监听
    }

    this.setData({
      currentAudio: audio,
      isPlaying: false,
      progress: 0,
      currentTime: '00:00',
      currentPlayId: audio.id
    });

    this.updateFilteredList();

    wx.showLoading({ title: '加载音频中...' });
    this.data.audioManager.load(audio.url);

    const onCanplay = () => {
      wx.hideLoading();
      const realDuration = this.formatTime(this.data.audioManager.getDuration());
      const newAudioList = [...this.data.audioList];
      newAudioList[index].duration = realDuration;
      this.setData({
        formatTotal: realDuration,
        audioTotalTime: Math.floor(this.data.audioManager.getDuration()),
        audioList: newAudioList
      });
      this.data.audioManager.off('canplay', onCanplay);
    };
    this.data.audioManager.on('canplay', onCanplay);
    setTimeout(() => wx.hideLoading(), 1000);
  },

  // ========== 适配：播放/暂停切换（InnerAudioContext方法） ==========
  togglePlay() {
    if (!this.data.currentAudio || !this.data.audioManager) {
      wx.toast({ title: '暂无可播放音频', icon: 'none' }); 
      return;
    }

    const { url, id } = this.data.currentAudio;
    const { isPlaying, playbackRate } = this.data;

    if (!isPlaying) {
      // 保留你原有的重置逻辑
      this.data.audioManager.stop();
      this.data.audioManager.load(url); // 替换原生src = url
      this.data.audioManager.setPlaybackRate(playbackRate || 1);

      // 保留超时定时器逻辑
      if (this.loadTimeoutTimer) {
        clearTimeout(this.loadTimeoutTimer);
        this.loadTimeoutTimer = null;
      }
      this.loadTimeoutTimer = setTimeout(() => {
        wx.hideLoading();
        wx.toast({ title: '音频加载超时，请检查网络', icon: 'none' });
        this.resetPlayState(true);
      }, 20000);

      // InnerAudioContext的播放逻辑
      const playAudio = () => {
        if (this.loadTimeoutTimer) {
          clearTimeout(this.loadTimeoutTimer);
          this.loadTimeoutTimer = null;
        }

        try {
          this.data.audioManager.play(); // 替换原生play
          console.log('✅ 音频播放触发成功');
          this.setData({
            currentPlayId: id,
            isPlaying: true,
            playState: 'play'
          });
          this.startProgressTimer();
        } catch (err) {
          console.error('❌ 播放触发失败：', err);
          wx.toast({ title: '播放失败，请点击重试', icon: 'none' });
        }
      };

      // InnerAudioContext的时长判断
      if (this.data.audioManager.getDuration() > 0) {
        playAudio();
      } else {
        wx.showLoading({ title: '加载音频中...' });
        const onCanplay = () => {
          wx.hideLoading();
          playAudio();
          this.data.audioManager.off('canplay', onCanplay);
        };
        this.data.audioManager.on('canplay', onCanplay);
        setTimeout(() => wx.hideLoading(), 2000);
      }

    } else {
      // 暂停逻辑（InnerAudioContext）
      this.data.audioManager.pause(); // 替换原生pause
      this.setData({
        isPlaying: false,
        playState: 'pause'
      });
      this.clearProgressTimer();
      console.log('✅ 音频暂停成功');
    }
  },

  // 控制逻辑
  previousAudio() {
    if (!this.data.currentAudio) return;
    const currentIndex = this.data.audioList.findIndex(
      item => item.id === this.data.currentAudio.id
    );
    if (currentIndex > 0) {
      this.selectAudio({ 
        currentTarget: { dataset: { index: currentIndex - 1 } } 
      });
    }
  },

  nextAudio() {
    if (!this.data.currentAudio) return;
    const currentIndex = this.data.audioList.findIndex(
      item => item.id === this.data.currentAudio.id
    );
    if (currentIndex < this.data.audioList.length - 1) {
      this.selectAudio({ 
        currentTarget: { dataset: { index: currentIndex + 1 } } 
      });
    }
  },

  onSliderChanging(e) {
    this.setData({ 
      progress: e.detail.value,
      isDragging: true 
    });
  },

  onSliderChange(e) {
    if (!this.data.audioManager || !this.data.audioManager.getDuration()) return;
    const value = e.detail.value;
    const newTime = (value / 100) * this.data.audioManager.getDuration();
    this.data.audioManager.seek(newTime); // InnerAudioContext的seek
    this.setData({ 
      progress: value,
      isDragging: false 
    });
  },

  // 原有定时器/状态重置逻辑
  startProgressTimer() {
    if (this.data.progressTimer) clearInterval(this.data.progressTimer);
    const timer = setInterval(() => {
      const audioManager = this.data.audioManager;
      const data = this.data;
      if (!audioManager || data.isDragging || data.playState === 'pause' || !data.currentPlayId) return;
      const currentTime = Math.floor(audioManager.getCurrentTime()) || 0; // InnerAudioContext
      let totalTime = Math.floor(audioManager.getDuration()) || data.audioTotalTime || 60;
      let progressRatio = (currentTime / totalTime) * 100;
      progressRatio = Math.max(0, Math.min(100, progressRatio));
      this.setData({
        progress: progressRatio,
        currentTime: this.formatTime(currentTime),
        formatCurrent: this.formatTime(currentTime),
        formatTotal: this.formatTime(totalTime)
      });
      if (currentTime >= totalTime) {
        clearInterval(timer);
        this.setData({ progressTimer: null });
        this.resetPlayState(true);
      }
    }, 1000);
    this.setData({ progressTimer: timer });
  },

  clearProgressTimer() {
    if (this.data.progressTimer) {
      clearInterval(this.data.progressTimer);
      this.setData({ progressTimer: null });
    }
  },

  resetPlayState(clearSrc = false) {
    const { audioList, currentPlayId } = this.data;
    if (!this.data.audioManager || !currentPlayId) return;

    const newList = [...audioList].map(item => ({
      ...item,
      isPlaying: item.id === currentPlayId ? false : item.isPlaying
    }));
    this.setData({ audioList: newList, isPlaying: false });

    this.data.audioManager.stop(); // InnerAudioContext
    clearSrc && this.data.audioManager.load(''); // InnerAudioContext
    if (clearSrc) {
      this.setData({ 
        currentTime: '00:00', 
        progress: 0, 
        currentPlayId: '',
        playState: 'pause',
        isDragging: false
      });
      this.clearProgressTimer();
    }
  },

  // ========== 保留你所有原有收藏/删除逻辑 ==========
  collectRecord(e) {
    let currentId, index;
    if (e && e.currentTarget) {
      currentId = e.currentTarget.dataset.id;
      index = this.data.audioList.findIndex(item => item.id === currentId);
    } else {
      currentId = this.data.selectedItem?.id;
      index = this.data.selectedIndex;
    }

    if (index === -1 || !currentId) return wx.toast({ title: '数据不存在', icon: 'none' });

    const isCollect = this.data.audioList[index].isCollect;
    let collectIds = getStorage('collectIds') || [];
    const newList = [...this.data.audioList];

    if (!isCollect) {
      collectIds.push(currentId);
      newList[index].isCollect = true;
      wx.toast({ title: '收藏成功', icon: 'success' });
    } else {
      collectIds = collectIds.filter(id => id !== currentId);
      newList[index].isCollect = false;
      wx.toast({ title: '取消收藏', icon: 'none' });
    }

    setStorage('collectIds', collectIds);
    this.setData({ audioList: newList });
    this.updateFilteredList();
    if (this.data.selectedItem) {
      this.setData({ 'selectedItem.isCollect': !isCollect });
    }
    this.hideActionMenu();
  },

  async delHandler(e) {
    let currentId;
    if (e && e.currentTarget && e.currentTarget.dataset.id) {
      currentId = e.currentTarget.dataset.id;
    } else {
      currentId = this.data.selectedItem?.id;
    }

    const { audioList, currentAudio } = this.data;
    const index = audioList.findIndex(item => item.id === currentId);

    if (index === -1 || !currentId) return wx.toast({ title: '数据不存在' });

    this.hideActionMenu();
    const confirmed = await wx.modal({ title: '确认删除', content: '是否删除该录音？' });
    if (confirmed) {
      const newList = audioList.filter(item => item.id !== currentId);
      let collectIds = getStorage('collectIds') || [];
      collectIds = collectIds.filter(id => id !== currentId);
      setStorage('collectIds', collectIds);

      const newCurrentAudio = currentAudio?.id === currentId ? (newList[0] || null) : currentAudio;

      this.setData({
        audioList: newList,
        currentAudio: newCurrentAudio
      });
      this.updateFilteredList();
      wx.toast({ title: '删除成功', icon: 'success' });
    }
  }
});