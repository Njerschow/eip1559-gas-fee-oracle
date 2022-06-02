import { FeeHistoryResult } from 'web3-eth'
import { FormattedBlock } from './oracle'
import Web3 from 'web3'

export const web3 = new Web3(
  new Web3.providers.HttpProvider(
    'https://mainnet.infura.io/v3/' + process.env.INFURA_API_KEY
  )
)

export function toDec (num: string): number {
  return parseInt(num, 16)
}

export async function fetchFeeHistory (
  numBlocks: number,
  percentiles: number[]
) {
  return await web3.eth.getFeeHistory(
    numBlocks, // no need to get more than 4 blocks if we are updating constantly
    'pending',
    Object.values(percentiles)
  )
}

export function formatFeeHistory (
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

export async function getPendingBlock () {
  return await web3.eth.getBlock('pending')
}
