import http from '../../utils/http';
import { getStorage } from '../../utils/storage';
import logger from '../../utils/logger';
const { normalizeAlarmItems } = require('../../utils/alarmInbox');

Page({
  data: {
    isLogin: false,
    activeStatus: 'pending',
    alarms: [],
    loading: false,
    loadError: false,
    hasMore: false,
    page: 1,
    handlingId: ''
  },

  onShow() {
    const token = getApp().getLoginToken();
    const isLogin = Boolean(token && getStorage('isLogin'));
    this.setData({ isLogin });
    if (isLogin) this.loadAlarms(true);
  },

  selectStatus(e) {
    const status = e.currentTarget.dataset.status;
    if (status === this.data.activeStatus || this.data.loading) return;
    this.setData({
      activeStatus: status,
      alarms: [],
      page: 1,
      hasMore: false,
      loadError: false
    });
    if (this.data.isLogin) this.loadAlarms(true);
  },

  async loadAlarms(reset = false) {
    if (!this.data.isLogin || this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true, loadError: false });
    try {
      const res = await http.get('/user/alarms', {
        status: this.data.activeStatus,
        page,
        pageSize: 20
      });
      const result = res.data || {};
      const items = normalizeAlarmItems(result.items);
      this.setData({
        alarms: reset ? items : [...this.data.alarms, ...items],
        page: page + 1,
        hasMore: Boolean(result.hasMore)
      });
    } catch (error) {
      logger.error('加载报警列表失败', { error });
      if (this.data.alarms.length === 0) {
        this.setData({ loadError: true });
      } else {
        wx.showToast({ title: '加载更多失败，请重试', icon: 'none' });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  retryLoad() {
    this.loadAlarms(true);
  },

  loadMore() {
    if (this.data.hasMore && !this.data.loading) this.loadAlarms(false);
  },

  onPullDownRefresh() {
    if (!this.data.isLogin) {
      wx.stopPullDownRefresh();
      return;
    }
    this.loadAlarms(true).finally(() => wx.stopPullDownRefresh());
  },

  async handleAlarm(e) {
    const alarmId = String(e.currentTarget.dataset.id || '');
    if (!alarmId || this.data.handlingId) return;
    const confirmed = await wx.modal({
      title: '确认已经处理？',
      content: '你和其他联系人都将看到“已处理”。这不会改变设备当前状态。',
      confirmText: '确认已处理'
    });
    if (!confirmed) return;

    this.setData({ handlingId: alarmId });
    try {
      await http.post('/user/alarms/handle', { alarmId });
      wx.showToast({ title: '已确认处理', icon: 'success' });
      await this.loadAlarms(true);
    } catch (error) {
      logger.error('标记报警处理失败', { alarmId, error });
    } finally {
      this.setData({ handlingId: '' });
    }
  },

  openAlarmLocation(e) {
    const latitude = Number(e.currentTarget.dataset.lat);
    const longitude = Number(e.currentTarget.dataset.lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      wx.showToast({ title: '位置数据不可用', icon: 'none' });
      return;
    }
    wx.openLocation({
      latitude,
      longitude,
      scale: 16,
      name: `设备 ${e.currentTarget.dataset.sn || ''} 报警位置`
    });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  goDevices() {
    wx.navigateTo({ url: '/pages/home/home' });
  }
});
