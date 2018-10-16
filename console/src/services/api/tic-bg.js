import { Crypto as ticCrypto } from 'tic.common'

export const secword2PubKey = secword => ticCrypto.seckey2pubkey(secword)
export const secword2Address = secword => ticCrypto.secword2address(secword)
export const isAddress = address => ticCrypto.isAddress(address)
export const secword2Account = secword => ticCrypto.secword2account(secword)
