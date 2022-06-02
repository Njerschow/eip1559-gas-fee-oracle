export interface BaseFeeMixin {
  baseFee?: number
}

export interface GasEstimate {
  low: number
  standard: number
  fast: number
}

export type GasInfo = BaseFeeMixin & GasEstimate

export interface FormattedBlock {
  number: 'pending' | number
  baseFeePerGas: number
  gasUsedRatio: number
  priorityFeePerGas: number[]
}
