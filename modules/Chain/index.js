/**
 * Chain的代理对象，用于在非Chain进程调用Chain.js的API
 */
module.exports = {
  createVirtBlock: async () => {
    let topBlock = await wo.Chain.getTopBlock()
    let block = new wo.Block({ type: 'VirtBlock', timestamp: new Date(), height: topBlock.height + 1, hash: topBlock.hash, lastBlockHash: topBlock.hash })
    await wo.EventBus.call('Chain', '', 'appendBlock', block)
    mylog.info('虚拟块创建成功 --> 高度' + block.height)
    return block
  },
  createBlock: async (block) => {
    return await wo.EventBus.call('Chain', '', 'createBlock', block)
  },
  appendBlock: async (block) => {
    return await wo.EventBus.call('Chain', '', 'appendBlock', block)
  },
  getTopBlock: async () => {
    return await wo.EventBus.call('Chain', '', 'getTopBlock')
  },
  updateChainFromPeer: async (target) => {
    return await wo.EventBus.call('Chain', '', 'updateChainFromPeer', target)
  }
}
