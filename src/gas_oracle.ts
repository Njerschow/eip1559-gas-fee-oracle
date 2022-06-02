import Web3 from 'web3'
import { FeeHistoryResult } from 'web3-eth'

const web3 = new Web3(
  new Web3.providers.HttpProvider(
    'https://mainnet.infura.io/v3/db432560f9fa454db8b74e26a04d2269'
  )
)

const NUM_HIST_BLOCKS = 200
const SAFELOW = 35
const STANDARD = 60
const FASTEST = 90

interface FormattedBlock {
  number: 'pending' | number
  baseFeePerGas: number
  gasUsedRatio: number
  priorityFeePerGas: number[]
}

function toDec (num: string): number {
  return parseInt(num, 16)
}

function formatFeeHistory (
  result: FeeHistoryResult,
  includePending: boolean
): FormattedBlock[] {
  // @ts-ignore library has oldestBlock typed as a number, but it's a hex string
  const oldestBlock = toDec(result.oldestBlock) // should we substring because of 0x? seems like it doesn't matter
  const numNonPendingResults = result.baseFeePerGas.length - 1
  let blockNum = oldestBlock
  let index = 0
  const blocks = []
  while (blockNum < oldestBlock + numNonPendingResults) {
    blocks.push({
      number: blockNum,
      baseFeePerGas: Number(result.baseFeePerGas[index]),
      gasUsedRatio: Number(result.gasUsedRatio[index]),
      priorityFeePerGas: result.reward[index].map((x: any) => Number(x))
    })
    blockNum += 1
    index += 1
  }
  if (includePending) {
    blocks.push({
      number: 'pending' as const,
      baseFeePerGas: Number(result.baseFeePerGas[result.baseFeePerGas.length]),
      gasUsedRatio: NaN,
      priorityFeePerGas: []
    })
  }
  return blocks
}

interface BaseFeeMixin {
  baseFee?: number
}

export interface GasEstimate {
  low: number
  standard: number
  fast: number
}

export type GasInfo = BaseFeeMixin & GasEstimate

export class GasOracle {
  numHistoricalBlocks: number
  blockHistory: FormattedBlock[]
  currentOldest: number
  currentEstimate: GasInfo
  percs: { [percentile: string]: number }

  constructor (
    numHistoricalBlocks = NUM_HIST_BLOCKS,
    low = SAFELOW,
    standard = STANDARD,
    fast = FASTEST
  ) {
    this.numHistoricalBlocks = numHistoricalBlocks
    this.percs = { low, standard, fast }
    this.currentOldest = 0

    this.blockHistory = []
    this.currentEstimate = { low: 0, standard: 0, fast: 0 }

    this.initEstimator()
  }

  async refreshDesiredBlockHistory () {
    const feeHistory = await web3.eth.getFeeHistory(
      NUM_HIST_BLOCKS,
      'pending',
      Object.values(this.percs)
    )
    this.blockHistory = formatFeeHistory(feeHistory, false)
    // @ts-ignore library has oldestBlock typed as a number, but it's a hex string
    this.currentOldest = toDec(feeHistory.oldestBlock)
  }

  async initEstimator () {
    await this.refreshDesiredBlockHistory()

    this.updateEstimate()
    setInterval(this.updateEstimate.bind(this), 6000) // update slightly faster than 2x per block (~15s)
  }

  async updateEstimate () {
    const feeHistory = await web3.eth.getFeeHistory(
      4, // no need to get more than 4 blocks if we are updating constantly
      'pending',
      Object.values(this.percs)
    )
    const newBlocks = formatFeeHistory(feeHistory, false)
    // @ts-ignore library has oldestBlock typed as a number, but it's a hex string
    const newOldest = toDec(feeHistory.oldestBlock)

    // if the new oldest block is newer than the newest block we have
    const currentNewest = this.currentOldest + (this.blockHistory.length - 1) // sub 1 for pending block
    if (newOldest - currentNewest > newBlocks.length) {
      // just refresh full history if we somehow missed more than 4 blocks
      await this.refreshDesiredBlockHistory()
    }
    const newNewest = newOldest + (newBlocks.length - 1) // sub 1 for pending block
    const blocksToAdd = newNewest - currentNewest
    if (blocksToAdd <= 0 && !!this.currentEstimate.baseFee) return //nothing to do
    // otherwise perform update
    console.log('Updating gas estimate...')

    this.blockHistory.push(...newBlocks.slice(0, blocksToAdd))
    new Array(blocksToAdd).forEach(() => this.blockHistory.shift()) // remove oldest blocks
    this.currentOldest = this.currentOldest + blocksToAdd // update oldest block num

    // get totals for percentiles
    const percentialFeeSums = new Array(Object.keys(this.percs).length).fill(0)

    for (const block of this.blockHistory) {
      for (let i = 0; i < block.priorityFeePerGas.length; i++) {
        percentialFeeSums[i] += block.priorityFeePerGas[i]
      }
    }
    // get averages for percentiles
    const percentialFeeAverages = percentialFeeSums.map(ps =>
      Math.round(ps / this.blockHistory.length)
    )
    // reduce into object
    const gasValues: GasEstimate = {
      low: percentialFeeAverages[0],
      standard: percentialFeeAverages[1],
      fast: percentialFeeAverages[2]
    }

    // update current estimate
    const pendingBlock = await web3.eth.getBlock('pending')
    this.currentEstimate = {
      baseFee: pendingBlock.baseFeePerGas,
      ...gasValues
    }
  }
}
