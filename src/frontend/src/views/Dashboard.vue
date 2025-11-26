<template>
  <div class="dashboard bg-dark text-light min-vh-100">
    <!-- Header -->
    <div class="container-fluid py-4">
      <div class="row">
        <div class="col-12 text-center mb-4">
          <h1 class="display-4 fw-bold text-primary mb-2">Trading Dashboard</h1>
          <p class="lead text-muted">Complete analysis of position history</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="row">
        <div class="col-12 text-center py-5">
          <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3 text-muted">Loading dashboard data...</p>
        </div>
      </div>

      <div v-else>
        <!-- Filters -->
        <div class="row mb-4">
          <div class="col-12">
            <div class="card border-0 shadow">
              <div class="card-body">
                <div class="row g-3 align-items-end">
                  <div class="col-md-2">
                    <label for="symbolFilter" class="form-label fw-semibold">Symbol</label>
                    <select v-model="filters.symbol" @change="loadData" class="form-select" id="symbolFilter">
                      <option value="ALL">All Symbols</option>
                      <option v-for="symbol in availableSymbols" :key="symbol" :value="symbol">
                        {{ symbol }}
                      </option>
                    </select>
                  </div>
                  <div class="col-md-2">
                    <label for="setupFilter" class="form-label fw-semibold">Setup</label>
                    <select v-model="filters.setupDescription" @change="loadData" class="form-select" id="setupFilter">
                      <option value="ALL">All Setups</option>
                      <option v-for="setup in availableSetupDescriptions" :key="setup" :value="setup">
                        {{ setup }}
                      </option>
                    </select>
                  </div>
                  <div class="col-md-2">
                    <label for="startDate" class="form-label fw-semibold">Start Date</label>
                    <input type="date" v-model="filters.startDate" @change="loadData" class="form-control"
                      id="startDate">
                  </div>
                  <div class="col-md-2">
                    <label for="endDate" class="form-label fw-semibold">End Date</label>
                    <input type="date" v-model="filters.endDate" @change="loadData" class="form-control" id="endDate">
                  </div>
                  <div class="col-md-2">
                    <label for="minResult" class="form-label fw-semibold">
                      Min Result ($)
                      <span class="form-text small text-muted">
                        Shows trades with absolute result ≥ this amount
                      </span>
                    </label>
                    <input type="number" v-model="filters.minResult" @change="loadData" class="form-control"
                      id="minResult" placeholder="0.00" step="0.01">
                  </div>
                  <div class="col-md-2">
                    <div class="d-flex gap-2">
                      <button @click="loadData" class="btn btn-primary">
                        <i class="bi bi-arrow-clockwise me-2"></i>
                        Refresh
                      </button>
                      <button @click="resetFilters" class="btn btn-outline-secondary">
                        <i class="bi bi-x-circle me-2"></i>
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Statistics Cards -->
        <div class="row mb-4">
          <div class="col-lg-2 col-md-6 mb-3">
            <div class="card border-0 shadow h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="card-subtitle mb-2 text-muted text-uppercase fw-semibold">Total Positions</h6>
                    <h3 class="card-title mb-0 text-primary">{{ stats.totalPositions }}</h3>
                  </div>
                  <div class="text-primary fs-1">📈</div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-lg-2 col-md-6 mb-3">
            <div class="card border-0 shadow h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="card-subtitle mb-2 text-muted text-uppercase fw-semibold">Total Profit</h6>
                    <h3 class="card-title mb-0 text-success">${{ formatNumber(stats.totalProfit) }}</h3>
                  </div>
                  <div class="text-success fs-1">💰</div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-lg-2 col-md-6 mb-3">
            <div class="card border-0 shadow h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="card-subtitle mb-2 text-muted text-uppercase fw-semibold">Total Loss</h6>
                    <h3 class="card-title mb-0 text-danger">${{ formatNumber(stats.totalLoss) }}</h3>
                  </div>
                  <div class="text-danger fs-1">📉</div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-lg-2 col-md-6 mb-3">
            <div class="card border-0 shadow h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="card-subtitle mb-2 text-muted text-uppercase fw-semibold">Net Result</h6>
                    <h3 class="card-title mb-0" :class="stats.netProfit >= 0 ? 'text-success' : 'text-danger'">
                      ${{ formatNumber(stats.netProfit) }}
                    </h3>
                  </div>
                  <div class="fs-1" :class="stats.netProfit >= 0 ? 'text-success' : 'text-danger'">🧮</div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-lg-2 col-md-6 mb-3">
            <div class="card border-0 shadow h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="card-subtitle mb-2 text-muted text-uppercase fw-semibold">Win Rate</h6>
                    <h3 class="card-title mb-0 text-info">{{ stats.winRate }}%</h3>
                  </div>
                  <div class="text-info fs-1">🎯</div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-lg-2 col-md-6 mb-3">
            <div class="card border-0 shadow h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="card-subtitle mb-2 text-muted text-uppercase fw-semibold">Sharpe Ratio</h6>
                    <h3 class="card-title mb-0 text-warning">{{
                        formatNumber(detailedStats?.performanceMetrics?.sharpeRatio || 0)
                    }}</h3>
                  </div>
                  <div class="text-warning fs-1">📊</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Risk and Performance Analysis -->
        <div class="row mb-4">
          <div class="col-lg-4 mb-3">
            <RiskStatsCard :stats="riskStats" />
          </div>
          <div class="col-lg-4 mb-3">
            <PerformanceMetricsCard :stats="performanceStats" />
          </div>
          <div class="col-lg-4 mb-3">
            <div class="card border-0 shadow h-100">
              <div class="card-header bg-warning text-dark">
                <h5 class="card-title mb-0 fw-semibold">
                  <i class="bi bi-gear me-2"></i>
                  Trade Metrics
                </h5>
              </div>
              <div class="card-body">
                <div class="row g-3">
                  <div class="col-6">
                    <div class="text-center">
                      <div class="h4 text-primary fw-bold">{{ formatNumber(stats.tradeMetrics?.avgLeverage || 0) }}x
                      </div>
                      <div class="text-muted small">Avg Leverage</div>
                    </div>
                  </div>
                  <!-- Removidos avgEntryPrice, avgStopPrice, avgTakeProfit1 -->
                </div>

                <!-- Best/Worst Trades -->
                <div class="row mt-3">
                  <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <span class="text-muted small">Best Trade</span>
                      <span class="badge bg-success">${{ formatNumber(stats.tradeMetrics?.bestProfit || 0) }}</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <span class="text-muted small">Worst Trade</span>
                      <span class="badge bg-danger">${{ formatNumber(stats.tradeMetrics?.worstProfit || 0) }}</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <span class="text-muted small">Most Profitable Symbol</span>
                      <span class="badge bg-primary">{{ stats.tradeMetrics?.mostProfitableSymbol || 'N/A' }}</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                      <span class="text-muted small">Most Profitable Side</span>
                      <span class="badge bg-secondary">{{ stats.tradeMetrics?.mostProfitableSide || 'N/A' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Detailed Statistics -->
        <div class="row mb-4">
          <div class="col-lg-6 mb-3">
            <div class="card border-0 shadow h-100">
              <div class="card-header bg-primary text-white">
                <h5 class="card-title mb-0 fw-semibold">Performance Statistics</h5>
              </div>
              <div class="card-body">
                <div class="row g-3">
                  <div class="col-6">
                    <div class="text-center">
                      <div class="h3 text-success fw-bold">{{ stats.winRate }}%</div>
                      <div class="text-muted small">Win Rate</div>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="text-center">
                      <div class="h3 text-primary fw-bold">{{ stats.totalPositions }}</div>
                      <div class="text-muted small">Total Trades</div>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="text-center">
                      <div class="h3 text-success fw-bold">${{ formatNumber(stats.avgProfit) }}</div>
                      <div class="text-muted small">Average Profit</div>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="text-center">
                      <div class="h3 text-danger fw-bold">${{ formatNumber(stats.avgLoss) }}</div>
                      <div class="text-muted small">Average Loss</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-lg-6 mb-3">
            <div class="card border-0 shadow h-100">
              <div class="card-header bg-primary text-white">
                <h5 class="card-title mb-0 fw-semibold">Extremes</h5>
              </div>
              <div class="card-body">
                <div class="row g-3">
                  <div class="col-6">
                    <div class="text-center">
                      <div class="h3 text-success fw-bold">${{ formatNumber(stats.maxProfit) }}</div>
                      <div class="text-muted small">Highest Profit</div>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="text-center">
                      <div class="h3 text-danger fw-bold">${{ formatNumber(stats.maxLoss) }}</div>
                      <div class="text-muted small">Highest Loss</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Analysis Tables -->
        <div class="row mb-4">
          <div class="col-lg-4 mb-3">
            <AnalysisTable title="Symbol Analysis" columnTitle="Symbol" :data="detailedStats?.symbolAnalysis || {}" />
          </div>
          <div class="col-lg-4 mb-3">
            <AnalysisTable title="Side Analysis" columnTitle="Side" :data="detailedStats?.sideAnalysis || {}" />
          </div>
          <div class="col-lg-4 mb-3">
            <SetupAnalysisCard :positions="positions" />
          </div>
        </div>

        <!-- Performance Charts -->
        <div class="row mb-4">
          <div class="col-lg-8 mb-3">
            <div class="card border-0 shadow h-100">
              <div class="card-header bg-success text-white">
                <h5 class="card-title mb-0 fw-semibold">
                  <i class="bi bi-graph-up me-2"></i>
                  Cumulative Profit Over Time
                </h5>
              </div>
              <div class="card-body">
                <PerformanceChart :positions="positions" />
              </div>
            </div>
          </div>
          <div class="col-lg-4 mb-3">
            <div class="card border-0 shadow h-100">
              <div class="card-header bg-success text-white">
                <h5 class="card-title mb-0 fw-semibold">
                  <i class="bi bi-pie-chart me-2"></i>
                  Profit by Symbol
                </h5>
              </div>
              <div class="card-body">
                <ProfitBySymbolChart :positions="positions" />
              </div>
            </div>
          </div>
        </div>

        <!-- Loss by Symbol Chart -->
        <div class="row mb-4">
          <div class="col-lg-4 mb-3">
            <div class="card border-0 shadow h-100">
              <div class="card-header bg-danger text-white">
                <h5 class="card-title mb-0 fw-semibold">
                  <i class="bi bi-pie-chart me-2"></i>
                  Loss by Symbol
                </h5>
              </div>
              <div class="card-body">
                <LossBySymbolChart :positions="positions" />
              </div>
            </div>
          </div>
        </div>

        <!-- Monthly Performance Chart -->
        <div class="row mb-4">
          <div class="col-12">
            <div class="card border-0 shadow">
              <div class="card-header bg-warning text-dark">
                <h5 class="card-title mb-0 fw-semibold">
                  <i class="bi bi-bar-chart me-2"></i>
                  Monthly Performance
                </h5>
              </div>
              <div class="card-body">
                <MonthlyPerformanceChart :positions="positions" />
              </div>
            </div>
          </div>
        </div>

        <!-- Costs Panel -->
        <div class="row mb-4">
          <div class="col-12">
            <div class="card border-0 shadow">
              <div class="card-header bg-warning text-dark">
                <h5 class="card-title mb-0 fw-semibold">
                  <i class="bi bi-calculator me-2"></i>
                  Trading Costs Analysis
                </h5>
              </div>
              <div class="card-body">
                <div class="row g-4">
                  <!-- Commission Summary -->
                  <div class="col-lg-4">
                    <div class="text-center p-3 border-end border-secondary">
                      <div class="h2 text-warning fw-bold mb-2">${{ formatNumber(totalCommission) }}</div>
                      <div class="text-muted mb-2">Total Commission</div>
                      <div class="small text-muted">
                        Avg: ${{ formatNumber(averageCommission) }} per trade
                      </div>
                    </div>
                  </div>

                  <!-- Funding Summary -->
                  <div class="col-lg-4">
                    <div class="text-center p-3 border-end border-secondary">
                      <div class="h2 text-info fw-bold mb-2">${{ formatNumber(totalFunding) }}</div>
                      <div class="text-muted mb-2">Total Funding</div>
                      <div class="small text-muted">
                        Avg: ${{ formatNumber(averageFunding) }} per trade
                      </div>
                    </div>
                  </div>

                  <!-- Total Costs -->
                  <div class="col-lg-4">
                    <div class="text-center p-3">
                      <div class="h2 text-danger fw-bold mb-2">${{ formatNumber(totalCosts) }}</div>
                      <div class="text-muted mb-2">Total Trading Costs</div>
                      <div class="small text-muted">
                        {{ ((totalCosts / stats.netProfit) * 100).toFixed(1) }}% of net profit
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Detailed Breakdown -->
                <div class="row mt-4">
                  <div class="col-12">
                    <h6 class="text-muted mb-3">Cost Breakdown by Symbol</h6>
                    <div class="table-responsive">
                      <table class="table table-sm table-borderless">
                        <thead class="table-dark">
                          <tr>
                            <th>Symbol</th>
                            <th class="text-end">Commission</th>
                            <th class="text-end">Funding</th>
                            <th class="text-end">Total Costs</th>
                            <th class="text-end">% of Net Profit</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(costs, symbol) in costsBySymbol" :key="symbol">
                            <td>
                              <span class="badge bg-secondary">{{ symbol }}</span>
                            </td>
                            <td class="text-end text-warning">${{ formatNumber(costs.commission) }}</td>
                            <td class="text-end text-info">${{ formatNumber(costs.funding) }}</td>
                            <td class="text-end text-danger fw-bold">${{ formatNumber(costs.total) }}</td>
                            <td class="text-end text-muted small">
                              {{ costs.percentageOfProfit }}%
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Positions Table -->
        <div class="row">
          <div class="col-12">
            <div class="card border-0 shadow">
              <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h5 class="card-title mb-0 fw-semibold">Position History</h5>
                <div class="d-flex align-items-center gap-2">
                  <span class="text-white-50 small">Showing {{ positions.length }} positions</span>
                  <router-link to="/position-history/new" class="btn btn-success btn-sm ms-2">
                    <i class="bi bi-plus-lg"></i> Add
                  </router-link>
                </div>
              </div>
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table table-hover mb-0">
                    <thead class="table-dark">
                      <tr>
                        <th>Symbol</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Average Price</th>
                        <th>Close Price</th>
                        <th>Leverage</th>
                        <th>R:R</th>
                        <th>Result</th>
                        <th>Costs</th>
                        <th>Volume/Sentiment</th>
                        <th>Trade Info</th>
                        <th>Open Date</th>
                        <th>Close Date</th>
                        <th>Edit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="position in positions" :key="position.positionId">
                        <td>
                          <div>
                            <span class="badge bg-primary">{{ position.symbol }}</span>
                            <div class="small text-muted mt-1">ID: {{ position.positionId }}</div>
                            <div class="small text-muted mt-1">
                              <div v-if="position.tradeInfo?.found && position.tradeInfo.trade?.setup_description"
                                class="small">
                                <span class="badge bg-info">{{ position.tradeInfo.trade.setup_description }}</span>
                              </div>
                              <div v-else class="text-muted small">-</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span class="badge" :class="position.positionSide === 'LONG' ? 'bg-success' : 'bg-danger'">
                            {{ position.positionSide }}
                          </span>
                        </td>
                        <td>{{ position.closePositionAmt }}</td>
                        <td>${{ formatNumber(parseFloat(position.avgPrice), 5) }}</td>
                        <td>${{ formatNumber(position.avgClosePrice, 5) }}</td>
                        <td>{{ position.leverage }}x</td>
                        <td>
                          <span class="fw-semibold">{{ calculateFinancialRR(position) }}</span>
                          <div class="small text-muted mt-1">
                            Risk: ${{ formatNumber(calculateRiskAmount(position)) }}
                          </div>
                        </td>
                        <td>
                          <span class="fw-bold"
                            :class="parseFloat(position.netProfit) >= 0 ? 'text-success' : 'text-danger'">
                            ${{ formatNumber(parseFloat(position.netProfit)) }}
                          </span>
                        </td>
                        <td>
                          <div class="small">
                            <div class="text-warning">${{ formatNumber(parseFloat(position.positionCommission)) }}</div>
                            <div class="text-info">${{ formatNumber(parseFloat(position.totalFunding)) }}</div>
                          </div>
                        </td>
                        <td>

                          <div v-if="position.tradeInfo?.found" class="small">
                            <div class="text-muted">Volume: ${{ position.tradeInfo.trade?.volume }}
                            </div>
                            <div class="text-muted">Stop: ${{ position.tradeInfo.trade?.sentiment }}
                            </div>
                          </div>
                          <div v-else class="text-muted small">No trade info</div>

                        </td>
                        <td>
                          <div v-if="position.tradeInfo?.found" class="small">
                            <div class="text-success">Trade #{{ position.tradeInfo.trade?.id }}</div>
                            <div class="text-muted">Entry: ${{ formatNumber(parseFloat(position.avgPrice) || 0, 5) }}
                            </div>
                            <div class="text-muted">Stop: ${{ formatNumber(position.tradeInfo.trade?.stop || 0, 5) }}
                            </div>
                          </div>
                          <div v-else class="text-muted small">No trade info</div>
                        </td>
                        <td>{{ formatDate(position.openTime) }}</td>
                        <td>{{ formatDate(getEffectiveCloseTime(position)) }}</td>
                        <td>
                          <router-link :to="`/position-history/edit/${position.positionId}`"
                            class="btn btn-sm btn-outline-primary" title="Edit Position">
                            <i class="bi bi-pencil"></i>
                          </router-link>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { PositionHistory, PositionStats, DetailedRiskStats } from '../types/positionHistory'
import PerformanceChart from '../components/PerformanceChart.vue'
import ProfitBySymbolChart from '../components/ProfitBySymbolChart.vue'
import LossBySymbolChart from '../components/LossBySymbolChart.vue'
import MonthlyPerformanceChart from '../components/MonthlyPerformanceChart.vue'
import RiskStatsCard from '../components/RiskStatsCard.vue'
import PerformanceMetricsCard from '../components/PerformanceMetricsCard.vue'
import AnalysisTable from '../components/AnalysisTable.vue'
import SetupAnalysisCard from '../components/SetupAnalysisCard.vue'

// Types
interface CostsBySymbol {
  commission: number
  funding: number
  total: number
  percentageOfProfit: string
}

/**
 * Helper function to get the effective close time, using updateTime as fallback
 */
const getEffectiveCloseTime = (position: PositionHistory): number => {
  return position.closeTime || position.updateTime
}

/**
 * Calculate the risk amount based on stop loss or margin
 */
const calculateRiskAmount = (position: PositionHistory): number => {
  try {
    const quantity = parseFloat(position.closePositionAmt)
    const avgPrice = parseFloat(position.avgPrice)
    const leverage = position.leverage

    // Check if we have trade info with stop loss
    if (position.tradeInfo?.found && position.tradeInfo.trade?.stop) {
      const stopPrice = position.tradeInfo.trade.stop

      // Calculate the price difference to stop loss
      const priceDifference = Math.abs(avgPrice - stopPrice)

      // Calculate the potential loss in dollars (price difference * quantity)
      const potentialLoss = priceDifference * quantity

      // Calculate the margin used (position value / leverage)
      const positionValue = quantity * avgPrice
      const marginUsed = positionValue / leverage

      // Risk is the potential loss (limited by margin used)
      return Math.min(potentialLoss, marginUsed)
    } else {
      // Fallback to margin-based calculation if no stop loss info
      const positionValue = quantity * avgPrice
      return positionValue / leverage
    }
  } catch (error) {
    console.error('Error calculating risk amount:', error)
    return 0
  }
}

/**
 * Calculate financial risk/reward ratio based on stop loss and leverage
 * Risk = Potential loss based on stop loss distance and leverage
 * Reward = Net profit from the trade
 */
const calculateFinancialRR = (position: PositionHistory): string => {
  try {
    const quantity = parseFloat(position.closePositionAmt)
    const avgPrice = parseFloat(position.avgPrice)
    const leverage = position.leverage
    const netProfit = parseFloat(position.netProfit)

    // Check if we have trade info with stop loss
    if (position.tradeInfo?.found && position.tradeInfo.trade?.stop) {
      const stopPrice = position.tradeInfo.trade.stop

      // Calculate the price difference to stop loss
      const priceDifference = Math.abs(avgPrice - stopPrice)

      // Calculate the potential loss in dollars (price difference * quantity)
      const potentialLoss = priceDifference * quantity

      // Calculate the margin used (position value / leverage)
      const positionValue = quantity * avgPrice
      const marginUsed = positionValue / leverage

      // Risk is the potential loss (limited by margin used)
      const risk = Math.min(potentialLoss, marginUsed)

      // Reward is the net profit
      const reward = netProfit

      // Calculate R:R ratio
      if (risk > 0 && reward > 0) {
        const ratio = reward / risk
        return `${ratio.toFixed(2)}`
      } else if (risk > 0) {
        return `-1`
      } else {
        return '-'
      }
    } else {
      // Fallback to margin-based calculation if no stop loss info
      const positionValue = quantity * avgPrice
      const marginUsed = positionValue / leverage
      const risk = marginUsed
      const reward = netProfit

      if (risk > 0 && reward > 0) {
        const ratio = reward / risk
        return `${ratio.toFixed(2)}`
      } else if (risk > 0) {
        return `-1`
      } else {
        return '-'
      }
    }
  } catch (error) {
    console.error('Error calculating financial R:R:', error)
    return '-'
  }
}

// Reactive data
const loading = ref(false)
const positions = ref<PositionHistory[]>([])
const stats = ref<PositionStats>({
  totalPositions: 0,
  totalProfit: 0,
  totalLoss: 0,
  netProfit: 0,
  winRate: 0,
  avgProfit: 0,
  avgLoss: 0,
  maxProfit: 0,
  maxLoss: 0,
  profitBySymbol: {},
  profitBySide: {}
})
const detailedStats = ref<DetailedRiskStats | null>(null)
const availableSymbols = ref<string[]>([])
const availableSetupDescriptions = ref<string[]>([])
const today = new Date();
const twoMonthsAgo = new Date(new Date().setMonth(today.getMonth() - 2));

const filters = ref({
  symbol: 'ALL',
  setupDescription: 'ALL',
  startDate: twoMonthsAgo.toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  minResult: 0
});

// Computed properties for risk stats
const riskStats = computed(() => {
  if (!detailedStats.value) {
    return {
      avgRiskPerTrade: 0,
      avgRiskRewardRatio: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      tradesWithPositiveRR: 0,
      tradesWithNegativeRR: 0,
      bestRiskRewardRatio: 0,
      worstRiskRewardRatio: 0,
      avgRiskReturnedPositive: 0
    }
  }

  return {
    avgRiskPerTrade: detailedStats.value.riskAnalysis.avgRiskPerTrade,
    avgRiskRewardRatio: detailedStats.value.riskRewardAnalysis.avgRiskRewardRatio,
    sharpeRatio: detailedStats.value.performanceMetrics.sharpeRatio,
    maxDrawdown: detailedStats.value.performanceMetrics.maxDrawdown,
    tradesWithPositiveRR: detailedStats.value.riskRewardAnalysis.tradesWithPositiveRR,
    tradesWithNegativeRR: detailedStats.value.riskRewardAnalysis.tradesWithNegativeRR,
    bestRiskRewardRatio: detailedStats.value.riskRewardAnalysis.bestRiskRewardRatio,
    worstRiskRewardRatio: detailedStats.value.riskRewardAnalysis.worstRiskRewardRatio,
    avgRiskReturnedPositive: detailedStats.value.riskRewardAnalysis.avgRiskReturnedPositive
  }
})

const performanceStats = computed(() => {
  if (!detailedStats.value) {
    return {
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      recoveryFactor: 0,
      maxDrawdown: 0,
      avgDrawdown: 0
    }
  }

  return {
    sharpeRatio: detailedStats.value.performanceMetrics.sharpeRatio,
    sortinoRatio: detailedStats.value.performanceMetrics.sortinoRatio,
    calmarRatio: detailedStats.value.performanceMetrics.calmarRatio,
    recoveryFactor: detailedStats.value.performanceMetrics.recoveryFactor,
    maxDrawdown: detailedStats.value.performanceMetrics.maxDrawdown,
    avgDrawdown: detailedStats.value.performanceMetrics.avgDrawdown
  }
})

// Computed properties for costs
const totalCommission = computed(() => {
  return positions.value.reduce((total: number, position: PositionHistory) => {
    return total + parseFloat(position.positionCommission || '0')
  }, 0)
})

const totalFunding = computed(() => {
  return positions.value.reduce((total: number, position: PositionHistory) => {
    return total + parseFloat(position.totalFunding || '0')
  }, 0)
})

const totalCosts = computed(() => {
  return totalCommission.value + totalFunding.value
})

const averageCommission = computed(() => {
  return positions.value.length > 0 ? totalCommission.value / positions.value.length : 0
})

const averageFunding = computed(() => {
  return positions.value.length > 0 ? totalFunding.value / positions.value.length : 0
})

const costsBySymbol = computed(() => {
  const costs: { [key: string]: CostsBySymbol } = {}

  positions.value.forEach((position: PositionHistory) => {
    const symbol = position.symbol
    const commission = parseFloat(position.positionCommission || '0')
    const funding = parseFloat(position.totalFunding || '0')
    const netProfit = parseFloat(position.netProfit || '0')

    if (!costs[symbol]) {
      costs[symbol] = {
        commission: 0,
        funding: 0,
        total: 0,
        percentageOfProfit: '0.0'
      }
    }

    costs[symbol].commission += commission
    costs[symbol].funding += funding
    costs[symbol].total += commission + funding

    // Calculate percentage of net profit
    if (netProfit !== 0) {
      const percentage = ((commission + funding) / Math.abs(netProfit)) * 100
      costs[symbol].percentageOfProfit = percentage.toFixed(1)
    }
  })

  return costs
})

// Methods
const loadAvailableSymbols = async () => {
  try {
    const response = await fetch('/api/position-history/symbols')

    if (!response.ok) {
      console.error('HTTP error loading symbols:', response.status, response.statusText)
      return
    }

    const text = await response.text()
    if (!text) {
      console.warn('Empty response from symbols endpoint')
      availableSymbols.value = []
      return
    }

    const result = await JSON.parse(text)
    if (result.success) {
      availableSymbols.value = result.data || []
    } else {
      console.error('API error loading symbols:', result.error)
      availableSymbols.value = []
    }
  } catch (error) {
    console.error('Error loading symbols:', error)
    availableSymbols.value = []
  }
}

const loadAvailableSetupDescriptions = async () => {
  try {
    const response = await fetch('/api/position-history/setup-descriptions')

    if (!response.ok) {
      console.error('HTTP error loading setup descriptions:', response.status, response.statusText)
      return
    }

    const text = await response.text()
    if (!text) {
      console.warn('Empty response from setup descriptions endpoint')
      availableSetupDescriptions.value = []
      return
    }

    const result = await JSON.parse(text)
    if (result.success) {
      availableSetupDescriptions.value = result.data || []
    } else {
      console.error('API error loading setup descriptions:', result.error)
      availableSetupDescriptions.value = []
    }
  } catch (error) {
    console.error('Error loading setup descriptions:', error)
    availableSetupDescriptions.value = []
  }
}

const loadData = async () => {
  loading.value = true
  try {
    // Load available symbols if not loaded yet
    if (availableSymbols.value.length === 0) {
      await loadAvailableSymbols()
    }

    // Load available setup descriptions if not loaded yet
    if (availableSetupDescriptions.value.length === 0) {
      await loadAvailableSetupDescriptions()
    }

    // Load position data
    await loadPositions()

    // Load statistics
    await loadStats()

    // Load detailed risk statistics
    await loadDetailedRiskStats()
  } catch (error) {
    console.error('Error loading data:', error)
  } finally {
    loading.value = false
  }
}

const loadPositions = async () => {
  try {
    const params = new URLSearchParams({
      symbol: filters.value.symbol
    })

    if (filters.value.setupDescription !== 'ALL') {
      params.append('setupDescription', filters.value.setupDescription)
    }

    if (filters.value.startDate) {
      params.append('startTs', new Date(filters.value.startDate).getTime().toString())
    }
    if (filters.value.endDate) {
      params.append('endTs', new Date(filters.value.endDate).getTime().toString())
    }

    params.append('minResult', filters.value.minResult.toString())

    const response = await fetch(`/api/position-history?${params}`)
    const result = await response.json()

    if (result.success) {
      positions.value = result.data
    }
  } catch (error) {
    console.error('Error loading positions:', error)
  }
}

const loadStats = async () => {
  try {
    const params = new URLSearchParams({
      symbol: filters.value.symbol
    })

    if (filters.value.setupDescription !== 'ALL') {
      params.append('setupDescription', filters.value.setupDescription)
    }

    if (filters.value.startDate) {
      params.append('startTs', new Date(filters.value.startDate).getTime().toString())
    }
    if (filters.value.endDate) {
      params.append('endTs', new Date(filters.value.endDate).getTime().toString())
    }

    if (filters.value.minResult !== 0) {
      params.append('minResult', filters.value.minResult.toString())
    }

    const response = await fetch(`/api/position-history/stats?${params}`)
    const result = await response.json()

    if (result.success) {
      stats.value = result.data
    }
  } catch (error) {
    console.error('Error loading statistics:', error)
  }
}

const loadDetailedRiskStats = async () => {
  try {
    const params = new URLSearchParams({
      symbol: filters.value.symbol
    })

    if (filters.value.setupDescription !== 'ALL') {
      params.append('setupDescription', filters.value.setupDescription)
    }

    if (filters.value.startDate) {
      params.append('startTs', new Date(filters.value.startDate).getTime().toString())
    }
    if (filters.value.endDate) {
      params.append('endTs', new Date(filters.value.endDate).getTime().toString())
    }

    if (filters.value.minResult !== 0) {
      params.append('minResult', filters.value.minResult.toString())
    }

    const response = await fetch(`/api/position-history/risk-stats?${params}`)
    const result = await response.json()

    if (result.success) {
      detailedStats.value = result.data
    }
  } catch (error) {
    console.error('Error loading detailed risk statistics:', error)
  }
}

const resetFilters = () => {
  const today = new Date();
  const twoMonthsAgo = new Date(new Date().setMonth(today.getMonth() - 2));
  filters.value = {
    symbol: 'ALL',
    setupDescription: 'ALL',
    startDate: twoMonthsAgo.toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    minResult: 0
  }
  loadData()
}

const formatNumber = (value: number, maximum: number = 2): string => {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maximum
  })
}

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('en-US')
}

// Lifecycle
onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* Estilos customizados mínimos para complementar o Bootstrap */
.dashboard {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  min-height: 100vh;
}

.card {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.table {
  color: inherit;
}

.table-dark {
  background: rgba(0, 0, 0, 0.3);
}

.table-hover tbody tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

.form-control,
.form-select {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: inherit;
}

.form-control:focus,
.form-select:focus {
  background: rgba(255, 255, 255, 0.15);
  border-color: #0d6efd;
  color: inherit;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}

.form-control::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

/* Animações suaves */
.btn {
  transition: all 0.3s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

/* Efeitos de glassmorphism */
.card-header {
  backdrop-filter: blur(10px);
  background: rgba(13, 110, 253, 0.8) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.card-footer {
  backdrop-filter: blur(10px);
  background: rgba(0, 0, 0, 0.3) !important;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* Melhorias nos badges */
.badge {
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* Responsividade adicional */
@media (max-width: 768px) {
  .display-4 {
    font-size: 2rem;
  }

  .h3 {
    font-size: 1.5rem;
  }

  .card-body {
    padding: 1rem;
  }
}

@media (max-width: 576px) {
  .display-4 {
    font-size: 1.5rem;
  }

  .fs-1 {
    font-size: 2rem !important;
  }
}

/* Scrollbar customizada para dark mode */
.table-responsive::-webkit-scrollbar {
  height: 8px;
}

.table-responsive::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.table-responsive::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

.table-responsive::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* Estilos específicos para o painel de custos */
.card-header.bg-warning {
  background: linear-gradient(135deg, #ffc107 0%, #ff8c00 100%) !important;
}

.border-end.border-secondary {
  border-color: rgba(255, 255, 255, 0.2) !important;
}

.table-sm td {
  padding: 0.5rem;
  vertical-align: middle;
}

.table-borderless td {
  border: none;
}

/* Melhorias para os cards de estatísticas menores */
@media (max-width: 1200px) {
  .col-lg-2 .card-title {
    font-size: 1.2rem;
  }

  .col-lg-2 .fs-1 {
    font-size: 1.5rem !important;
  }
}

@media (max-width: 768px) {
  .col-lg-2 .card-title {
    font-size: 1rem;
  }

  .col-lg-2 .fs-1 {
    font-size: 1.2rem !important;
  }
}

/* Estilos para os gráficos */
.card-body canvas {
  max-height: 300px;
}

/* Melhorias para responsividade dos gráficos */
@media (max-width: 992px) {
  .chart-container {
    height: 250px !important;
  }
}

@media (max-width: 768px) {
  .chart-container {
    height: 200px !important;
  }
}
</style> 
