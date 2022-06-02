import { FormattedBlock, GasEstimate, GasInfo } from './oracle'
import { fetchFeeHistory, formatFeeHistory, getPendingBlock, toDec, web3 } from './utils'

if (!process.env.INFURA_API_KEY) {
  throw new Error('INFURA_API_KEY environment variable not set')
}

const NUM_HIST_BLOCKS = 200
const SAFELOW = 35
const STANDARD = 60
const FASTEST = 90

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
    const feeHistory = await fetchFeeHistory(
      this.numHistoricalBlocks,
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
    try {
      const feeHistory = await fetchFeeHistory(4, Object.values(this.percs))
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

      this.blockHistory.push(...newBlocks.slice(0, blocksToAdd))
      new Array(blocksToAdd).forEach(() => this.blockHistory.shift()) // remove oldest blocks
      this.currentOldest = this.currentOldest + blocksToAdd // update oldest block num

      // get totals for percentiles
      const percentialFeeSums = new Array(Object.keys(this.percs).length).fill(
        0
      )

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
      const pendingBlock = await getPendingBlock()
      this.currentEstimate = {
        baseFee: pendingBlock.baseFeePerGas,
        ...gasValues
      }
    } catch (e) {
      console.error('Something went wrong when refreshing gas oracle', e)
    }
  }
}
