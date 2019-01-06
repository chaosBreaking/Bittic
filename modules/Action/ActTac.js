const Action = require('./Action.js')
const Methods = ['create', 'transfer', 'exchange', 'mount']
async function actValidator (action) {
  switch (action.data.method) {
    case 'create':
      if (action.data.name && action.data.symbol && action.data.decimals &&
          Number.isSafeInteger(Number(action.data.decimals)) &&
          !await wo.Tac.getOne({ Tac: { name: action.data.name, symbol: action.data.symbol } })
      ) { return true }
      return false
    case 'transfer':
      return action.amount && action.amount > 0 && action.actorAddress && action.toAddress && action.actorAddress !== action.toAddress
    case 'exchange':
      return true
    case 'mount':
      return true
    default:
      return null
  }
}

class ActTac extends Action {
  constructor (prop) {
    super()
    Object.defineProperty(this, '_class', {
      value: 'ActTac',
      enumerable: true,
      writable: false
    }),
    Object.defineProperty(this, 'type', {
      value: 'ActTac',
      enumerable: true,
      writable: false
    }),
    Object.defineProperty(this, 'data', {
      value: prop,
      enumerable: true,
      writable: false
    })
  }
  static async validator (action) {
    return Methods.includes(action.data.method) && await actValidator(action)
  }

  static async execute (action) {
    if (action && action.data.method) {
      switch (action.data.method) {
        case 'create':
          delete action._class
          let tac = new wo.Tac(
            Object.assign(action.data,
              action.actorAddress,
              action.actorPubkey,
              action.actorSignature
            ))
          tac.address = wo.Crypto.pubkey2address(wo.Crypto.hash(action.actorSignature, action.hash))
          return await tac.addMe()
        case 'transfer':
          // 内部交易，转发到应用链进程来处理
          await wo.Store.decrease(action.actorAddress, 0 - action.amount, action.address)
          await wo.Store.increase(action.toAddress, action.amount, action.address)
          return true
        case 'exchange':
          // Bancor类型
          return wo.Tac.exchange(action)
        case 'mount':
          return wo.Tac.mount(action)
        default:
          return 0
      }
    }
    return 0
  }
}

module.exports = ActTac
