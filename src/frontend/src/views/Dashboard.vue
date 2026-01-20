<template>
  <div class="dashboard min-h-screen">
    <!-- Header -->
    <div class="w-full px-4 py-8">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-blue-400 mb-2">Trading Dashboard</h1>
        <p class="text-xl text-gray-400">Complete analysis of position history</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p class="mt-4 text-gray-400">Loading dashboard data...</p>
        </div>
      </div>

      <div v-else>
        <!-- Filters -->
        <div class="mb-8">
          <div class="glass-card p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
              <div>
                <label for="symbolFilter" class="block text-sm font-semibold mb-2">Symbol</label>
                <select v-model="filters.symbol" @change="loadData" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none appearance-none" id="symbolFilter">
                  <option value="ALL">All Symbols</option>
                  <option v-for="symbol in availableSymbols" :key="symbol" :value="symbol">
                    {{ symbol }}
                  </option>
                </select>
              </div>
              <div>
                <label for="setupFilter" class="block text-sm font-semibold mb-2">Setup</label>
                <select v-model="filters.setupDescription" @change="loadData" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none appearance-none" id="setupFilter">
                  <option value="ALL">All Setups</option>
                  <option v-for="setup in availableSetupDescriptions" :key="setup" :value="setup">
                    {{ setup }}
                  </option>
                </select>
              </div>
              <div>
                <label for="startDate" class="block text-sm font-semibold mb-2">Start Date</label>
                <input type="date" v-model="filters.startDate" @change="loadData" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none"
                  id="startDate">
              </div>
              <div>
                <label for="endDate" class="block text-sm font-semibold mb-2">End Date</label>
                <input type="date" v-model="filters.endDate" @change="loadData" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none" id="endDate">
              </div>
              <div>
                <label for="minResult" class="block text-sm font-semibold mb-2">
                  Min Result ($)
                  <span class="block text-xs text-gray-400 font-normal">
                    Abs result ≥ amount
                  </span>
                </label>
                <input type="number" v-model="filters.minResult" @change="loadData" class="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none"
                  id="minResult" placeholder="0.00" step="0.01">
              </div>
              <div class="flex items-center h-[72px]">
                <div class="flex items-center gap-2">
                  <input type="checkbox" v-model="filters.onlyWithTradeInfo" @change="loadData" id="onlyWithTradeInfo" class="w-5 h-5 rounded bg-gray-900/50 border-gray-700 text-blue-500 focus:ring-blue-500/50">
                  <label for="onlyWithTradeInfo" class="text-sm font-semibold cursor-pointer">Only with Trade Info</label>
                </div>
              </div>
              <div>
                <div class="flex gap-2">
                  <button @click="loadData" class="btn-primary flex-1 flex items-center justify-center">
                    <i class="bi bi-arrow-clockwise mr-2"></i>
                    Refresh
                  </button>
                  <button @click="resetFilters" class="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors">
                    <i class="bi bi-x-circle"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Statistics Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div class="glass-card p-4 h-full flex flex-col justify-center relative overflow-hidden group">
            <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <span class="text-4xl">📈</span>
            </div>
            <h6 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Positions</h6>
            <h3 class="text-2xl font-bold text-blue-400">{{ stats.totalPositions }}</h3>
          </div>
          
          <div class="glass-card p-4 h-full flex flex-col justify-center relative overflow-hidden group">
            <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <span class="text-4xl">💰</span>
            </div>
            <h6 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Profit</h6>
            <h3 class="text-2xl font-bold text-green-400">${{ formatNumber(stats.totalProfit) }}</h3>
          </div>

          <div class="glass-card p-4 h-full flex flex-col justify-center relative overflow-hidden group">
            <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <span class="text-4xl">📉</span>
            </div>
            <h6 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Loss</h6>
            <h3 class="text-2xl font-bold text-red-400">${{ formatNumber(stats.totalLoss) }}</h3>
          </div>

          <div class="glass-card p-4 h-full flex flex-col justify-center relative overflow-hidden group">
             <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <span class="text-4xl">🧮</span>
            </div>
            <h6 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Net Result</h6>
            <h3 class="text-2xl font-bold" :class="stats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'">
              ${{ formatNumber(stats.netProfit) }}
            </h3>
          </div>

          <div class="glass-card p-4 h-full flex flex-col justify-center relative overflow-hidden group">
            <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <span class="text-4xl">🎯</span>
            </div>
            <h6 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Win Rate</h6>
            <h3 class="text-2xl font-bold text-cyan-400">{{ stats.winRate }}%</h3>
          </div>

          <div class="glass-card p-4 h-full flex flex-col justify-center relative overflow-hidden group">
            <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <span class="text-4xl">📊</span>
            </div>
            <h6 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Sharpe Ratio</h6>
            <h3 class="text-2xl font-bold text-yellow-400">{{ formatNumber(detailedStats?.performanceMetrics?.sharpeRatio || 0) }}</h3>
          </div>
        </div>

        <!-- Risk and Performance Analysis -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div>
            <RiskStatsCard :stats="riskStats" />
          </div>
          <div>
            <PerformanceMetricsCard :stats="performanceStats" />
          </div>
          <div>
            <div class="glass-card h-full flex flex-col">
              <div class="p-4 border-b border-white/10 bg-yellow-400/10">
                <h5 class="flex items-center text-lg font-semibold text-yellow-400">
                  <i class="bi bi-gear mr-2"></i>
                  Trade Metrics
                </h5>
              </div>
              <div class="p-4 flex-grow">
                <div class="grid grid-cols-2 gap-4">
                  <div class="col-span-1">
                    <div class="text-center p-3 rounded-lg bg-white/5">
                      <div class="text-2xl font-bold text-blue-400">{{ formatNumber(stats.tradeMetrics?.avgLeverage || 0) }}x
                      </div>
                      <div class="text-xs text-gray-400 mt-1">Avg Leverage</div>
                    </div>
                  </div>
                  <!-- Removidos avgEntryPrice, avgStopPrice, avgTakeProfit1 -->
                </div>

                <!-- Best/Worst Trades -->
                <div class="mt-4 space-y-3">
                    <div class="flex justify-between items-center bg-white/5 p-2 rounded">
                      <span class="text-gray-400 text-sm">Best Trade</span>
                      <span class="px-2 py-1 text-xs font-bold text-green-900 bg-green-400 rounded">${{ formatNumber(stats.tradeMetrics?.bestProfit || 0) }}</span>
                    </div>
                    <div class="flex justify-between items-center bg-white/5 p-2 rounded">
                      <span class="text-gray-400 text-sm">Worst Trade</span>
                      <span class="px-2 py-1 text-xs font-bold text-red-900 bg-red-400 rounded">${{ formatNumber(stats.tradeMetrics?.worstProfit || 0) }}</span>
                    </div>
                    <div class="flex justify-between items-center bg-white/5 p-2 rounded">
                      <span class="text-gray-400 text-sm">Most Profitable Symbol</span>
                      <span class="px-2 py-1 text-xs font-bold text-blue-900 bg-blue-400 rounded">{{ stats.tradeMetrics?.mostProfitableSymbol || 'N/A' }}</span>
                    </div>
                    <div class="flex justify-between items-center bg-white/5 p-2 rounded">
                      <span class="text-gray-400 text-sm">Most Profitable Side</span>
                      <span class="px-2 py-1 text-xs font-bold text-gray-900 bg-gray-400 rounded">{{ stats.tradeMetrics?.mostProfitableSide || 'N/A' }}</span>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Detailed Statistics -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <div class="glass-card h-full flex flex-col">
              <div class="p-4 border-b border-white/10 bg-blue-500/10">
                <h5 class="text-lg font-semibold text-blue-400">Performance Statistics</h5>
              </div>
              <div class="p-4 flex-grow">
                <div class="grid grid-cols-2 gap-4">
                  <div class="text-center p-3 rounded-lg bg-white/5">
                    <div class="text-2xl font-bold text-green-400">{{ stats.winRate }}%</div>
                    <div class="text-xs text-gray-400 mt-1">Win Rate</div>
                  </div>
                  <div class="text-center p-3 rounded-lg bg-white/5">
                    <div class="text-2xl font-bold text-blue-400">{{ stats.totalPositions }}</div>
                    <div class="text-xs text-gray-400 mt-1">Total Trades</div>
                  </div>
                  <div class="text-center p-3 rounded-lg bg-white/5">
                    <div class="text-2xl font-bold text-green-400">${{ formatNumber(stats.avgProfit) }}</div>
                    <div class="text-xs text-gray-400 mt-1">Average Profit</div>
                  </div>
                  <div class="text-center p-3 rounded-lg bg-white/5">
                    <div class="text-2xl font-bold text-red-400">${{ formatNumber(stats.avgLoss) }}</div>
                    <div class="text-xs text-gray-400 mt-1">Average Loss</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div class="glass-card h-full flex flex-col">
              <div class="p-4 border-b border-white/10 bg-blue-500/10">
                <h5 class="text-lg font-semibold text-blue-400">Extremes</h5>
              </div>
              <div class="p-4 flex-grow">
                <div class="grid grid-cols-2 gap-4">
                  <div class="text-center p-3 rounded-lg bg-white/5">
                    <div class="text-2xl font-bold text-green-400">${{ formatNumber(stats.maxProfit) }}</div>
                    <div class="text-xs text-gray-400 mt-1">Highest Profit</div>
                  </div>
                  <div class="text-center p-3 rounded-lg bg-white/5">
                    <div class="text-2xl font-bold text-red-400">${{ formatNumber(stats.maxLoss) }}</div>
                    <div class="text-xs text-gray-400 mt-1">Highest Loss</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Analysis Tables -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div>
            <AnalysisTable title="Symbol Analysis" columnTitle="Symbol" :data="detailedStats?.symbolAnalysis || {}" />
          </div>
          <div>
            <AnalysisTable title="Side Analysis" columnTitle="Side" :data="detailedStats?.sideAnalysis || {}" />
          </div>
          <div>
            <SetupAnalysisCard :positions="positions" />
          </div>
        </div>

        <!-- Performance Charts -->
        <div class="mb-8">
          <div class="glass-card h-full flex flex-col">
            <div class="p-4 border-b border-white/10 bg-green-500/10">
              <h5 class="flex items-center text-lg font-semibold text-green-400">
                <i class="bi bi-graph-up mr-2"></i>
                Cumulative Profit Over Time
              </h5>
            </div>
            <div class="p-4 flex-grow">
              <PerformanceChart :positions="positions" />
            </div>
          </div>
        </div>

        <!-- Symbol Performance Charts -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <div class="glass-card h-full flex flex-col">
              <div class="p-4 border-b border-white/10 bg-green-500/10">
                <h5 class="flex items-center text-lg font-semibold text-green-400">
                  <i class="bi bi-pie-chart mr-2"></i>
                  Profit by Symbol
                </h5>
              </div>
              <div class="p-4 flex-grow">
                <ProfitBySymbolChart :data="stats.topProfitableSymbols || []" />
              </div>
            </div>
          </div>
          <div>
            <div class="glass-card h-full flex flex-col">
              <div class="p-4 border-b border-white/10 bg-red-500/10">
                <h5 class="flex items-center text-lg font-semibold text-red-400">
                  <i class="bi bi-pie-chart mr-2"></i>
                  Loss by Symbol
                </h5>
              </div>
              <div class="p-4 flex-grow">
                <LossBySymbolChart :data="stats.topLosingSymbols || []" />
              </div>
            </div>
          </div>
        </div>

        <!-- Monthly Performance Chart -->
        <div class="mb-8">
          <div class="glass-card">
            <div class="p-4 border-b border-white/10 bg-yellow-500/10">
              <h5 class="flex items-center text-lg font-semibold text-yellow-400">
                <i class="bi bi-bar-chart mr-2"></i>
                Monthly Performance
              </h5>
            </div>
            <div class="p-4">
              <MonthlyPerformanceChart :positions="positions" />
            </div>
          </div>
        </div>

        <!-- Monthly Performance Chart (By Opening Date) -->
        <div class="mb-8">
          <div class="glass-card">
            <div class="p-4 border-b border-white/10 bg-purple-500/10">
              <h5 class="flex items-center text-lg font-semibold text-purple-400">
                <i class="bi bi-calendar-event mr-2"></i>
                Performance by Opening Date
              </h5>
            </div>
            <div class="p-4">
              <OpeningDatePerformanceChart :positions="positions" />
            </div>
          </div>
        </div>

        <!-- Costs Panel -->
        <div class="mb-8">
          <div class="glass-card">
            <div class="p-4 border-b border-white/10 bg-yellow-500/10">
              <h5 class="flex items-center text-lg font-semibold text-yellow-400">
                <i class="bi bi-calculator mr-2"></i>
                Trading Costs Analysis
              </h5>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Commission Summary -->
                <div class="text-center p-4 lg:border-r border-white/10">
                  <div class="text-3xl font-bold text-yellow-400 mb-2">${{ formatNumber(totalCommission) }}</div>
                  <div class="text-gray-400 mb-2">Total Commission</div>
                  <div class="text-sm text-gray-500">
                    Avg: ${{ formatNumber(averageCommission) }} per trade
                  </div>
                </div>

                <!-- Funding Summary -->
                <div class="text-center p-4 lg:border-r border-white/10">
                  <div class="text-3xl font-bold text-blue-400 mb-2">${{ formatNumber(totalFunding) }}</div>
                  <div class="text-gray-400 mb-2">Total Funding</div>
                  <div class="text-sm text-gray-500">
                    Avg: ${{ formatNumber(averageFunding) }} per trade
                  </div>
                </div>

                <!-- Total Costs -->
                <div class="text-center p-4">
                  <div class="text-3xl font-bold text-red-400 mb-2">${{ formatNumber(totalCosts) }}</div>
                  <div class="text-gray-400 mb-2">Total Trading Costs</div>
                  <div class="text-sm text-gray-500">
                    {{ ((totalCosts / stats.netProfit) * 100).toFixed(1) }}% of net profit
                  </div>
                </div>
              </div>

              <!-- Detailed Breakdown -->
              <div class="mt-8">
                <h6 class="text-gray-400 mb-4 font-semibold">Cost Breakdown by Symbol</h6>
                <div class="overflow-x-auto overflow-y-auto max-h-96">
                  <table class="w-full text-sm text-left">
                    <thead class="text-xs uppercase bg-white/5 text-gray-400">
                      <tr>
                        <th class="px-4 py-3 rounded-l-lg">Symbol</th>
                        <th class="px-4 py-3 text-right">Commission</th>
                        <th class="px-4 py-3 text-right">Funding</th>
                        <th class="px-4 py-3 text-right">Total Costs</th>
                        <th class="px-4 py-3 rounded-r-lg text-right">% of Net Profit</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                      <tr v-for="(costs, symbol) in costsBySymbol" :key="symbol" class="hover:bg-white/5 transition-colors">
                        <td class="px-4 py-3 font-medium">
                          <span class="px-2 py-1 bg-gray-700 rounded text-xs">{{ symbol }}</span>
                        </td>
                        <td class="px-4 py-3 text-right text-yellow-400">${{ formatNumber(costs.commission) }}</td>
                        <td class="px-4 py-3 text-right text-blue-400">${{ formatNumber(costs.funding) }}</td>
                        <td class="px-4 py-3 text-right text-red-400 font-bold">${{ formatNumber(costs.total) }}</td>
                        <td class="px-4 py-3 text-right text-gray-500 text-xs">
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

        <!-- Positions Table -->
        <div class="glass-card overflow-hidden">
          <div class="p-4 border-b border-white/10 bg-blue-600/20 flex justify-between items-center">
            <h5 class="text-lg font-semibold text-white">Position History</h5>
            <div class="flex items-center gap-2">
              <span class="text-gray-400 text-sm">Showing {{ positions.length }} positions</span>
              <button @click="exportToCSV" class="btn-primary flex items-center gap-1 text-sm bg-green-600 hover:bg-green-700 border-none ml-2">
                <i class="bi bi-file-earmark-spreadsheet"></i> Export
              </button>
              <router-link to="/position-history/new" class="btn-primary flex items-center gap-1 text-sm">
                <i class="bi bi-plus-lg"></i> Add
              </router-link>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead class="text-xs uppercase bg-gray-800 text-gray-400">
                <tr>
                  <th class="px-4 py-3">Symbol</th>
                  <th class="px-4 py-3">Type</th>
                  <th class="px-4 py-3">Quantity</th>
                  <th class="px-4 py-3">Avg Price</th>
                  <th class="px-4 py-3">Close Price</th>
                  <th class="px-4 py-3">Leverage</th>
                  <th class="px-4 py-3">R:R</th>
                  <th class="px-4 py-3">Result</th>
                  <th class="px-4 py-3">Costs</th>
                  <th class="px-4 py-3">Volume/Sentiment</th>
                  <th class="px-4 py-3">Trade Info</th>
                  <th class="px-4 py-3">Open Date</th>
                  <th class="px-4 py-3">Close Date</th>
                  <th class="px-4 py-3">Edit</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                <tr v-for="position in positions" :key="position.positionId" class="hover:bg-white/5 transition-colors">
                  <td class="px-4 py-3">
                    <div>
                      <span class="px-2 py-1 bg-blue-600 rounded text-xs font-bold">{{ position.symbol }}</span>
                      <div class="text-xs text-gray-500 mt-1">ID: {{ position.positionId }}</div>
                      <div class="mt-1">
                        <div v-if="position.tradeInfo?.found && position.tradeInfo.trade?.setup_description">
                          <span class="px-2 py-0.5 bg-blue-400/20 text-blue-300 rounded text-xs">{{ position.tradeInfo.trade.setup_description }}</span>
                        </div>
                        <div v-else class="text-gray-500 text-xs">-</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded text-xs font-bold" :class="position.positionSide === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'">
                      {{ position.positionSide }}
                    </span>
                  </td>
                  <td class="px-4 py-3 font-mono">{{ position.closePositionAmt }}</td>
                  <td class="px-4 py-3 font-mono">${{ formatNumber(parseFloat(position.avgPrice), 5) }}</td>
                  <td class="px-4 py-3 font-mono">${{ formatNumber(position.avgClosePrice, 5) }}</td>
                  <td class="px-4 py-3">{{ position.leverage }}x</td>
                  <td class="px-4 py-3">
                    <span class="font-semibold">{{ calculateFinancialRR(position) }}</span>
                    <div class="text-xs text-gray-500 mt-1">
                      Risk: ${{ formatNumber(calculateRiskAmount(position)) }}
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <span class="font-bold"
                      :class="parseFloat(position.netProfit) >= 0 ? 'text-green-400' : 'text-red-400'">
                      ${{ formatNumber(parseFloat(position.netProfit)) }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="text-xs">
                      <div class="text-yellow-400">${{ formatNumber(parseFloat(position.positionCommission)) }}</div>
                      <div class="text-blue-400">${{ formatNumber(parseFloat(position.totalFunding)) }}</div>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div v-if="position.tradeInfo?.found" class="text-xs">
                      <div class="text-gray-400">Vol: {{ position.tradeInfo.trade?.volume }}</div>
                      <div class="text-gray-400">Sent: {{ position.tradeInfo.trade?.sentiment }}</div>
                    </div>
                    <div v-else class="text-gray-500 text-xs">No info</div>
                  </td>
                  <td class="px-4 py-3">
                    <div v-if="position.tradeInfo?.found" class="text-xs">
                      <div class="text-green-400">#{{ position.tradeInfo.trade?.id }}</div>
                      <div class="text-gray-400">Entry: ${{ formatNumber(parseFloat(position.avgPrice) || 0, 5) }}</div>
                      <div class="text-gray-400">Stop: ${{ formatNumber(position.tradeInfo.trade?.stop || 0, 5) }}</div>
                    </div>
                    <div v-else class="text-gray-500 text-xs">No info</div>
                  </td>
                  <td class="px-4 py-3 text-xs text-gray-400">{{ formatDate(position.openTime) }}</td>
                  <td class="px-4 py-3 text-xs text-gray-400">{{ formatDate(getEffectiveCloseTime(position)) }}</td>
                  <td class="px-4 py-3">
                    <router-link :to="`/position-history/edit/${position.positionId}`"
                      class="px-2 py-1 border border-blue-500 text-blue-400 rounded hover:bg-blue-500/10 transition-colors text-sm" title="Edit Position">
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
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { PositionHistory, PositionStats, DetailedRiskStats } from '../types/positionHistory'
import PerformanceChart from '../components/PerformanceChart.vue'
import ProfitBySymbolChart from '../components/ProfitBySymbolChart.vue'
import LossBySymbolChart from '../components/LossBySymbolChart.vue'
import MonthlyPerformanceChart from '../components/MonthlyPerformanceChart.vue'
import OpeningDatePerformanceChart from '../components/OpeningDatePerformanceChart.vue'
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
  startDate: null,
  endDate: null,
  minResult: 0,
  onlyWithTradeInfo: true
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

const DASHBOARD_FILTERS_KEY = 'dashboard_filters'

const loadData = async () => {
  // Save filters to localStorage whenever data is loaded (which happens on filter change)
  localStorage.setItem(DASHBOARD_FILTERS_KEY, JSON.stringify(filters.value))
  
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
    params.append('onlyWithTradeInfo', filters.value.onlyWithTradeInfo.toString())

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

    params.append('onlyWithTradeInfo', filters.value.onlyWithTradeInfo.toString())

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

    params.append('onlyWithTradeInfo', filters.value.onlyWithTradeInfo.toString())

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
    minResult: 0,
    onlyWithTradeInfo: true
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

const exportToCSV = () => {
  if (positions.value.length === 0) {
    alert('No data to export')
    return
  }

  // Define headers for the CSV - ensuring no grouped information
  const headers = [
    'Position ID',
    'Symbol',
    'Side',
    'Setup Description',
    'Open Quantity',
    'Closed Quantity',
    'Avg Entry Price',
    'Avg Close Price',
    'Leverage',
    'Net Profit',
    'Realised Profit',
    'Commission',
    'Funding',
    'Cost Percentage',
    'Open Date',
    'Close Date',
    'Update Time',
    'Trade Found',
    'Trade ID',
    'Trade Entry',
    'Trade Stop',
    'Trade TP1',
    'Trade Volume',
    'Trade Sentiment',
    'Risk Amount',
    'Financial RR'
  ]

  // Map data to rows
  const rows = positions.value.map((pos: PositionHistory) => {
    const trade = pos.tradeInfo?.trade
    const openDate = pos.openTime ? new Date(pos.openTime).toISOString() : ''
    const closeDate = pos.closeTime ? new Date(pos.closeTime).toISOString() : ''
    const updateTime = pos.updateTime ? new Date(pos.updateTime).toISOString() : ''
    
    // Calculate cost percentage as seen in UI logic (roughly) if needed, 
    // or just raw values. Let's strictly follow "separate info".
    // I'll calculate percentage for convenience as a separate column.
    const commission = parseFloat(pos.positionCommission || '0')
    const funding = parseFloat(pos.totalFunding || '0')
    const netProfit = parseFloat(pos.netProfit || '0')
    const totalCost = commission + funding
    let costPercentage = '0.0'
    if (netProfit !== 0) {
      costPercentage = ((Math.abs(totalCost) / Math.abs(netProfit)) * 100).toFixed(2)
    }

    const safeString = (val: any) => {
      if (val === null || val === undefined) return ''
      return String(val).replace(/"/g, '""')
    }

    return [
      pos.positionId,
      pos.symbol,
      pos.positionSide,
      trade?.setup_description || '',
      pos.positionAmt,
      pos.closePositionAmt,
      pos.avgPrice,
      pos.avgClosePrice,
      pos.leverage,
      pos.netProfit,
      pos.realisedProfit,
      pos.positionCommission,
      pos.totalFunding,
      costPercentage,
      openDate,
      closeDate,
      updateTime,
      pos.tradeInfo?.found ? 'Yes' : 'No',
      trade?.id || '',
      trade?.entry || '',
      trade?.stop || '',
      trade?.tp1 || '',
      trade?.volume || '',
      trade?.sentiment || '',
      calculateRiskAmount(pos).toFixed(2),
      calculateFinancialRR(pos)
    ].map(field => `"${safeString(field)}"`).join(',')
  })

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows].join('\n')
  
  // Create blob and download link
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `position_history_export_${new Date().toISOString().slice(0, 10)}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Lifecycle
onMounted(() => {
  // Try to load filters from localStorage
  const savedFilters = localStorage.getItem(DASHBOARD_FILTERS_KEY)
  if (savedFilters) {
    try {
      const parsed = JSON.parse(savedFilters)
      // Merge saved filters with default structure to ensure backward compatibility
      filters.value = { ...filters.value, ...parsed }
    } catch (e) {
      console.error('Error parsing saved filters:', e)
    }
  }
  
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
