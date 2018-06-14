const Nimiq = require('@nimiq/core');
const fs = require('fs');
const path = require('path');
const { ipcMain } = require('electron');
const { ab2str, str2ab } = require('./serializer');


module.exports = async function initIPCPool(rendererWindow) {
  const minerPool = new Nimiq.MinerWorkerPool();

  ipcMain.on('getPoolSize', (event) => {
    event.returnValue = minerPool.poolSize;
  });
  ipcMain.on('setPoolSize', (event, val) => {
    minerPool.poolSize = val;
  });
  ipcMain.on('getCycleWait', (event) => {
    event.returnValue = minerPool.cycleWait;
  });
  ipcMain.on('setCycleWait', (event, val) => {
    minerPool.cycleWait = val;
  });
  ipcMain.on('getRunPerCycle', (event) => {
    event.returnValue = minerPool.runPerCycle;
  });
  ipcMain.on('setRunPerCycle', (event, val) => {
    minerPool.runPerCycle = val;
  });
  ipcMain.on('getNoncesPerRun', (event) => {
    event.returnValue = minerPool.noncesPerRun;
  });

  minerPool.on('share', obj => {
    rendererWindow.webContents.send('share', {
      block: ab2str(block.serialze().buffer),
      nonce: obj.nonce,
      hash: ab2str(hash.serialze().buffer),
    });
  });

  minerPool.on('no-share', obj => {
    rendererWindow.webContents.send('no-share', obj);
  })

  ipcMain.on('startMiningOnBlock', async (event, serializedBlock, shareCompact) => {
    try {
      const block = Nimiq.Block.unserialize(new Nimiq.SerialBuffer(str2ab(serializedBlock)));
      await minerPool.startMiningOnBlock(block, shareCompact);
      rendererWindow.webContents.send('resolveStartMiningOnBlock');
    } catch (e) {
      console.error(e);
      rendererWindow.webContents.send('rejectStartMiningOnBlock', e);
    }
  });
  ipcMain.on('stop', () => {
    minerPool.stop();
  });
}
