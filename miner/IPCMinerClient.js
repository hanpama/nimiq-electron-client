const { ipcRenderer } = require('electron');
const { ab2str, str2ab } = require('./serializer');


class IPCMinerWorkerPool {

  get poolSize() {
    return ipcRenderer.sendSync('getPoolSize');
  }
  set poolSize(val) {
    return ipcRenderer.send('setPoolSize', val);
  }
  get cycleWait() {
    return ipcRenderer.sendSync('getCycleWait');
  }
  set cycleWait(val) {
    return ipcRenderer.send('setCycleWait', val);
  }
  get runPerCycle() {
    return ipcRenderer.sendSync('getRunPerCycle');
  }
  set runPerCycle(val) {
    return ipcRenderer.send('setRunPerCycle', val);
  }
  get noncesPerRun() {
    return ipcRenderer.sendSync('getNoncesPerRun');
  }

  on(event, callback) {
    if (event === 'share') {
      ipcRenderer.on('share', (event, obj) => () => {
        return callback({
          block: Nimiq.Block.unserialize(new Nimiq.SerialBuffer(str2ab(obj.block))),
          nonce: obj.nonce,
          hash: Nimiq.Hash.unserialize(new Nimiq.SerialBuffer(str2ab(obj.hash))),
        });
      });
    } else if (event === 'no-share') {
      ipcRenderer.on('no-share', (event, obj) => {
        return callback(obj);
      });
    }
  }

  startMiningOnBlock(block, shareCompact) {
    console.log(block);
    return new Promise((resolve, reject) => {

      const serializedBlockBuffer = block.serialize().buffer;
      const blockString = ab2str(serializedBlockBuffer);
      console.log(blockString);
      ipcRenderer.send('startMiningOnBlock', blockString, shareCompact);
      this.resolveStartMiningOnBlock = resolve;
      this.rejectStartMiningOnBlock = reject;
    });
  }

  constructor() {
    ipcRenderer.on('resolveStartMiningOnBlock', () => this.resolveStartMiningOnBlock());
    ipcRenderer.on('rejectStartMiningOnBlock', () => this.rejectStartMiningOnBlock());
  }

  stop() {
    ipcRenderer.send('stop');
  }
}

let minerWorkperPool = new IPCMinerWorkerPool();


function createMinerIPCProxy(blockchain, accounts, mempool, time, minerAddress, extraData = new Uint8Array(0)) {
  const miner = new Nimiq.Miner(blockchain, accounts, mempool, time, minerAddress, extraData)
  miner._workerPool = minerWorkperPool;
  miner.threads = 1;
  miner._workerPool.on('share', (obj) => miner._onWorkerShare(obj));
  miner._workerPool.on('no-share', (obj) => miner._onWorkerShare(obj));
  return miner;
}

function createSmartPoolMinerIPCProxy(blockchain, accounts, mempool, time, address, deviceId, extraData = new Uint8Array(0)) {
  const miner = new Nimiq.SmartPoolMiner(blockchain, accounts, mempool, time, address, deviceId, extraData);
  miner._workerPool = minerWorkperPool;
  miner.threads = 1;
  miner._workerPool.on('share', (obj) => miner._onWorkerShare(obj));
  miner._workerPool.on('no-share', (obj) => miner._onWorkerShare(obj));
  return miner;
}

module.exports = { createSmartPoolMinerIPCProxy, createMinerIPCProxy };
