import dotenv from 'dotenv'
dotenv.config()
import sinon from 'sinon'
import chai from 'chai'
import * as utils from '../src/utils'
import * as oracle from '../src/gas_oracle'

const expect = chai.expect

describe('', function () {
  afterEach(function () {
    sinon.restore()
  })

  let gasOracle: oracle.GasOracle

  beforeEach(function () {
    const feeStub = sinon.stub(utils, 'fetchFeeHistory')
    const blockStub = sinon.stub(utils, 'getPendingBlock').returns(Promise.resolve({
        baseFeePerGas: 9999,
        difficulty: 14058834868113894,
        extraData: '0xd883010a0f846765746888676f312e31372e36856c696e7578',
        gasLimit: 29999943,
        gasUsed: 1727064,
        hash: 'test',
        logsBloom: '0x2000208010800003400008800000001000d0001082000000000008000800080008801800004080020400000800000c0200000000200020000004008240000000000008000020010088000a08000000400100900202200000480980200000200086c400400200400000008000103448000000000000204800000000140046000000020441801000200040422020010104000c041009000044000460010e05008002088001088028400008003000001000041682001004000080000010000400000008000202a210040000040040880080010000c80921820000000000000030010021290880804000008000200100000028010000100000008010000200100000',
        miner: 'test',
        mixHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        nonce: 'test',
        number: 14892318,
        parentHash: '0x448482eca41d7dc632b18225c7add03599655f491f7dcd49b207251e877f5e0f',
        receiptsRoot: '0x75fe48e90285f3a4c6674eb0f7de1c0f8fe74f741ca867adf708e40950286048',
        sha3Uncles: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
        size: 9317,
        stateRoot: '0xbc3a6531090ede79309a3db8cd3330b2a54d90661579fb8e013560140e43e794',
        timestamp: 1654192126,
        totalDifficulty: 0,
        transactions: [
          '0x29761f714d287e3bff30cde7abb9606b21832c5d6e45f37272a9b01dcdf5276c',
          '0xa6889ed263f30e2d7dd9f6b63f2b69de3247e34085b72430c09d998dd928a419',
          '0x151fe0f0c4543d4e2dc40cb460dbdb0a322756be5708fc61bcdc39c56fee3136',
          '0x9a89f2afc3ae51154bfb949a82ce5e71b0057f3104da1f8768046a7f790483e3',
          '0x2399d96dea9993463a0102587adee136c2938cd713058a2a60cd63d26e634a11',
          '0x1a7818ebe5e89f5e8514a75132bc6a0872859aaabf7c70e34c4c890be9582763',
          '0x39faf2231079816cecccc7ac98054a8cc023c09623374acc0629aea13804db2c',
          '0x026d8f8dde7d3bd23d5f41180cd76ef23f6f0feecdad960268a58e802784f6ca',
          '0x9ffb74089cf903c088ac9a30ae47e00e663b7ec329fc9a8eb073b46faa73dc47',
          '0x54215fbca788fd220c349aee5b51ee3ad8a710441f61801b1511a5a4b9b1f799',
          '0x4059fc6ad44292b4694f6bfe92798c531a19cad9376b498f40a7888c02da7535',
          '0x5d871e3161b5545101f0cba2282236c5e9ca8f2ecad061ab7e249458a227b48c',
          '0xd8cfc0d4d9d29876483e0fb1609f823b425c8a8923468ddea9f0dba66af725a7',
          '0x04e34984d1f4ed8d2978bf2d7dd524a23e4d06cb3ea34b8129484dc81e64f6e7',
          '0x8aaa0d8a4838703834e247d4b4a164de9c3230450ad5259604e8e39dc76f7370',
          '0x7f714da6f33bf2b0ca868e0becb22dde2ae40262d2d76b6a221b55c566852bc9',
          '0xad2844d223e898061291aafe22c8cd75dad3c9cd806e355375981f5e82687dfb',
          '0xfe132b9d8a1272298582b24576e6fff0004affe781a78b0ed82cda31a3030933',
          '0xe8912ee75c61b35c2c87633831a5fb56ba64d4d9421e3f2f3a06783538df44e6',
          '0x81459841e2a680efc934a9ed946f8f99f9c561e243baf9211e4790bb36fdac7c',
          '0x17cea9eeb2cba05cb6b86e7c3cc3573a9b98d86c5a69d02c3ebf51662288552f',
          '0x04b1509472824decf10a78c1ad2ce7464db98e34ebc11638d7a2e62df83239a4',
          '0x30c792f8932aa0a98b6bf6236420e52f4fa23ccf3ab9ac458be76b00ed48ad1b',
          '0x11732dc169f3870f39633f9df45a5be818c718e1c244301aa8d3b386c00669ed',
          '0xb3ad75d06503e6b4fddf93b2eaff066ddf1fce7a57d99a41c484ccc9c14dd822',
          '0x2da960ef3f840bb6f57dd5903b9c7695526528bd5c5f93ad4040097af3a19019'
        ],
        transactionsRoot: '0x27c68a1f4532615d933d31fc779071491cc528485c4019ce47c9ad321c4a8679',
        transactionRoot: '193',
        uncles: []
      }))
    
    
    feeStub.returns(
      Promise.resolve({
        baseFeePerGas: new Array(6).fill('0xe00000000'),
        gasUsedRatio: [0.1843998, 0.7446671, 0.08709598256030347, 0],
        oldestBlock: 10, // should be a hex string but library is mis-typed
        reward: [
          ...new Array(6).fill(['0x50000000', '0x50000000', '0x150000000']),
          ...new Array(6).fill(['0x50000000', '0x70000000', '0x100000000'])
        ]
      })
    )
    feeStub.withArgs(4, sinon.match.any).returns(
      Promise.resolve({
        baseFeePerGas: new Array(4).fill('0x10000000'),
        gasUsedRatio: [0.1843998, 0.7446671, 0.08709598256030347, 0],
        oldestBlock: 10+200-1, // pretend 1 new block came in
        reward: new Array(4).fill(['0x10000000', '0x20000000', '0x30000000'])
      })
    )
  })

  it('should have the proper currentEstimate', async function () {
    // const feeStub = sinon.stub(utils.web3.eth, 'getFeeHistory').returns(
    //   Promise.resolve({
    //     baseFeePerGas: new Array(200).fill('0xe00000000'),
    //     gasUsedRatio: [0.1843998, 0.7446671, 0.08709598256030347, 0],
    //     oldestBlock: 10, // should be a hex string but library is mis-typed
    //     reward: [
    //       ...new Array(100).fill(['0x50000000', '0x50000000', '0x150000000']),
    //       ...new Array(100).fill(['0x50000000', '0x70000000', '0x100000000'])
    //     ]
    //   })
    // )
    gasOracle = new oracle.GasOracle(6)
    await new Promise(r => setTimeout(r, 1000))

    const est = gasOracle.currentEstimate
    expect(est.baseFee).to.be.eql(9999)
    expect(est.low).to.be.eql(939524096)
    expect(est.standard).to.be.eql(1040187392)
    expect(est.fast).to.be.eql(3825205248)
  })
})
