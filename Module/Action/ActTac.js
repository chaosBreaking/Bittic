const Action = require('./Action.js')
const Methods = ["create", "transfer", "exchange", "mount"]
async function actValidator(action){
  switch(action.method){
    case "create":
      if( action.data.name && action.data.symbol && action.data.decimals &&
          Number.isSafeInteger(Number(action.data.decimals)) && 
          !await wo.Tac.getOne({Tac:{name:action.data.name, symbol:action.data.symbol}})
        )
        return true
      return false
    case "transfer":  
      return true
    case "exchange":
      return true
    case "mount":
      return true
    default:
      return null
  }
}

class ActTac extends Action {
  constructor(prop){
    super(prop)
    Object.defineProperty(this,"_class",{
      value:"ActTac",
      enumerable:true,
      writable:false
    }),
    Object.defineProperty(this,"type",{
      value:"ActTac",
      enumerable:true,
      writable:false
    }),    
    Object.defineProperty(this, "data",{
      value:prop,
      enumerable:true,
      writable:false
    })
  }
  static async validator(action){
    return Methods.includes(action.method) && await actValidater(action)
  }
  
  static async execute(action){
    if(action && action.method){
      switch(action.method){
        case "create":
          delete action._class;
          return await wo.Tac.create(action);
        case "transfer":
          //内部交易，转发到应用链进程来处理
          return wo.Tac.transfer(action)
        case "exchange": 
          //Bancor类型
          return wo.Tac.exchange(action)
        case "mount":
          return wo.Tac.mount(action)
        default:
          return 0
      }
    }
    return 0
  }
}

module.exports = ActTac

