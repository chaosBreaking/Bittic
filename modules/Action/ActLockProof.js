'use strict'
/**
  Layer 2
  1.从链上申请取得余额锁定证明或者额度锁定证明Proof of Locked(POL)
  LockProof
  {
    hash: '0x12324tgw423fa23hrio2uhiut32gt823i4uth243i9',
    amount: 100,
    blockHeight: 10086,
    blockHash: '0xweg34ga243yt54yh543hj65tbxfdgbxdfbx',
    actorAddress: 'TARbCVuy5g2u2uUYGVIUYyvuIUvhj3',
    actorPubkey: '8912rbiu2341t98o43bguierg98374h7tou34trnh32io87g7ayub',
    actorSignature: 'iu12b3ru32tqoknhiaubwefvbuwfibw',
    packerPubkey: 'aopiwhgawe9igawonibirugnbiuwehnsjc'
    packerSignature: '0xuihg87324hfuiweaoigwnhjriaerwogireabhwg',
    expire: 100   //100块后作废
  }
  2.应用层验证POL，检查是否标准，是否过期
 */
/*
  聚合交易
  {
    actorAddress:[],
    toAddress:[]
  }
*/