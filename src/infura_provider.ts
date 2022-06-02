import { BigNumber, providers } from 'ethers'
import axios from 'axios'
import { Network, Networkish } from '@ethersproject/networks'
import { GasInfo } from './oracle'

const GAS_ORACLE_URL = 'http://localhost:3000/gas'

export class CustomProvider extends providers.BaseProvider {
  txSpeed: 'low' | 'standard' | 'fast'

  constructor (
    network: Networkish | Promise<Network>,
    txSpeed: 'low' | 'standard' | 'fast',
    oracleUrl: string = GAS_ORACLE_URL
  ) {
    super(network)
    this.txSpeed = txSpeed
  }

  async getGasPrice (): Promise<BigNumber> {
    const gasEstimate: GasInfo = await axios.get(GAS_ORACLE_URL)

    // baseFee would never be undefined here except during oracle startup
    return BigNumber.from(gasEstimate.baseFee! + gasEstimate[this.txSpeed])
  }

  async getFeeData (): Promise<providers.FeeData> {
    const gasEstimate: GasInfo = await axios.get(GAS_ORACLE_URL)
    return {
      gasPrice: await this.getGasPrice(), // used for legacy, iiuc legacy clients will be overpaying slightly with EIP 1559 depending on the desired speed
      maxFeePerGas: BigNumber.from(gasEstimate.baseFee! * 2),
      maxPriorityFeePerGas: BigNumber.from(
        gasEstimate.baseFee! + gasEstimate[this.txSpeed]
      )
    }
  }
}
