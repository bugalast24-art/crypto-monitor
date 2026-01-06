import React, { useState, useEffect, useRef } from 'react';
import { Bell, TrendingUp, TrendingDown, Volume2, VolumeX, Plus, Trash2, Sun, Moon, Star, Calculator } from 'lucide-react';

export default function App() {
  const [coins, setCoins] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [favorites, setFavorites] = useState(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
  const [portfolio, setPortfolio] = useState([]);
  const [priceHistory, setPriceHistory] = useState({});
  
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState('');
  const [alertValue, setAlertValue] = useState('');
  const [portfolioAmount, setPortfolioAmount] = useState('');
  const [portfolioPrice, setPortfolioPrice] = useState('');
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [sortBy, setSortBy] = useState('volume');
  const [viewMode, setViewMode] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const wsRef = useRef(null);
  const audioRef = useRef(null);

  const theme = {
    bg: darkMode ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50',
    card: darkMode ? 'bg-slate-800/50 border-purple-500/20' : 'bg-white/80 border-purple-200',
    input: darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-300',
    text: darkMode ? 'text-white' : 'text-gray-900',
    textSecondary: darkMode ? 'text-gray-400' : 'text-gray-600',
    button: darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300',
  };

  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGmm98OScTgwNU6zn77RgGwU7k9n0yoErBSF1xe/glEILElyx6OyrWBUIQ5zd8sFuJAUuhM/z24o2Bxpqve3inE0MFG638e2xXxsGOpPY9MyCKwUZccfv3o9DDBFdr+fxtmUfCECa3PLEbiQHLYHO89yKNQcbarn041pODBFgsujwtmMbBT2U2fTMgysFHnTH8d2QQQsTXa/n8bVfGwdAm93zxm4kBy+Bz/PbiTUHH2y88NyeTQwPU63l77RhGwY+lNn0y4MrBR51x/HdkEELE12v5/G1XxsHQJve88VuJAcugc/z3Ik1Bx9svPDcnk0MD1Ot5e+0YRsGPpTZ9MuDKwUedcfx3ZBBCxNdr+fxtV8bB0Cb3vPFbiQHL4HP89yJNQcfbLzw3J5NDA9TreXvtGEbBj6U2fTLgysE');
  }, []);

  useEffect(() => {
    const connectWebSocket = () => {
      wsRef.current = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        const processedCoins = data
          .filter(coin => {
            if (searchTerm && !coin.s.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return coin.s.endsWith('USDT');
          })
          .map(coin => {
            const symbol = coin.s;
            const price = parseFloat(coin.c);
            const high = parseFloat(coin.h);
            const low = parseFloat(coin.l);
            const open = parseFloat(coin.o);
            
            setPriceHistory(prev => {
              const history = prev[symbol] || [];
              const newHistory = [...history, price].slice(-20);
              return { ...prev, [symbol]: newHistory };
            });
            
            return {
              symbol,
              price,
              priceChange: parseFloat(coin.p),
              priceChangePercent: parseFloat(coin.P),
              volume: parseFloat(coin.v),
              quoteVolume: parseFloat(coin.q),
              high,
              low,
              trades: coin.n,
              amplitude: open > 0 ? ((high - low) / open * 100).toFixed(2) : '0.00',
            };
          });
        
        setCoins(processedCoins);
        checkAlerts(processedCoins);
      };
      
      wsRef.current.onerror = (error) => console.error('WebSocket错误:', error);
      wsRef.current.onclose = () => setTimeout(connectWebSocket, 5000);
    };
    
    connectWebSocket();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [searchTerm]);

  const checkAlerts = (currentCoins) => {
    alerts.forEach(alert => {
      const coin = currentCoins.find(c => c.symbol === alert.symbol);
      if (!coin || alert.triggered) return;
      
      if (coin.price >= alert.value) {
        playAlert();
        showNotification(alert.symbol, `价格: $${coin.price}`);
        setAlerts(prev => prev.map(a => a.id === alert.id ? {...a, triggered: true} : a));
      }
    });
  };

  const playAlert = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('音频播放失败'));
    }
  };

  const showNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const toggleFavorite = (symbol) => {
    setFavorites(prev => 
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  const addAlert = () => {
    if (!selectedCoin || !alertValue) return;
    setAlerts([...alerts, {
      id: Date.now(),
      symbol: selectedCoin,
      value: parseFloat(alertValue),
      triggered: false
    }]);
    setShowAlertModal(false);
    setSelectedCoin('');
    setAlertValue('');
  };

  const addToPortfolio = () => {
    if (!selectedCoin || !portfolioAmount || !portfolioPrice) return;
    setPortfolio([...portfolio, {
      id: Date.now(),
      symbol: selectedCoin,
      amount: parseFloat(portfolioAmount),
      avgPrice: parseFloat(portfolioPrice)
    }]);
    setShowPortfolioModal(false);
    setSelectedCoin('');
    setPortfolioAmount('');
    setPortfolioPrice('');
  };

  const calculatePnL = (position) => {
    const coin = coins.find(c => c.symbol === position.symbol);
    if (!coin) return { pnl: 0, pnlPercent: 0 };
    
    const currentValue = coin.price * position.amount;
    const costValue = position.avgPrice * position.amount;
    const pnl = currentValue - costValue;
    const pnlPercent = (pnl / costValue) * 100;
    
    return { pnl, pnlPercent, currentValue };
  };

  const getFilteredCoins = () => {
    let filtered = [...coins];
    
    if (viewMode === 'favorites') {
      filtered = filtered.filter(c => favorites.includes(c.symbol));
    } else if (viewMode === 'gainers') {
      filtered = filtered.filter(c => c.priceChangePercent > 0).sort((a, b) => b.priceChangePercent - a.priceChangePercent).slice(0, 50);
    } else if (viewMode === 'losers') {
      filtered = filtered.filter(c => c.priceChangePercent < 0).sort((a, b) => a.priceChangePercent - b.priceChangePercent).slice(0, 50);
    }
    
    return filtered.sort((a, b) => {
      switch(sortBy) {
        case 'volume': return b.quoteVolume - a.quoteVolume;
        case 'change': return Math.abs(b.priceChangePercent) - Math.abs(a.priceChangePercent);
        case 'price': return b.price - a.price;
        case 'amplitude': return parseFloat(b.amplitude) - parseFloat(a.amplitude);
        default: return 0;
      }
    });
  };

  const MiniChart = ({ data }) => {
    if (!data || data.length < 2) return <div className="w-16 h-6"></div>;
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const points = data.map((price, i) => {
      const x = (i / (data.length - 1)) * 60;
      const y = 24 - ((price - min) / range) * 24;
      return `${x},${y}`;
    }).join(' ');
    
    const isUp = data[data.length - 1] > data[0];
    
    return (
      <svg width="60" height="24" className="inline-block">
        <polyline points={points} fill="none" stroke={isUp ? '#10b981' : '#ef4444'} strokeWidth="1.5" />
      </svg>
    );
  };

  const sortedCoins = getFilteredCoins();

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} p-4 transition-colors`}>
      <div className="max-w-7xl mx-auto">
        
        {/* 顶部控制栏 */}
        <div className={`${theme.card} backdrop-blur-lg rounded-xl p-4 mb-6 border`}>
          <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              加密货币行情监控
            </h1>
            
            <div className="flex gap-2">
              <button onClick={() => setDarkMode(!darkMode)} className={`p-2 ${theme.button} rounded-lg`}>
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-2 ${theme.button} rounded-lg`}>
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
              <button onClick={() => setShowPortfolioModal(true)} className={`p-2 ${theme.button} rounded-lg`}>
                <Calculator size={20} />
              </button>
              <button onClick={() => setShowAlertModal(true)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2">
                <Plus size={20} /> 提醒
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="搜索币种..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`px-3 py-2 ${theme.input} rounded-lg border outline-none`}
            />
            
            <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} className={`px-3 py-2 ${theme.input} rounded-lg border`}>
              <option value="all">全部</option>
              <option value="favorites">⭐ 自选</option>
              <option value="gainers">📈 涨幅榜</option>
              <option value="losers">📉 跌幅榜</option>
            </select>
            
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`px-3 py-2 ${theme.input} rounded-lg border`}>
              <option value="volume">交易量</option>
              <option value="change">涨跌幅</option>
              <option value="price">价格</option>
              <option value="amplitude">振幅</option>
            </select>
          </div>
          
          <div className="flex gap-6 mt-4 text-sm">
            <div>币种: <span className="text-purple-400 font-bold">{coins.length}</span></div>
            <div>自选: <span className="text-yellow-400 font-bold">{favorites.length}</span></div>
            <div>提醒: <span className="text-green-400 font-bold">{alerts.length}</span></div>
          </div>
        </div>

        {/* 提醒列表 */}
        {alerts.length > 0 && (
          <div className={`${theme.card} backdrop-blur-lg rounded-xl p-4 mb-6 border`}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Bell size={20} className="text-yellow-400" /> 价格提醒
            </h2>
            <div className="grid gap-2">
              {alerts.map(alert => (
                <div key={alert.id} className={`flex justify-between p-3 rounded-lg ${alert.triggered ? 'bg-green-900/30' : darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                  <span>{alert.symbol} ≥ ${alert.value}</span>
                  <button onClick={() => setAlerts(alerts.filter(a => a.id !== alert.id))} className="hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 持仓盈亏 */}
        {portfolio.length > 0 && (
          <div className={`${theme.card} backdrop-blur-lg rounded-xl p-4 mb-6 border`}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Calculator size={20} className="text-blue-400" /> 持仓盈亏
            </h2>
            <div className="grid gap-2">
              {portfolio.map(position => {
                const { pnl, pnlPercent, currentValue } = calculatePnL(position);
                return (
                  <div key={position.id} className={`flex justify-between p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                    <div>
                      <div className="font-medium">{position.symbol}</div>
                      <div className={`text-sm ${theme.textSecondary}`}>
                        {position.amount} × ${position.avgPrice}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pnlPercent.toFixed(2)}%)
                      </div>
                      <div className={`text-sm ${theme.textSecondary}`}>${currentValue.toFixed(2)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 币种列表 */}
        <div className={`${theme.card} backdrop-blur-lg rounded-xl border overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={darkMode ? 'bg-slate-700/50' : 'bg-gray-100'}>
                <tr>
                  <th className="px-4 py-3 text-left">⭐</th>
                  <th className="px-4 py-3 text-left">币种</th>
                  <th className="px-4 py-3 text-right">价格</th>
                  <th className="px-4 py-3 text-right">24h涨跌</th>
                  <th className="px-4 py-3 text-right">交易量</th>
                  <th className="px-4 py-3 text-right">振幅</th>
                  <th className="px-4 py-3 text-right">走势</th>
                </tr>
              </thead>
              <tbody>
                {sortedCoins.slice(0, 100).map((coin) => (
                  <tr key={coin.symbol} className={`border-t ${darkMode ? 'border-slate-700/50' : 'border-gray-200'} hover:bg-opacity-50`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleFavorite(coin.symbol)}>
                        {favorites.includes(coin.symbol) ? 
                          <Star size={18} className="text-yellow-400 fill-yellow-400" /> : 
                          <Star size={18} className={theme.textSecondary} />
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium">{coin.symbol}</td>
                    <td className="px-4 py-3 text-right font-mono">${coin.price.toFixed(coin.price < 1 ? 6 : 2)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${coin.priceChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      <div className="flex items-center justify-end gap-1">
                        {coin.priceChangePercent >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {coin.priceChangePercent.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      ${(coin.quoteVolume / 1000000).toFixed(2)}M
                    </td>
                    <td className="px-4 py-3 text-right text-sm">{coin.amplitude}%</td>
                    <td className="px-4 py-3 text-right">
                      <MiniChart data={priceHistory[coin.symbol]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 添加提醒弹窗 */}
        {showAlertModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className={`${theme.card} rounded-xl p-6 max-w-md w-full border`}>
              <h2 className="text-xl font-bold mb-4">添加价格提醒</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="币种 (如: BTCUSDT)"
                  value={selectedCoin}
                  onChange={(e) => setSelectedCoin(e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 ${theme.input} rounded-lg border outline-none`}
                />
                <input
                  type="number"
                  placeholder="目标价格"
                  value={alertValue}
                  onChange={(e) => setAlertValue(e.target.value)}
                  className={`w-full px-3 py-2 ${theme.input} rounded-lg border outline-none`}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAlertModal(false)} className={`flex-1 px-4 py-2 ${theme.button} rounded-lg`}>
                  取消
                </button>
                <button onClick={addAlert} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">
                  确认
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 添加持仓弹窗 */}
        {showPortfolioModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className={`${theme.card} rounded-xl p-6 max-w-md w-full border`}>
              <h2 className="text-xl font-bold mb-4">添加持仓</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="币种 (如: BTCUSDT)"
                  value={selectedCoin}
                  onChange={(e) => setSelectedCoin(e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 ${theme.input} rounded-lg border outline-none`}
                />
                <input
                  type="number"
                  placeholder="持仓数量"
                  value={portfolioAmount}
                  onChange={(e) => setPortfolioAmount(e.target.value)}
                  className={`w-full px-3 py-2 ${theme.input} rounded-lg border outline-none`}
                />
                <input
                  type="number"
                  placeholder="平均成本"
                  value={portfolioPrice}
                  onChange={(e) => setPortfolioPrice(e.target.value)}
                  className={`w-full px-3 py-2 ${theme.input} rounded-lg border outline-none`}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowPortfolioModal(false)} className={`flex-1 px-4 py-2 ${theme.button} rounded-lg`}>
                  取消
                </button>
                <button onClick={addToPortfolio} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">
                  确认
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
