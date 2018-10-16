// eslint-disable-next-line
import * as worker from 'workerize-loader!./tic-bg'

const instance = worker()

export default {
  secword2PubKey: async secword => instance.secword2PubKey(secword),
  secword2Address: async secword => instance.secword2Address(secword),
  isAddress: async address => instance.isAddress(address),
  secword2Account: async secword => instance.secword2Account(secword),
}
