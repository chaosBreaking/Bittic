const Ling = wo.Ling

class Tac extends Ling {
  constructor (prop) {
    super(prop)
    this.setProp(prop)
    this._tablekey = 'address'
  }
  static async transfer (option) {
    return null
  }
  static async exchange (option) {
    return null
  }
  static async mount (option) {
    return null
  }
}
Object.defineProperty(Tac.prototype, '_class', {
  value: 'Tac',
  enumerable: true,
  writable: false
})
Object.defineProperty(Tac.prototype, '_model',
  {
    value: {
      address: { default: undefined, sqlite: 'TEXT UNIQUE', mysql: 'VARCHAR(64) PRIMARY KEY' },
      name: { default: undefined, sqlite: 'TEXT UNIQUE', mysql: 'VARCHAR(256)' },
      symbol: { default: undefined, sqlite: 'TEXT', mysql: 'VARCHAR(256)' },
      version: { default: undefined, sqlite: 'TEXT' },
      decimals: { default: 1, sqlite: 'NUMERIC', mysql: 'BIGINT' },
      totalSupply: { default: 0, sqlite: 'NUMERIC', mysql: 'BIGINT' },
      actorPubkey: { default: undefined, sqlite: 'TEXT', mysql: 'BINARY(32)' },
      actorAddress: { default: undefined, sqlite: 'TEXT', mysql: 'VARCHAR(50)' },
      actorSignature: { default: undefined, sqlite: 'TEXT', mysql: 'BINARY(64)' },
      describe: { default: undefined, sqlite: 'TEXT', mysql: 'VARCHAR(256)' },
      timestamp: { default: new Date(), sqlite: 'TEXT', mysql: 'VARCHAR(256)' },
      ACL: { default: undefined, sqlite: 'TEXT', mysql: 'VARCHAR(256)' },
      meta: { default: undefined, sqlite: 'TEXT', mysql: 'VARCHAR(256)' }
    },
    enumerable: true,
    writable: false
  })
Object.defineProperty(Tac, '_table', {
  value: 'Tac',
  enumerable: true
})
Object.defineProperty(Tac, 'api', {
  value: {},
  enumerable: true
})
Tac.api.getTac = async function (option) {
  return await Tac.getOne(option)
}

module.exports = Tac
