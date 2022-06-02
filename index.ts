import express from 'express'
import { GasOracle } from './gas_oracle'

const gasOracle = new GasOracle()

// setInterval(() => {
//   console.log(gasOracle.currentEstimate)
// }, 6000)

const app = express()

app.get('/gas', (req, res) => {
  return res.json(gasOracle.currentEstimate)
})
