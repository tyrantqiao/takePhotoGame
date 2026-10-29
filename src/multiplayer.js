import { Peer } from 'peerjs';
import { RoomAuthority, cleanName } from './room-state.js';

const PREFIX = 'wildframe-v3-';
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function roomCode() { return Array.from(crypto.getRandomValues(new Uint8Array(8)), n => alphabet[n % alphabet.length]).join(''); }
export function peerOptions(server, iceText) {
  const options = { debug: 0 };
  if (server) {
    const url = new URL(server);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('信令地址应为 http(s)://主机:端口/路径');
    if (location.protocol === 'https:' && url.protocol !== 'https:') throw new Error('HTTPS 页面需要 HTTPS 信令服务');
    Object.assign(options, { host: url.hostname, port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)), path: url.pathname, secure: url.protocol === 'https:' });
  }
  if (iceText.trim()) {
    const iceServers = JSON.parse(iceText);
    if (!Array.isArray(iceServers) || iceServers.length > 8 || iceServers.some(s => !s || !(typeof s.urls === 'string' || Array.isArray(s.urls)))) throw new Error('ICE 配置需为包含 urls 的 JSON 数组');
    options.config = { iceServers };
  }
  return options;
}

export class Multiplayer {
  constructor({ scoreShot, onState, onStatus, onError, onLeave }) {
    Object.assign(this, { scoreShot, onState, onStatus, onError, onLeave });
    this.connections = new Map(); this.state = null; this.generation = 0;
  }
  get active() { return !!this.state; }
  get isHost() { return !!this.authority; }
  get isModel() { return this.state?.modelId === this.id; }
  async connect({ host, code, name, options, location = 'kyoto' }) {
    this.leave(false);
    const generation = this.generation;
    this.code = host ? roomCode() : code.toUpperCase().replace(/\s/g, '');
    if (!/^[A-HJ-NP-Z2-9]{8}$/.test(this.code)) throw new Error('请输入 8 位房间码');
    this.onStatus('正在连接信令服务…');
    const peer = new Peer(host ? PREFIX + this.code : undefined, options);
    this.peer = peer;
    const opened = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('连接超时，请检查信令地址或配置自建服务')), 15000);
      peer.once('open', id => { clearTimeout(timer); resolve(id); });
      peer.once('error', error => { clearTimeout(timer); reject(new Error(this.errorText(error))); });
    }).catch(error => { if (generation === this.generation) this.leave(false); throw error; });
    if (generation !== this.generation) { peer.destroy(); return; }
    this.id = opened;
    peer.on('error', error => this.onError(this.errorText(error)));
    peer.on('disconnected', () => {
      this.onStatus('信令断开，正在恢复；已连接玩家可继续游玩');
      if (!peer.destroyed) peer.reconnect();
    });
    if (host) {
      this.authority = new RoomAuthority(this.id, name, this.scoreShot);
      if (location !== 'kyoto') this.authority.command(this.id, { type: 'location', location });
      peer.on('connection', connection => this.accept(connection));
      this.publish();
      this.timer = setInterval(() => { if (this.authority?.tick()) this.publish(); }, 150);
    } else {
      this.onStatus('正在与房主建立点对点连接…');
      const connection = peer.connect(PREFIX + this.code, { reliable: true, serialization: 'binary', metadata: { name: cleanName(name), version: 3 } });
      this.hostConnection = connection;
      this.joinTimer = setTimeout(() => { this.onError('无法连接房主。确认房间仍开启；部分网络需自建 TURN 中继。'); this.leave(); }, 20000);
      connection.on('data', message => {
        if (generation !== this.generation || !message || typeof message !== 'object') return;
        if (message.type === 'state' && message.state?.version === 3 && Array.isArray(message.state.players)) {
          clearTimeout(this.joinTimer); this.state = message.state; this.onState(this.state);
          this.onStatus('已加入房间');
        } else if (message.type === 'pose' && this.state && message.roundId === this.state.round.id) {
          this.state = { ...this.state, model: message.model, serverNow: message.serverNow };
          this.onState(this.state);
        } else if (message.type === 'error') this.onError(String(message.message).slice(0, 160));
      });
      connection.on('close', () => { if (generation === this.generation) this.leave(true, '房主已关闭房间或连接中断，已回到单人模式'); });
      connection.on('error', () => { if (generation === this.generation) this.leave(true, '点对点连接失败，请检查网络或 TURN 配置'); });
    }
  }
  accept(connection) {
    const generation = this.generation;
    const authTimer = setTimeout(() => connection.close(), 10000);
    connection.on('open', () => {
      clearTimeout(authTimer);
      if (generation !== this.generation || connection.metadata?.version !== 3 || !this.authority.join(connection.peer, connection.metadata.name)) {
        connection.send({ type: 'error', message: '房间已满（最多 8 人），或版本不兼容' });
        setTimeout(() => connection.close(), 500); return;
      }
      this.connections.set(connection.peer, connection); this.publish();
    });
    connection.on('data', message => {
      if (generation !== this.generation || !this.connections.has(connection.peer)) return;
      this.handle(connection.peer, message);
    });
    connection.on('close', () => {
      clearTimeout(authTimer);
      if (generation !== this.generation || !this.connections.delete(connection.peer)) return;
      this.authority.leave(connection.peer); this.publish();
    });
    connection.on('error', () => connection.close());
  }
  handle(id, message) {
    if (this.authority.tick()) this.publish();
    const error = this.authority.command(id, message);
    if (error) {
      if (error === 'too-fast') return;
      if (id === this.id) this.onError(error);
      else this.connections.get(id)?.send({ type: 'error', message: error });
      return;
    }
    if (message.type === 'move') this.publishPose();
    else this.publish();
  }
  send(message) {
    if (this.authority) this.handle(this.id, message);
    else if (this.hostConnection?.open) this.hostConnection.send(message);
  }
  publish() {
    this.state = this.authority.snapshot(); this.onState(this.state);
    for (const connection of this.connections.values()) if (connection.open) connection.send({ type: 'state', state: this.state });
    this.onStatus('房间已开启 · 房主离开将结束房间');
  }
  publishPose() {
    this.state = this.authority.snapshot(); this.onState(this.state);
    const message = { type: 'pose', model: this.state.model, roundId: this.state.round.id, serverNow: this.state.serverNow };
    for (const connection of this.connections.values()) if (connection.open) connection.send(message);
  }
  errorText(error) {
    return ({ 'unavailable-id': '房间码冲突，请重新创建', 'peer-unavailable': '没有找到该房间，请确认房主在线及信令设置相同', network: '信令服务不可用，请重试或使用自建服务', 'browser-incompatible': '浏览器不支持 WebRTC，请使用新版 Chrome、Edge 或 Safari' })[error.type] || '联机失败，请检查信令服务与网络设置';
  }
  leave(notify = true, reason = '') {
    this.generation++;
    clearInterval(this.timer); clearTimeout(this.joinTimer);
    this.peer?.destroy(); this.peer = null;
    this.connections.clear(); this.hostConnection = null; this.authority = null; this.state = null;
    if (notify) this.onLeave(reason);
  }
}
