import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import { GasOracle } from './src/gas_oracle'

const gasOracle = new GasOracle()

const app = express()

app.get('/gas', (req, res) => {
  return res.json(gasOracle.currentEstimate)
})

const PORT = process.env.port || 3000
app.listen(PORT, () => {
  console.info('Listening on port ' + PORT)
})
